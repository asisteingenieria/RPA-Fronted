/**
 * Backend SIMULADO del contenido (versiones, borrador, evaluaciones) mientras no exista la API de
 * contenido en el robot. Persiste en el navegador; toda escritura deja una entrada de auditoría.
 * Reemplazar por llamadas HTTP con la misma firma cuando la API exista (ver README).
 */
import { diffSnapshots, hasLegalChange } from '@/lib/content-diff';
import { chainHash } from '@/lib/hash';
import { evalPassed, runEvaluation } from '@/engine/evals';
import { buildSeed } from './seed';
import type { ContentSnapshot, Db, EvalCase, SectionKey, Settings, User } from './types';

const KEY = 'panel-sofia:db:v1';
const listeners = new Set<() => void>();

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    // almacenamiento no disponible o corrupto: se usa la semilla
  }
  return buildSeed();
}

let db: Db = load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // sin persistencia: el panel sigue funcionando en memoria
  }
}

/** Escritura inmutable: se aplica sobre una copia (si falla, no cambia nada). */
function commit(fn: (d: Db) => void) {
  const next = structuredClone(db);
  fn(next);
  db = next;
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const wait = (ms = 220) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();

export interface Actor {
  name: string;
  role: string;
}

function audit(d: Db, actor: Actor, action: string, target: string, detail = '') {
  const prev = d.audit.at(-1)?.hash ?? '0'.repeat(16);
  const entry = { at: nowIso(), user: actor.name, role: actor.role, action, target, detail };
  d.audit.push({ ...entry, id: `a${d.audit.length}-${Date.now()}`, prevHash: prev, hash: chainHash(prev, entry) });
}

export function published(d: Db) {
  return d.versions.find((v) => v.status === 'publicada')!;
}

export function inFlight(d: Db) {
  return d.versions.find((v) => ['evaluacion', 'lista', 'aprobada'].includes(v.status));
}

// Si se recargó la página en plena evaluación, se termina al cargar.
for (const v of db.versions.filter((x) => x.status === 'evaluacion')) finishEvaluation(v.number);

function finishEvaluation(n: number) {
  commit((d) => {
    const v = d.versions.find((x) => x.number === n);
    if (!v || v.status !== 'evaluacion') return;
    const run = runEvaluation(v.snapshot, d.evalCases, n, `${d.settings.llmProvider} · ${d.settings.llmModel}`);
    d.evalRuns.push(run);
    v.evalRunId = run.id;
    v.evalProgress = 1;
    v.status = evalPassed(run) ? 'lista' : 'fallida';
    audit(d, { name: 'Sistema', role: 'Sistema' }, v.status === 'lista' ? 'Evaluación aprobada' : 'Evaluación fallida', `Contenido v${n}`, `${Math.round(run.passRate * 100)} % · ${run.invented} datos inventados`);
  });
}

export const backend = {
  snapshot(): Db {
    return db;
  },

  async saveDraft<K extends SectionKey>(actor: Actor, section: K, value: ContentSnapshot[K], editKeys: string[], label: string) {
    await wait();
    commit((d) => {
      d.draft.snapshot = { ...d.draft.snapshot, [section]: structuredClone(value) };
      for (const k of editKeys) d.draft.edits[k] = { by: actor.name, at: nowIso() };
      audit(d, actor, 'Guardó borrador', label);
    });
  },

  async submitForEvaluation(actor: Actor, note: string) {
    await wait();
    let number = 0;
    commit((d) => {
      const cur = inFlight(d);
      if (cur) {
        cur.status = 'retirada';
        audit(d, actor, 'Retiró versión en curso', `Contenido v${cur.number}`, 'Reemplazada por un nuevo envío');
      }
      number = Math.max(...d.versions.map((v) => v.number)) + 1;
      d.versions.push({ number, status: 'evaluacion', author: actor.name, createdAt: nowIso(), note, snapshot: structuredClone(d.draft.snapshot), evalProgress: 0 });
      audit(d, actor, 'Envió a evaluación', `Contenido v${number}`, note);
    });
    // Progreso de la suite (en producción lo reporta la tarea en segundo plano).
    const total = db.evalCases.length + 1;
    for (let i = 1; i <= total; i++) {
      await wait(450);
      commit((d) => {
        const v = d.versions.find((x) => x.number === number);
        if (v && v.status === 'evaluacion') v.evalProgress = i / (total + 1);
      });
    }
    finishEvaluation(number);
    return number;
  },

  async approve(actor: Actor, n: number, asLegal: boolean) {
    await wait();
    commit((d) => {
      const v = d.versions.find((x) => x.number === n)!;
      if (v.author === actor.name) throw new Error('El autor no puede aprobar su propio cambio');
      const legal = hasLegalChange(diffSnapshots(published(d).snapshot, v.snapshot));
      if (asLegal) v.legalApprovedBy = actor.name;
      else v.approvedBy = actor.name;
      if (v.approvedBy && (!legal || v.legalApprovedBy)) v.status = 'aprobada';
      audit(d, actor, asLegal ? 'Aprobó texto legal' : 'Aprobó versión', `Contenido v${n}`);
    });
  },

  async reject(actor: Actor, n: number, comment: string) {
    await wait();
    commit((d) => {
      const v = d.versions.find((x) => x.number === n)!;
      v.status = 'borrador';
      v.rejectedComment = comment;
      audit(d, actor, 'Rechazó versión', `Contenido v${n}`, comment);
    });
  },

  async publish(actor: Actor, n: number, note: string) {
    await wait(400);
    commit((d) => {
      const prev = published(d);
      prev.status = 'retirada';
      const v = d.versions.find((x) => x.number === n)!;
      v.status = 'publicada';
      v.publishedAt = nowIso();
      v.publishedBy = actor.name;
      if (note) v.note = note;
      audit(d, actor, 'Publicó versión', `Contenido v${n}`, note);
    });
  },

  async revert(actor: Actor, n: number, note: string) {
    await wait(400);
    commit((d) => {
      const prev = published(d);
      prev.status = 'retirada';
      const v = d.versions.find((x) => x.number === n)!;
      v.status = 'publicada';
      v.publishedAt = nowIso();
      v.publishedBy = actor.name;
      d.draft.snapshot = structuredClone(v.snapshot);
      audit(d, actor, 'Revirtió a versión', `Contenido v${n}`, note);
    });
  },

  async discardDraft(actor: Actor) {
    await wait();
    commit((d) => {
      d.draft.snapshot = structuredClone(published(d).snapshot);
      audit(d, actor, 'Descartó el borrador', 'Borrador');
    });
  },

  async runAdhocEvaluation(actor: Actor, provider: string) {
    await wait(1500);
    commit((d) => {
      const run = runEvaluation(d.draft.snapshot, d.evalCases, 0, provider);
      d.evalRuns.push(run);
      audit(d, actor, 'Corrió evaluación', 'Borrador', `${provider} · ${Math.round(run.passRate * 100)} %`);
    });
  },

  async addEvalCase(actor: Actor, k: EvalCase) {
    await wait();
    commit((d) => {
      d.evalCases.push(k);
      audit(d, actor, 'Agregó caso de prueba', k.name);
    });
  },

  async setRobotStopped(actor: Actor, stopped: boolean) {
    await wait();
    commit((d) => {
      d.robot = { ...d.robot, stopped, stoppedBy: stopped ? actor.name : undefined, stoppedAt: stopped ? nowIso() : undefined };
      audit(d, actor, stopped ? 'Activó apagado de emergencia' : 'Reanudó el robot', 'Robot');
    });
  },

  async resolveReview(actor: Actor, id: string, comment: string) {
    await wait();
    commit((d) => {
      const r = d.review.find((x) => x.id === id);
      d.review = d.review.filter((x) => x.id !== id);
      audit(d, actor, 'Marcó como resuelta', r?.chatId ?? id, comment);
    });
  },

  async revealConversation(actor: Actor, id: string, reason: string) {
    await wait();
    commit((d) => {
      const c = d.conversations.find((x) => x.id === id);
      audit(d, actor, 'Vio contenido', c?.chatId ?? id, `Motivo: ${reason}`);
    });
  },

  async saveSettings(actor: Actor, s: Settings) {
    await wait();
    commit((d) => {
      d.settings = s;
      audit(d, actor, 'Cambió configuración', 'Configuración');
    });
  },

  async upsertUser(actor: Actor, u: User) {
    await wait();
    commit((d) => {
      const i = d.users.findIndex((x) => x.id === u.id);
      if (i >= 0) d.users[i] = u;
      else d.users.push(u);
      audit(d, actor, i >= 0 ? 'Cambió rol de usuario' : 'Invitó usuario', u.email, u.roles.join(', '));
    });
  },

  async logExport(actor: Actor, what: string) {
    commit((d) => audit(d, actor, 'Exportó', what));
  },

  resetDemo() {
    db = buildSeed();
    persist();
    listeners.forEach((l) => l());
  },
};
