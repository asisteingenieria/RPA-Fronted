/**
 * Backend SIMULADO del contenido (versiones, borrador, evaluaciones) mientras no exista la API de
 * contenido en el robot. Persiste en el navegador; toda escritura deja una entrada de auditoría.
 * Reemplazar por llamadas HTTP con la misma firma cuando la API exista (ver README).
 */
import { diffSnapshots, hasLegalChange } from '@/lib/content-diff';
import { chainHash } from '@/lib/hash';
import { evalPassed, runEvaluation } from '@/engine/evals';
import { generateTempPassword, hashPassword, passwordIssues, verifyPassword } from '@/lib/password';
import { buildSeed } from './seed';
import type { ContentSnapshot, Db, EvalCase, SectionKey, Settings, User } from './types';

const KEY = 'panel-sofia:db:v1';
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
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
// Datos guardados antes de existir las contraseñas.
if (!db.credentials) db.credentials = {};

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

  /* ───────────── Autenticación ───────────── */

  /** Primer arranque: ningún usuario tiene contraseña; se crea la del administrador. */
  needsSetup(): boolean {
    return Object.keys(db.credentials).length === 0;
  },

  async setupAdmin(userId: string, password: string) {
    if (!backend.needsSetup()) throw new Error('La configuración inicial ya se hizo');
    const u = db.users.find((x) => x.id === userId && x.roles.includes('administrador'));
    if (!u) throw new Error('El usuario no es administrador');
    const issues = passwordIssues(password);
    if (issues.length) throw new Error(issues.join(' · '));
    const h = await hashPassword(password);
    commit((d) => {
      d.credentials[userId] = { ...h, mustChange: false, failed: 0, updatedAt: nowIso() };
      audit(d, { name: u.name, role: 'Administrador' }, 'Configuración inicial', 'Contraseña del administrador');
    });
  },

  /** Ingreso con correo y contraseña. Mensaje genérico ante fallos (no revela si el correo existe). */
  async login(email: string, password: string): Promise<{ user: User; mustChange: boolean }> {
    await wait(300);
    const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    const cred = u ? db.credentials[u.id] : undefined;
    const generic = 'Correo o contraseña incorrectos';
    if (!u || !cred) {
      await hashPassword(password); // mismo tiempo de respuesta exista o no el usuario
      throw new Error(generic);
    }
    if (cred.lockedUntil && new Date(cred.lockedUntil) > new Date())
      throw new Error(`Usuario bloqueado por intentos fallidos. Intenta de nuevo después de las ${new Date(cred.lockedUntil).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })} o pide a un administrador que lo desbloquee.`);
    const ok = await verifyPassword(password, cred);
    const actor = { name: u.name, role: u.roles.join(', ') };
    if (!ok) {
      commit((d) => {
        const c = d.credentials[u.id]!;
        c.failed += 1;
        audit(d, actor, 'Intento fallido de ingreso', u.email);
        if (c.failed >= MAX_FAILED) {
          c.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
          c.failed = 0;
          audit(d, { name: 'Sistema', role: 'Sistema' }, 'Usuario bloqueado', u.email, `${MAX_FAILED} intentos fallidos`);
        }
      });
      throw new Error(generic);
    }
    commit((d) => {
      const c = d.credentials[u.id]!;
      c.failed = 0;
      c.lockedUntil = undefined;
      const usr = d.users.find((x) => x.id === u.id)!;
      usr.lastAccess = nowIso();
      audit(d, actor, 'Inició sesión', u.email);
    });
    return { user: db.users.find((x) => x.id === u.id)!, mustChange: cred.mustChange };
  },

  async changePassword(userId: string, current: string, next: string) {
    const u = db.users.find((x) => x.id === userId);
    const cred = db.credentials[userId];
    if (!u || !cred) throw new Error('Usuario no encontrado');
    if (!(await verifyPassword(current, cred))) throw new Error('La contraseña actual no es correcta');
    const issues = passwordIssues(next);
    if (issues.length) throw new Error(issues.join(' · '));
    if (await verifyPassword(next, cred)) throw new Error('La nueva contraseña debe ser distinta de la actual');
    const h = await hashPassword(next);
    commit((d) => {
      d.credentials[userId] = { ...h, mustChange: false, failed: 0, updatedAt: nowIso() };
      audit(d, { name: u.name, role: u.roles.join(', ') }, 'Cambió su contraseña', u.email);
    });
  },

  /** El administrador asigna una contraseña temporal (se muestra una sola vez). */
  async setTempPassword(actor: Actor, userId: string): Promise<string> {
    const u = db.users.find((x) => x.id === userId);
    if (!u) throw new Error('Usuario no encontrado');
    const temp = generateTempPassword();
    const h = await hashPassword(temp);
    commit((d) => {
      d.credentials[userId] = { ...h, mustChange: true, failed: 0, updatedAt: nowIso() };
      audit(d, actor, 'Asignó contraseña temporal', u.email);
    });
    return temp;
  },

  async unlockUser(actor: Actor, userId: string) {
    await wait();
    commit((d) => {
      const c = d.credentials[userId];
      if (c) {
        c.lockedUntil = undefined;
        c.failed = 0;
      }
      audit(d, actor, 'Desbloqueó usuario', d.users.find((x) => x.id === userId)?.email ?? userId);
    });
  },

  async logout(user: User) {
    commit((d) => audit(d, { name: user.name, role: user.roles.join(', ') }, 'Cerró sesión', user.email));
  },

  resetDemo() {
    db = buildSeed();
    persist();
    listeners.forEach((l) => l());
  },
};
