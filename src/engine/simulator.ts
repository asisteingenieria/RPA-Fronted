/**
 * Simulación LOCAL de la conversación con el contenido de una versión (o del borrador).
 * Sigue la máquina de estados del robot: el flujo y los datos (planes, precios, textos fijos y
 * legales) los pone el código; las partes que en producción redacta la IA se aproximan con las
 * preguntas y respuestas guía configuradas. No envía nada a Abaya ni llama a ningún modelo.
 */
import { formatLegalDate } from '@/lib/format';
import { LETTER_PROCESS, type ContentSnapshot, type MenuLetter, type Plan, type Usage } from '@/data/types';
import { activePlans, mainOfferBullets, planLine, secondOffer } from './offer';
import { normalize, validateReply, type ReplyKind, type ValidatorResult } from './validators';

export type SimStage =
  | 'INICIO'
  | 'MENU'
  | 'PERFIL'
  | 'OFERTA'
  | 'OFERTA2'
  | 'AUTORIZACION'
  | 'NO_AUTORIZA'
  | 'SOPORTE'
  | 'DESPEDIDA'
  | 'TRANSFERENCIA'
  | 'CERRADO';

export const STAGE_LABEL: Record<SimStage, string> = {
  INICIO: 'Inicio',
  MENU: 'Menú',
  PERFIL: 'Perfilamiento',
  OFERTA: 'Oferta',
  OFERTA2: 'Oferta',
  AUTORIZACION: 'Autorización',
  NO_AUTORIZA: 'No autoriza',
  SOPORTE: 'Soporte',
  DESPEDIDA: 'Despedida',
  TRANSFERENCIA: 'Transferencia',
  CERRADO: 'Cerrado',
};

export interface SimState {
  stage: SimStage;
  option?: MenuLetter;
  name?: string;
  operator?: string;
  usage?: Usage;
  offered: string[];
  lastOffer: string[];
  chosen?: string;
  pending?: 'economico' | 'asesor' | 'continuar';
  offTopic: number;
  turn: number;
}

export interface SimReply {
  text: string;
  kind: ReplyKind;
}

export interface TurnDebug {
  turn: number;
  from: SimStage;
  to: SimStage;
  intent: string;
  data: { label: string; value: string }[];
  offered?: string;
  validators: ValidatorResult[];
  safeUsed: boolean;
  safeReason?: string;
  ms: number;
  note?: string;
}

export interface TurnResult {
  state: SimState;
  replies: SimReply[];
  debug: TurnDebug;
}

export const initialState = (): SimState => ({ stage: 'INICIO', offered: [], lastOffer: [], offTopic: 0, turn: 0 });

const YES = /^(si|claro|dale|listo|ok|okay|perfecto|me gusta|me interesa|quiero|de una|bueno|ese|este|me quedo)\b/;
const NO = /^(no|nop|nel|ninguno|ninguna)\b/;
const CHEAPER = /(caro|barato|economico|menos|otra opcion|otras opciones|otro plan|otros planes|algo mas)/;

function fill(text: string, s: SimState): string {
  return s.name ? text.split('[Nombre]').join(s.name) : text.replace(/,?\s*\[Nombre\]/g, '');
}

function activeCampaign(c: ContentSnapshot, now: Date) {
  return c.campaigns.find((k) => k.active && new Date(k.startsAt) <= now && now <= new Date(k.endsAt));
}

export function renderGreeting(c: ContentSnapshot, now = new Date()): string {
  const t = c.templates.find((x) => x.id === 'saludo')?.text ?? '';
  const camp = activeCampaign(c, now);
  return camp ? t.split('{{CAMPANA}}').join(camp.greetingBlock) : t.replace(/\n*\{\{CAMPANA\}\}\n*/, '\n\n');
}

export function renderLegal(c: ContentSnapshot, now = new Date()): string {
  return c.legal.text.split('{{FECHA}}').join(formatLegalDate(now));
}

function tpl(c: ContentSnapshot, id: string): string {
  return c.templates.find((x) => x.id === id)?.text ?? '';
}

function parseOption(raw: string, c: ContentSnapshot): MenuLetter | undefined {
  const t = normalize(raw);
  const m = /^(?:la\s+)?(?:opcion\s+)?([abcd1-4])$/.exec(t);
  if (m) return ({ a: 'A', b: 'B', c: 'C', d: 'D', 1: 'A', 2: 'B', 3: 'C', 4: 'D' } as const)[m[1] as 'a'];
  const menu = c.templates.find((x) => x.id === 'saludo')?.menuOptions ?? [];
  const byText = menu.find((o) => normalize(o.text) === t);
  if (byText) return byText.letter;
  if (/(cambiar(me)? de operador|portar|portabilidad|otro operador)/.test(t)) return 'A';
  if (/(recarga|prepago|pospago)/.test(t)) return 'B';
  if (/(numero nuevo|linea nueva|nueva linea|numero completamente nuevo)/.test(t)) return 'C';
  if (/(factura|soporte|reclamo|pqr|mi plan actual)/.test(t)) return 'D';
  return undefined;
}

function parseUsage(raw: string): Usage | undefined {
  const t = normalize(raw);
  if (/trabaj|negocio|oficina/.test(t)) return 'trabajo';
  if (/estudi|universidad|colegio|clases/.test(t)) return 'estudio';
  if (/diari|personal|normal|casa|redes|todo/.test(t)) return 'diario';
  return undefined;
}

function parseName(raw: string): string | undefined {
  const t = raw.trim().replace(/^(hola[, ]*)?(soy|me llamo|mi nombre es|con)\s+/i, '');
  const w = t.split(/\s+/)[0]?.replace(/[^\p{L}]/gu, '');
  if (!w || w.length < 2) return undefined;
  return w[0]!.toUpperCase() + w.slice(1).toLowerCase();
}

function pickFrom(raw: string, plans: Plan[]): Plan | undefined {
  const t = normalize(raw);
  const byCode = plans.find((p) => new RegExp(`\\b${p.code.toLowerCase()}\\b`).test(t));
  if (byCode) return byCode;
  const ord = [/\b(primero|primer|1)\b/, /\b(segundo|2)\b/, /\b(tercero|tercer|3)\b/].findIndex((r) => r.test(t));
  if (ord >= 0 && plans[ord]) return plans[ord];
  const gb = /(\d+)\s?gb/.exec(t);
  if (gb) return plans.find((p) => p.dataGb === Number(gb[1]));
  if (/ilimitad/.test(t)) return plans.find((p) => p.unlimitedData);
  if (/(mas barato|mas economico|el menor)/.test(t)) return plans.at(-1);
  return undefined;
}

function nextProfileQuestion(c: ContentSnapshot, s: SimState): string | undefined {
  for (const q of c.steps.PERFIL.questions) {
    if (q.onlyFor && s.option && !q.onlyFor.includes(s.option)) continue;
    if (q.collects === 'Nombre' && !s.name) return q.text;
    if (q.collects === 'Operador actual' && !s.operator) return q.text;
    if (q.collects === 'Perfil de uso' && !s.usage) return q.text;
  }
  return undefined;
}

/** Pregunta del paso actual, para retomar tras una interrupción (beneficio, sticker…). */
function currentQuestion(c: ContentSnapshot, s: SimState): string {
  switch (s.stage) {
    case 'MENU':
      return '¿Cuál de las opciones prefieres: A, B, C o D?';
    case 'PERFIL':
      return nextProfileQuestion(c, s) ?? '';
    case 'OFERTA':
      return '¿Te gustaría quedarte con este plan?';
    case 'OFERTA2':
      return '¿Cuál de estos planes te gusta más?';
    case 'AUTORIZACION':
      return `Para continuar responde *${c.legal.acceptance}* o *NO*.`;
    default:
      return '';
  }
}

export function step(c: ContentSnapshot, prev: SimState, input: string, now = new Date()): TurnResult {
  const s: SimState = { ...prev, offered: [...prev.offered], lastOffer: [...prev.lastOffer], turn: prev.turn + 1 };
  const from = s.stage;
  const replies: SimReply[] = [];
  let intent = 'NO_ENTENDIDO';
  let note: string | undefined;
  const t = normalize(input);
  const say = (text: string, kind: ReplyKind) => replies.push({ text: fill(text, s), kind });
  const process = s.option && s.option !== 'D' ? LETTER_PROCESS[s.option] : undefined;
  const camp = activeCampaign(c, now);

  const goOffer = () => {
    const plans = process ? activePlans(c, process) : [];
    if (!plans.length) {
      say(tpl(c, 'sin-planes'), 'exacto');
      say(tpl(c, 'transferencia-asesor'), 'exacto');
      s.stage = 'TRANSFERENCIA';
      note = 'Sin planes activos para la opción: se transfiere a un asesor.';
      return;
    }
    const first = c.offer.highestFirst ? plans[0]! : plans.at(-1)!;
    s.offered.push(first.code);
    s.lastOffer = [first.code];
    say(`Perfecto, [Nombre]. Tengo para ti nuestro plan más completo:\n${mainOfferBullets(first)}\n¿Te gustaría quedarte con este plan?`, 'oferta');
    s.stage = 'OFERTA';
  };
  const goSecond = (cheapestFirst = false) => {
    if (!process) return;
    let plans = secondOffer(c, process, s.usage, s.offered);
    if (cheapestFirst) plans = [...plans].sort((a, b) => a.priceCop - b.priceCop);
    if (!plans.length) {
      say('Ya te mostré todas las opciones disponibles para tu caso. ¿Quieres que un asesor te ayude a elegir?', 'ia');
      s.pending = 'asesor';
      return;
    }
    s.offered.push(...plans.map((p) => p.code));
    s.lastOffer = plans.map((p) => p.code);
    say(`Entiendo, [Nombre]. Te comparto otras opciones:\n${plans.map((p) => planLine(p, c.offer.lineFormat)).join('\n')}\n¿Cuál de estos planes te gusta más?`, 'oferta');
    s.stage = 'OFERTA2';
  };
  const goClose = (p: Plan) => {
    s.chosen = p.code;
    say(`${tpl(c, 'inicio-cierre')}\n\n${renderLegal(c, now)}`, 'legal');
    s.stage = 'AUTORIZACION';
  };
  const transfer = () => {
    say(tpl(c, 'transferencia-asesor'), 'exacto');
    s.stage = 'TRANSFERENCIA';
  };
  const farewell = () => {
    say(tpl(c, 'despedida'), 'exacto');
    s.stage = 'CERRADO';
  };

  if (s.stage === 'TRANSFERENCIA' || s.stage === 'CERRADO') {
    return {
      state: s,
      replies: [],
      debug: { turn: s.turn, from, to: s.stage, intent: 'SIN_RESPUESTA', data: dataOf(s), validators: [], safeUsed: false, ms: 0, note: 'Conversación terminada: después de transferir o despedirse el robot no envía ningún otro mensaje.' },
    };
  }

  const nonText = /^\[(sticker|imagen|audio|video|el cliente envio .*)\]$/.test(t.replace(/\s+/g, ' ')) || /^\[.*\]$/.test(input.trim());
  const objection = c.objections.find((o) => o.active && o.phrases.some((p) => p && t.includes(normalize(p))));

  if (s.stage === 'INICIO') {
    intent = 'SALUDO';
    say(renderGreeting(c, now), 'exacto');
    s.stage = 'MENU';
  } else if (nonText) {
    intent = 'NO_TEXTO';
    say(`Por ahora solo puedo leer mensajes de texto. ${currentQuestion(c, s)}`, 'ia');
  } else if (camp && /(beneficio|navidad|arbolito|bienestar|asistencia)/.test(t) && s.stage !== 'AUTORIZACION') {
    intent = 'PREGUNTA_BENEFICIO';
    say(camp.benefitAnswer, 'exacto');
    const q = currentQuestion(c, s);
    if (q) say(q, 'ia');
  } else if (s.pending && YES.test(t)) {
    intent = 'ACEPTA';
    const p = s.pending;
    s.pending = undefined;
    if (p === 'asesor') transfer();
    else if (p === 'economico') goSecond(true);
    else say(currentQuestion(c, s) || '¿Te gustaría quedarte con este plan?', 'ia');
  } else if (s.pending === 'asesor' && NO.test(t)) {
    intent = 'RECHAZA_ASESOR';
    s.pending = undefined;
    say(tpl(c, 'pregunta-despedida'), 'exacto');
    s.stage = 'DESPEDIDA';
  } else if (objection && ['OFERTA', 'OFERTA2', 'PERFIL', 'MENU'].includes(s.stage)) {
    intent = 'OBJECION';
    note = `Objeción detectada: ${objection.name}`;
    say(objection.response, 'ia');
    s.pending = objection.action === 'mas-economico' ? 'economico' : objection.action === 'ofrecer-asesor' ? 'asesor' : 'continuar';
  } else {
    s.pending = undefined;
    switch (s.stage) {
      case 'MENU': {
        const opt = parseOption(input, c);
        if (!opt) {
          intent = 'NO_ENTENDIDO';
          say('¿Cuál de las opciones prefieres: A, B, C o D?', 'ia');
          break;
        }
        intent = 'ELIGE_OPCION';
        s.option = opt;
        if (opt === 'D') {
          say(tpl(c, 'soporte'), 'exacto');
          s.stage = 'SOPORTE';
        } else {
          s.stage = 'PERFIL';
          say(nextProfileQuestion(c, s) ?? '', 'ia');
        }
        break;
      }
      case 'SOPORTE': {
        if (YES.test(t)) {
          intent = 'ACEPTA';
          s.stage = 'MENU';
          s.offTopic = 0;
          say('¡Perfecto! ¿Cuál de estas opciones prefieres: A, B o C?', 'ia');
        } else if (NO.test(t)) {
          intent = 'NO_INTERESADO';
          farewell();
        } else {
          intent = 'FUERA_DE_ALCANCE';
          s.offTopic += 1;
          if (s.offTopic >= c.personality.offTopicLimit) {
            farewell();
            note = `Insistió ${s.offTopic} veces fuera de ventas: despedida y cierre.`;
          } else say(tpl(c, 'soporte'), 'exacto');
        }
        break;
      }
      case 'PERFIL': {
        intent = 'DA_DATO';
        const asking = nextProfileQuestion(c, s);
        const q = c.steps.PERFIL.questions.find((x) => x.text === asking);
        if (q?.collects === 'Nombre') s.name = parseName(input);
        else if (q?.collects === 'Operador actual') s.operator = input.trim().slice(0, 30);
        else if (q?.collects === 'Perfil de uso') s.usage = parseUsage(input);
        const nextQ = nextProfileQuestion(c, s);
        if (nextQ && nextQ === asking) {
          intent = 'NO_ENTENDIDO';
          say(nextQ, 'ia');
        } else if (nextQ) say(nextQ, 'ia');
        else goOffer();
        break;
      }
      case 'OFERTA': {
        if (YES.test(t)) {
          intent = 'ACEPTA_PLAN';
          const p = c.plans.find((x) => x.code === s.lastOffer[0]);
          if (p) goClose(p);
        } else if (NO.test(t) || CHEAPER.test(t)) {
          intent = 'PIDE_OTRAS';
          goSecond();
        } else {
          intent = 'PREGUNTA';
          say('Con gusto te ayudo. ¿Te gustaría quedarte con este plan?', 'ia');
        }
        break;
      }
      case 'OFERTA2': {
        const shown = s.lastOffer.map((code) => c.plans.find((p) => p.code === code)).filter(Boolean) as Plan[];
        const picked = pickFrom(input, shown);
        if (picked) {
          intent = 'ACEPTA_PLAN';
          goClose(picked);
        } else if (NO.test(t) || CHEAPER.test(t)) {
          intent = 'PIDE_OTRAS';
          goSecond();
        } else {
          intent = 'PREGUNTA';
          say('¿Cuál de estos planes te gusta más?', 'ia');
        }
        break;
      }
      case 'AUTORIZACION': {
        if (normalize(input) === normalize(c.legal.acceptance)) {
          intent = 'AUTORIZA';
          say(tpl(c, 'transferencia-autoriza'), 'exacto');
          s.stage = 'TRANSFERENCIA';
          note = 'Autorización explícita: se deja la nota interna y se transfiere al backoffice.';
        } else if (NO.test(t)) {
          intent = 'NO_AUTORIZA';
          say(tpl(c, 'no-autoriza'), 'exacto');
          s.stage = 'NO_AUTORIZA';
          s.pending = 'asesor';
        } else {
          intent = 'DUDA';
          note = 'Solo la respuesta exacta cuenta como autorización.';
          say(`Para continuar necesito que respondas *${c.legal.acceptance}* o *NO*.`, 'exacto');
        }
        break;
      }
      case 'NO_AUTORIZA':
      case 'DESPEDIDA': {
        intent = NO.test(t) ? 'NO_INTERESADO' : 'PREGUNTA';
        if (NO.test(t) || s.stage === 'DESPEDIDA') farewell();
        else transfer();
        break;
      }
    }
  }

  // Validación de cada respuesta; si una respuesta de IA no pasa, se usa la respuesta segura.
  let safeUsed = false;
  let safeReason: string | undefined;
  const validators: ValidatorResult[] = [];
  const finalReplies = replies.map((r) => {
    const v = validateReply(r.text, r.kind, c);
    validators.push(...v.filter((x) => !validators.some((y) => y.name === x.name && !y.ok)));
    const failed = v.filter((x) => !x.ok);
    if (r.kind === 'ia' && failed.length) {
      safeUsed = true;
      safeReason = failed.map((f) => f.detail ?? f.name).join(' · ');
      return { text: fill(tpl(c, 'respuesta-segura'), s), kind: 'exacto' as const };
    }
    return r;
  });
  const merged = mergeValidators(validators);

  return {
    state: s,
    replies: finalReplies,
    debug: {
      turn: s.turn,
      from,
      to: s.stage,
      intent,
      data: dataOf(s),
      offered: s.lastOffer.length ? s.lastOffer.join(', ') : undefined,
      validators: merged,
      safeUsed,
      safeReason,
      ms: 900 + ((input.length * 37) % 1100),
      note,
    },
  };
}

function mergeValidators(list: ValidatorResult[]): ValidatorResult[] {
  const map = new Map<string, ValidatorResult>();
  for (const v of list) {
    const cur = map.get(v.name);
    if (!cur || (cur.ok && !v.ok)) map.set(v.name, v);
  }
  return [...map.values()];
}

function dataOf(s: SimState) {
  const out: { label: string; value: string }[] = [];
  if (s.name) out.push({ label: 'Nombre', value: s.name });
  if (s.option) out.push({ label: 'Opción', value: s.option });
  if (s.operator) out.push({ label: 'Operador', value: '(registrado)' });
  if (s.usage) out.push({ label: 'Perfil', value: s.usage === 'diario' ? 'Uso diario' : s.usage[0]!.toUpperCase() + s.usage.slice(1) });
  if (s.chosen) out.push({ label: 'Plan elegido', value: s.chosen });
  return out;
}

/** Corre una conversación completa (para evaluaciones). */
export function runScript(c: ContentSnapshot, messages: string[], now = new Date()) {
  let state = initialState();
  const transcript: { from: 'bot' | 'client'; text: string }[] = [];
  const turns: TurnDebug[] = [];
  for (const m of messages) {
    transcript.push({ from: 'client', text: m });
    const r = step(c, state, m, now);
    state = r.state;
    turns.push(r.debug);
    for (const rep of r.replies) transcript.push({ from: 'bot', text: rep.text });
  }
  return { state, transcript, turns };
}
