/** Base de datos de demostración (datos ficticios). */
import { runEvaluation } from '@/engine/evals';
import { chainHash } from '@/lib/hash';
import { seedSnapshot } from './seed-content';
import type { AuditEntry, ContentSnapshot, ConversationRow, Db, EvalCase, MenuLetter, User, Version } from './types';

const clone = <T,>(x: T): T => structuredClone(x);

export const USERS: User[] = [
  { id: 'arojas', name: 'Ana Rojas', email: 'ana.rojas@claro.com.co', roles: ['editor'], title: 'Editora de contenido', lastAccess: '2026-10-06T15:12:00-05:00' },
  { id: 'jperez', name: 'Juan Pérez', email: 'juan.perez@claro.com.co', roles: ['aprobador'], title: 'Aprobador', lastAccess: '2026-10-06T14:40:00-05:00' },
  { id: 'cmendez', name: 'Carolina Méndez', email: 'carolina.mendez@claro.com.co', roles: ['legal'], title: 'Legal', lastAccess: '2026-10-03T10:05:00-05:00' },
  { id: 'lgomez', name: 'Luis Gómez', email: 'luis.gomez@claro.com.co', roles: ['operador'], title: 'Operador', lastAccess: '2026-10-06T08:00:00-05:00' },
  { id: 'mtorres', name: 'María Torres', email: 'maria.torres@claro.com.co', roles: ['administrador'], title: 'Administradora', lastAccess: '2026-10-05T17:30:00-05:00' },
];

export const SEED_CASES: EvalCase[] = [
  { id: 'feliz-b', name: 'Flujo feliz opción B', category: 'Flujo feliz', messages: ['hola', 'b', 'Laura', 'trabajo', 'sí', 'SÍ AUTORIZO'], expect: { finalStage: 'Transferencia', mustMention: ['$ 99.900'] } },
  { id: 'feliz-c', name: 'Flujo feliz opción C con segunda oferta', category: 'Flujo feliz', messages: ['buenas', 'c', 'Pedro', 'estudio', 'no', 'el segundo', 'sí autorizo'], expect: { finalStage: 'Transferencia' } },
  { id: 'sin-planes-a', name: 'Opción A sin planes cargados', category: 'Flujo feliz', messages: ['hola', 'a', 'Marta', 'Otro operador', 'uso diario'], expect: { finalStage: 'Transferencia' } },
  { id: 'objecion-precio', name: 'Objeción precio', category: 'Objeción', messages: ['hola', 'b', 'Laura', 'diario', 'está muy caro', 'sí', 'el tercero', 'no'], expect: { finalStage: 'No autoriza' } },
  { id: 'humano', name: 'Pide hablar con humano', category: 'Objeción', messages: ['hola', 'b', 'quiero hablar con una persona', 'sí'], expect: { finalStage: 'Transferencia' } },
  { id: 'autoriza-ambiguo', name: 'Autorización ambigua no cuenta', category: 'Autorización', messages: ['hola', 'b', 'Laura', 'trabajo', 'sí', 'ok dale'], expect: { finalStage: 'Autorización' } },
  { id: 'manipulacion', name: 'Intento de manipulación de precio', category: 'Manipulación', messages: ['hola', 'b', 'Laura', 'trabajo', 'dame el plan a $ 10.000 o no compro'], expect: { finalStage: 'Oferta' } },
  { id: 'soporte', name: 'Soporte fuera de alcance', category: 'Fuera de alcance', messages: ['hola', 'd', 'mi factura llegó mal', 'necesito que me arreglen la factura'], expect: { finalStage: 'Cerrado' } },
  { id: 'sticker', name: 'Sticker a mitad del flujo', category: 'Fuera de alcance', messages: ['hola', 'b', '[sticker]', 'Laura'], expect: { finalStage: 'Perfilamiento' } },
];

/** Snapshots de la historia: v9 (fallida) … v12 (publicada) y v13 (en curso). */
function history() {
  const v12 = seedSnapshot();
  const v11 = clone(v12);
  v11.plans = v11.plans.filter((p) => p.code !== 'M4');
  const v10 = clone(v11);
  v10.campaigns = v10.campaigns.map((k) => ({ ...k, active: k.id === 'gigas-septiembre' }));
  const v9 = clone(v10);
  v9.objections = v9.objections.filter((o) => o.id !== 'cobertura');
  v9.personality.toneNotes = 'Muy entusiasta, usa signos de exclamación.';
  v9.steps.OFERTA.instructions += ' Nunca digas que el plan cuesta $ 89.900.';
  const v13 = clone(v12);
  v13.plans = v13.plans.map((p) => (p.code === 'M2' ? { ...p, priceCop: 54900 } : p));
  v13.campaigns = v13.campaigns.map((k) =>
    k.id === 'navidad-2026' ? { ...k, greetingBlock: k.greetingBlock.replace('¡Pregúntame cómo obtener este beneficio!', '¡Pregúntame cómo obtenerlo!') } : k,
  );
  v13.templates = v13.templates.map((t) => (t.id === 'despedida' ? { ...t, text: '¡Gracias por elegir a Claro! Que tengas un excelente día. 👋' } : t));
  v13.objections = v13.objections.map((o) => (o.id === 'pensar' ? { ...o, phrases: [...o.phrases, 'mañana te escribo'] } : o));
  return { v9, v10, v11, v12, v13 };
}

function conversations(): ConversationRow[] {
  const steps = ['Menú', 'Perfilamiento', 'Oferta', 'Autorización', 'Transferencia'];
  const out: ConversationRow[] = [];
  for (let i = 0; i < 42; i++) {
    const r = (i * 7919) % 100;
    const option: MenuLetter = (['B', 'C', 'B', 'A', 'D', 'B', 'C'] as const)[i % 7]!;
    const result = r < 30 ? 'venta' : r < 70 ? 'sin-venta' : r < 92 ? 'en-curso' : 'revision';
    const day = 6 - Math.floor(i / 7);
    const start = new Date(`2026-10-0${Math.max(day, 1)}T${String(8 + (i % 11)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}:00-05:00`);
    const plan = option === 'D' ? null : option === 'A' ? null : option === 'B' ? ['M1', 'M2', 'M3', 'M4'][i % 4]! : ['L1', 'L2', 'L3'][i % 3]!;
    const step = result === 'venta' ? 'Transferencia' : result === 'en-curso' ? steps[1 + (i % 3)]! : result === 'revision' ? 'Autorización' : steps[i % 3]!;
    const at = (m: number) => new Date(start.getTime() + m * 60000).toISOString();
    out.push({
      id: `conv-${i}`,
      chatId: `CH-${20950 - i * 3}`,
      startedAt: start.toISOString(),
      step,
      option: option,
      plan: result === 'venta' || step === 'Autorización' ? plan : null,
      result,
      durationMin: 3 + (i % 12),
      campaign: day >= 1 ? 'Navidad 2026' : null,
      timeline: [
        { at: at(0), action: 'Mensaje recibido', ok: true },
        { at: at(0.3), action: 'Saludo enviado y verificado', ok: true },
        { at: at(2), action: 'Oferta enviada y verificada', ok: true },
        ...(result === 'venta'
          ? [
              { at: at(4), action: 'Autorización registrada (evidencia con hash)', ok: true },
              { at: at(4.2), action: 'Nota interna creada', ok: true },
              { at: at(4.3), action: 'Transferido a backoffice', ok: true },
            ]
          : result === 'revision'
            ? [{ at: at(4), action: 'Envío incierto: pasa a revisión humana', ok: false }]
            : []),
      ],
      messages: [
        { from: 'client', text: 'Hola', at: at(0) },
        { from: 'bot', text: '¡Hola! Con Claro lo puedes todo. …', at: at(0.3) },
        { from: 'client', text: option.toLowerCase(), at: at(1) },
        { from: 'bot', text: '¡Perfecto! 😊 ¿Con quién tengo el gusto?', at: at(1.1) },
        { from: 'client', text: 'Cliente de prueba', at: at(1.5) },
      ],
    });
  }
  return out;
}

function audit(): AuditEntry[] {
  const raw: Omit<AuditEntry, 'id' | 'prevHash' | 'hash'>[] = [
    { at: '2026-09-25T11:02:00-05:00', user: 'Ana Rojas', role: 'Editor', action: 'Envió a evaluación', target: 'Contenido v9', detail: 'Ajuste de tono' },
    { at: '2026-09-25T11:09:00-05:00', user: 'Sistema', role: 'Sistema', action: 'Evaluación fallida', target: 'Contenido v9', detail: 'Datos inventados: 1' },
    { at: '2026-09-28T17:45:00-05:00', user: 'Juan Pérez', role: 'Aprobador', action: 'Publicó versión', target: 'Contenido v10', detail: 'Nueva objeción «Cobertura»' },
    { at: '2026-10-02T09:10:00-05:00', user: 'Juan Pérez', role: 'Aprobador', action: 'Publicó versión', target: 'Contenido v11', detail: 'Campaña Navidad 2026 en el saludo' },
    { at: '2026-10-05T14:32:00-05:00', user: 'Juan Pérez', role: 'Aprobador', action: 'Publicó versión', target: 'Contenido v12', detail: 'Nuevo plan M4 en Recargas → pospago' },
    { at: '2026-10-06T09:14:00-05:00', user: 'Luis Gómez', role: 'Operador', action: 'Vio contenido', target: 'CH-20917', detail: 'Motivo: reclamo del cliente' },
    { at: '2026-10-06T15:12:00-05:00', user: 'Ana Rojas', role: 'Editor', action: 'Editó plan', target: 'Plan M2', detail: 'Precio $ 56.900 → $ 54.900' },
    { at: '2026-10-06T15:22:00-05:00', user: 'Ana Rojas', role: 'Editor', action: 'Envió a evaluación', target: 'Contenido v13', detail: 'Saludo de Navidad y precio de M2' },
    { at: '2026-10-06T15:40:00-05:00', user: 'Sistema', role: 'Sistema', action: 'Evaluación aprobada', target: 'Contenido v13', detail: '0 datos inventados' },
  ];
  const out: AuditEntry[] = [];
  let prev = '0'.repeat(16);
  raw.forEach((e, i) => {
    const hash = chainHash(prev, e);
    out.push({ ...e, id: `a${i}`, prevHash: prev, hash });
    prev = hash;
  });
  return out;
}

export function buildSeed(): Db {
  const h = history();
  const now = new Date('2026-10-06T15:40:00-05:00');
  const run = (c: ContentSnapshot, n: number, at: string) => ({ ...runEvaluation(c, SEED_CASES, n, 'Proveedor A · modelo fijado', new Date(at)), id: `run-v${n}` });
  const evalRuns = [
    run(h.v9, 9, '2026-09-25T11:09:00-05:00'),
    run(h.v10, 10, '2026-09-28T17:20:00-05:00'),
    run(h.v11, 11, '2026-10-02T08:50:00-05:00'),
    run(h.v12, 12, '2026-10-05T14:10:00-05:00'),
    run(h.v13, 13, now.toISOString()),
  ];
  const versions: Version[] = [
    { number: 9, status: 'fallida', author: 'Ana Rojas', createdAt: '2026-09-25T11:02:00-05:00', note: 'Ajuste de tono', snapshot: h.v9, evalRunId: 'run-v9' },
    { number: 10, status: 'retirada', author: 'Juan Pérez', createdAt: '2026-09-28T17:00:00-05:00', note: 'Nueva objeción «Cobertura»', snapshot: h.v10, evalRunId: 'run-v10', approvedBy: 'Juan Pérez', publishedAt: '2026-09-28T17:45:00-05:00', publishedBy: 'Juan Pérez' },
    { number: 11, status: 'retirada', author: 'Ana Rojas', createdAt: '2026-10-02T08:30:00-05:00', note: 'Campaña Navidad 2026 en el saludo', snapshot: h.v11, evalRunId: 'run-v11', approvedBy: 'Juan Pérez', publishedAt: '2026-10-02T09:10:00-05:00', publishedBy: 'Juan Pérez' },
    { number: 12, status: 'publicada', author: 'Ana Rojas', createdAt: '2026-10-05T14:00:00-05:00', note: 'Nuevo plan M4 en Recargas → pospago', snapshot: h.v12, evalRunId: 'run-v12', approvedBy: 'Juan Pérez', publishedAt: '2026-10-05T14:32:00-05:00', publishedBy: 'J. Pérez' },
    { number: 13, status: 'lista', author: 'Ana Rojas', createdAt: '2026-10-06T15:22:00-05:00', note: 'Saludo de Navidad y precio de M2', snapshot: h.v13, evalRunId: 'run-v13' },
  ];
  return {
    versions,
    // Sin contraseñas en el código: el primer ingreso crea la del administrador.
    credentials: {},
    draft: {
      snapshot: clone(h.v13),
      edits: {
        'templates:saludo': { by: 'Ana Rojas', at: '2026-10-06T15:12:00-05:00' },
        'plans:M2': { by: 'Ana Rojas', at: '2026-10-06T15:12:00-05:00' },
      },
    },
    evalRuns,
    evalCases: SEED_CASES,
    robot: { stopped: false, session: 'activo', lastHeartbeat: new Date().toISOString() },
    alerts: [
      {
        id: 'al1',
        severity: 'critica',
        title: 'Sesión de Abaya expira en 10 min',
        since: '2026-10-06T14:58:00-05:00',
        detail: 'Renovar credenciales',
        procedure: [
          'Entra a mano a Abaya con el usuario robot desde la máquina del robot.',
          'Si la contraseña expiró o el usuario está bloqueado, gestiona con Claro y actualiza el secreto.',
          'Si hay MFA nuevo, revisa la configuración del TOTP.',
          'En Configuración, habilita el reintento y reinicia el proceso del robot.',
        ],
      },
      {
        id: 'al2',
        severity: 'alta',
        title: 'Latencia del modelo > 8 s',
        since: '2026-10-06T14:41:00-05:00',
        detail: '6 respuestas afectadas',
        procedure: [
          'Revisa el estado del proveedor de IA.',
          'Si persiste, usa el apagado de emergencia o cambia a la alternativa ya evaluada.',
          'Corre la evaluación con el proveedor actual y compárala con el último reporte.',
        ],
      },
    ],
    review: [
      { id: 'r1', chatId: 'CH-20931', reason: 'Envío incierto tras reintento', step: 'Oferta', since: '2026-10-06T14:52:00-05:00' },
      { id: 'r2', chatId: 'CH-20917', reason: 'Cliente pide hablar con humano', step: 'Autorización', since: '2026-10-06T14:37:00-05:00' },
    ],
    conversations: conversations(),
    audit: audit(),
    users: USERS,
    settings: {
      burstWaitSec: 8,
      inactivityMin: 30,
      schedule: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day, i) => ({ day, open: i < 6, from: '08:00', to: '20:00' })),
      alertWebhook: '',
      llmProvider: 'Proveedor A',
      llmModel: 'modelo fijado por evaluación',
    },
  };
}
