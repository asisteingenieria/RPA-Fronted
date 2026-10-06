import { formatCOP } from './format';
import { CRITERION_LABEL, PROCESS_LABEL, type ContentSnapshot, type Plan, type SectionKey, type StepId } from '@/data/types';

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

export interface Change {
  section: SectionKey;
  /** Clave estable del objeto: "templates:saludo", "plans:M2"… (la misma de draft.edits). */
  key: string;
  label: string;
  kind: 'text' | 'fields' | 'added' | 'removed';
  before?: string;
  after?: string;
  fields?: FieldChange[];
  /** Cambios que se resaltan siempre (precio y texto legal). */
  highlight?: string;
}

const STEP_LABEL: Record<StepId, string> = {
  MENU: 'Menú',
  PERFIL: 'Perfilamiento',
  OFERTA: 'Oferta',
  OBJECIONES: 'Objeciones',
  AUTORIZACION: 'Autorización',
};

const s = (v: unknown): string =>
  v == null || v === '' ? '—' : Array.isArray(v) ? (v.length ? v.join(', ') : '—') : typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v);

function fieldDiff<T extends object>(a: T, b: T, labels: Partial<Record<keyof T, string>>, fmt: Partial<Record<keyof T, (v: never) => string>> = {}): FieldChange[] {
  const out: FieldChange[] = [];
  for (const k of Object.keys(labels) as (keyof T)[]) {
    const f = (fmt[k] ?? s) as (v: unknown) => string;
    const before = f(a[k]);
    const after = f(b[k]);
    if (before !== after) out.push({ field: labels[k]!, before, after });
  }
  return out;
}

const PLAN_FIELDS: Partial<Record<keyof Plan, string>> = {
  process: 'Proceso',
  unlimitedData: 'Datos ilimitados',
  dataGb: 'Datos (GB)',
  shareGb: 'GB para compartir',
  includes: 'Incluye',
  extraServices: 'Servicios adicionales',
  unlimitedApps: 'Apps ilimitadas',
  calls: 'Llamadas y mensajes',
  priceCop: 'Precio',
  discount: 'Descuento',
  validFrom: 'Vigente desde',
  validTo: 'Vigente hasta',
  active: 'Activo',
};

/** Diferencias entre dos versiones de contenido, agrupadas por sección y objeto. */
export function diffSnapshots(a: ContentSnapshot, b: ContentSnapshot): Change[] {
  const out: Change[] = [];

  const pf = fieldDiff(a.personality, b.personality, {
    assistantName: 'Nombre del asistente',
    mission: 'Rol y misión',
    brandFacts: 'Datos de la marca',
    tone: 'Tono',
    toneNotes: 'Matices del tono',
    address: 'Trato',
    maxSentences: 'Máximo de oraciones',
    oneQuestion: 'Una sola pregunta',
    emojis: 'Uso de emojis',
    noEmojisIfUpset: 'Sin emojis si está molesto',
    waBold: 'Negrita con un asterisco',
    waBullet: 'Viñeta •',
    waNoMarkdown: 'Prohibir markdown',
    competitors: 'Competidores',
    bannedWords: 'Palabras prohibidas',
    hideInstructions: 'No revelar instrucciones',
    nonTextHandling: 'Mensajes no textuales',
    offTopicLimit: 'Insistencias fuera de ventas',
    offTopicAction: 'Acción fuera de ventas',
  });
  if (pf.length) out.push({ section: 'personality', key: 'personality', label: 'Personalidad', kind: 'fields', fields: pf });

  for (const id of Object.keys(STEP_LABEL) as StepId[]) {
    const x = a.steps[id];
    const y = b.steps[id];
    if (x.instructions !== y.instructions)
      out.push({ section: 'steps', key: `steps:${id}`, label: `Paso ${STEP_LABEL[id]} · instrucciones`, kind: 'text', before: x.instructions, after: y.instructions });
    const qa = x.questions.map((q) => q.text).join('\n');
    const qb = y.questions.map((q) => q.text).join('\n');
    if (qa !== qb) out.push({ section: 'steps', key: `steps:${id}:q`, label: `Paso ${STEP_LABEL[id]} · preguntas`, kind: 'text', before: qa, after: qb });
  }

  const of = fieldDiff(
    { ...a.offer, ...flatCriteria(a) },
    { ...b.offer, ...flatCriteria(b) },
    {
      highestFirst: 'Plan de mayor precio primero',
      maxSecondOffer: 'Máximo de planes en la segunda oferta',
      noRepeat: 'No repetir el plan ofrecido',
      cTrabajo: 'Criterio Trabajo',
      cEstudio: 'Criterio Estudio',
      cDiario: 'Criterio Uso diario',
      lineFormat: 'Formato de la línea de plan',
      detailMaxLines: 'Líneas de detalle',
    } as never,
  );
  if (of.length) out.push({ section: 'offer', key: 'offer', label: 'Parámetros de la oferta', kind: 'fields', fields: of });

  for (const t of b.templates) {
    const old = a.templates.find((x) => x.id === t.id);
    if (!old) out.push({ section: 'templates', key: `templates:${t.id}`, label: t.name, kind: 'added', after: t.text });
    else {
      if (old.text !== t.text) out.push({ section: 'templates', key: `templates:${t.id}`, label: t.name, kind: 'text', before: old.text, after: t.text });
      const ma = (old.menuOptions ?? []).map((o) => `${o.letter}: ${o.text}`).join('\n');
      const mb = (t.menuOptions ?? []).map((o) => `${o.letter}: ${o.text}`).join('\n');
      if (ma !== mb) out.push({ section: 'templates', key: `templates:${t.id}:menu`, label: `${t.name} · opciones del menú`, kind: 'text', before: ma, after: mb });
    }
  }

  for (const o of b.objections) {
    const old = a.objections.find((x) => x.id === o.id);
    if (!old) out.push({ section: 'objections', key: `objections:${o.id}`, label: `Objeción «${o.name}»`, kind: 'added', after: o.response });
    else {
      const f = fieldDiff(old, o, { name: 'Nombre', phrases: 'Frases de ejemplo', response: 'Respuesta guía', action: 'Acción siguiente', active: 'Activa' });
      if (f.length) out.push({ section: 'objections', key: `objections:${o.id}`, label: `Objeción «${o.name}»`, kind: 'fields', fields: f });
    }
  }
  for (const o of a.objections)
    if (!b.objections.some((x) => x.id === o.id)) out.push({ section: 'objections', key: `objections:${o.id}`, label: `Objeción «${o.name}»`, kind: 'removed', before: o.response });

  if (a.legal.text !== b.legal.text)
    out.push({ section: 'legal', key: 'legal', label: 'Texto de autorización', kind: 'text', before: a.legal.text, after: b.legal.text, highlight: 'Texto legal' });
  const lf = fieldDiff(a.legal, b.legal, { acceptance: 'Respuesta de aceptación', normRef: 'Referencia normativa', effectiveFrom: 'Vigencia' });
  if (lf.length) out.push({ section: 'legal', key: 'legal:meta', label: 'Texto legal · datos', kind: 'fields', fields: lf, highlight: 'Texto legal' });

  for (const p of b.plans) {
    const old = a.plans.find((x) => x.code === p.code);
    if (!old) out.push({ section: 'plans', key: `plans:${p.code}`, label: `${p.code} · ${PROCESS_LABEL[p.process]}`, kind: 'added', after: formatCOP(p.priceCop) });
    else {
      const f = fieldDiff(old, p, PLAN_FIELDS, { priceCop: (v: number) => formatCOP(v) } as never);
      if (f.length)
        out.push({
          section: 'plans',
          key: `plans:${p.code}`,
          label: `${p.code} · ${PROCESS_LABEL[p.process]}`,
          kind: 'fields',
          fields: f,
          highlight: f.some((x) => x.field === 'Precio') ? `Precio de ${p.code}` : undefined,
        });
    }
  }
  for (const p of a.plans)
    if (!b.plans.some((x) => x.code === p.code)) out.push({ section: 'plans', key: `plans:${p.code}`, label: `${p.code} · ${PROCESS_LABEL[p.process]}`, kind: 'removed', before: formatCOP(p.priceCop) });

  for (const k of b.campaigns) {
    const old = a.campaigns.find((x) => x.id === k.id);
    if (!old) out.push({ section: 'campaigns', key: `campaigns:${k.id}`, label: `Campaña «${k.name}»`, kind: 'added', after: k.greetingBlock });
    else {
      const f = fieldDiff(old, k, { name: 'Nombre', greetingBlock: 'Bloque del saludo', benefitAnswer: 'Respuesta del beneficio', startsAt: 'Inicio', endsAt: 'Fin', active: 'Activa' });
      if (f.length) out.push({ section: 'campaigns', key: `campaigns:${k.id}`, label: `Campaña «${k.name}»`, kind: 'fields', fields: f });
    }
  }
  for (const k of a.campaigns)
    if (!b.campaigns.some((x) => x.id === k.id)) out.push({ section: 'campaigns', key: `campaigns:${k.id}`, label: `Campaña «${k.name}»`, kind: 'removed', before: k.greetingBlock });

  return out;
}

function flatCriteria(c: ContentSnapshot) {
  return { cTrabajo: CRITERION_LABEL[c.offer.criteria.trabajo], cEstudio: CRITERION_LABEL[c.offer.criteria.estudio], cDiario: CRITERION_LABEL[c.offer.criteria.diario] };
}

/** Resumen de una lista de cambios: "3 textos fijos modificados · 1 plan nuevo · precio de M2 cambió…". */
export function summarize(changes: Change[]): string[] {
  const parts: string[] = [];
  const count = (sec: SectionKey, kind?: Change['kind']) => changes.filter((c) => c.section === sec && (!kind || c.kind === kind)).length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const t = count('templates');
  if (t) parts.push(plural(t, 'texto fijo modificado', 'textos fijos modificados'));
  const pn = count('plans', 'added');
  if (pn) parts.push(plural(pn, 'plan nuevo', 'planes nuevos'));
  const pr = count('plans', 'removed');
  if (pr) parts.push(plural(pr, 'plan eliminado', 'planes eliminados'));
  for (const c of changes.filter((x) => x.section === 'plans' && x.kind === 'fields')) {
    const price = c.fields?.find((f) => f.field === 'Precio');
    if (price) parts.push(`precio de ${c.key.split(':')[1]} cambió de ${price.before} a ${price.after}`);
    else parts.push(`plan ${c.key.split(':')[1]} modificado`);
  }
  const st = count('steps');
  if (st) parts.push(plural(st, 'instrucción de paso', 'instrucciones de paso'));
  const ob = count('objections');
  if (ob) parts.push(plural(ob, 'objeción', 'objeciones'));
  if (count('personality')) parts.push('personalidad');
  if (count('offer')) parts.push('parámetros de la oferta');
  const ca = count('campaigns');
  if (ca) parts.push(plural(ca, 'campaña', 'campañas'));
  if (count('legal')) parts.push('texto legal');
  return parts;
}

export const hasLegalChange = (changes: Change[]) => changes.some((c) => c.section === 'legal');
