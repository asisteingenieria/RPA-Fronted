/**
 * Modelo de datos del panel. El CONTENIDO de la conversación es inmutable por versión:
 * se edita un borrador, se evalúa, se aprueba y se publica (publicar = cambiar la versión activa).
 */
import type { Role } from '@/components/panel/navigation';
import type { VersionState } from '@/components/panel/badges';

export type Process = 'PORTABILIDAD' | 'MIGRACION' | 'LINEA_NUEVA';
export type MenuLetter = 'A' | 'B' | 'C' | 'D';
export type Usage = 'trabajo' | 'estudio' | 'diario';
export type StepId = 'MENU' | 'PERFIL' | 'OFERTA' | 'OBJECIONES' | 'AUTORIZACION';

/** Nombres de negocio (nunca los internos en la interfaz ni ante el cliente). */
export const PROCESS_LABEL: Record<Process, string> = {
  PORTABILIDAD: 'Cambiarme de operador (A)',
  MIGRACION: 'Recargas → pospago (B)',
  LINEA_NUEVA: 'Número nuevo (C)',
};
export const LETTER_PROCESS: Record<Exclude<MenuLetter, 'D'>, Process> = {
  A: 'PORTABILIDAD',
  B: 'MIGRACION',
  C: 'LINEA_NUEVA',
};

export interface Personality {
  assistantName: string;
  mission: string;
  brandFacts: string;
  tone: 'cercano' | 'formal' | 'neutral';
  toneNotes: string;
  address: 'tu' | 'usted';
  maxSentences: number;
  oneQuestion: boolean;
  emojis: 'solo-fijos' | 'moderado' | 'ninguno';
  noEmojisIfUpset: boolean;
  waBold: boolean;
  waBullet: boolean;
  waNoMarkdown: boolean;
  competitors: string[];
  bannedWords: string[];
  hideInstructions: boolean;
  nonTextHandling: string;
  offTopicLimit: number;
  offTopicAction: string;
}

export interface StepQuestion {
  id: string;
  text: string;
  collects: 'Nombre' | 'Operador actual' | 'Perfil de uso';
  /** Solo para algunas opciones del menú (p. ej. Operador → solo A). */
  onlyFor?: MenuLetter[];
}

export interface StepContent {
  instructions: string;
  questions: StepQuestion[];
}

export type OfferCriterion = 'mas-datos-ldi' | 'apps-precio-moderado' | 'menor-precio-apps' | 'mayor-precio';
export const CRITERION_LABEL: Record<OfferCriterion, string> = {
  'mas-datos-ldi': 'Más datos y llamadas internacionales',
  'apps-precio-moderado': 'Buenos datos + apps ilimitadas, precio moderado',
  'menor-precio-apps': 'Menor precio con apps ilimitadas',
  'mayor-precio': 'De mayor a menor precio',
};

export interface OfferParams {
  highestFirst: boolean;
  maxSecondOffer: number;
  noRepeat: boolean;
  criteria: Record<Usage, OfferCriterion>;
  lineFormat: string;
  detailMaxLines: number;
}

export interface MenuOption {
  letter: MenuLetter;
  text: string;
}

export interface Template {
  id: string;
  name: string;
  step: string;
  description: string;
  text: string;
  allowedVars: string[];
  maxChars: number;
  menuOptions?: MenuOption[];
}

export type ObjectionAction = 'continuar' | 'mas-economico' | 'preguntar-ciudad' | 'ofrecer-asesor';
export const OBJECTION_ACTION_LABEL: Record<ObjectionAction, string> = {
  continuar: 'Continuar con la oferta',
  'mas-economico': 'Mostrar el plan más económico',
  'preguntar-ciudad': 'Preguntar ciudad',
  'ofrecer-asesor': 'Ofrecer asesor y transferir',
};

export interface Objection {
  id: string;
  name: string;
  phrases: string[];
  response: string;
  action: ObjectionAction;
  active: boolean;
}

export interface LegalText {
  text: string;
  acceptance: string;
  normRef: string;
  effectiveFrom: string;
}

export interface Plan {
  code: string;
  process: Process;
  unlimitedData: boolean;
  dataGb: number | null;
  shareGb: number | null;
  includes: string;
  extraServices: string[];
  unlimitedApps: string[];
  calls: string;
  priceCop: number;
  discount: string | null;
  validFrom: string;
  validTo: string | null;
  active: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  greetingBlock: string;
  benefitAnswer: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export interface ContentSnapshot {
  personality: Personality;
  steps: Record<StepId, StepContent>;
  offer: OfferParams;
  templates: Template[];
  objections: Objection[];
  legal: LegalText;
  plans: Plan[];
  campaigns: Campaign[];
}

export type SectionKey = 'personality' | 'steps' | 'offer' | 'templates' | 'objections' | 'legal' | 'plans' | 'campaigns';
export const SECTION_LABEL: Record<SectionKey, string> = {
  personality: 'Personalidad',
  steps: 'Instrucciones por paso',
  offer: 'Parámetros de la oferta',
  templates: 'Textos fijos',
  objections: 'Objeciones',
  legal: 'Texto legal',
  plans: 'Catálogo',
  campaigns: 'Campañas',
};

export interface EvalCaseResult {
  caseId: string;
  name: string;
  category: string;
  passed: boolean;
  failedTurn?: number;
  reason?: string;
  transcript: { from: 'bot' | 'client'; text: string }[];
}

export interface EvalRun {
  id: string;
  versionNumber: number;
  provider: string;
  startedAt: string;
  durationMs: number;
  passRate: number;
  invented: number;
  results: EvalCaseResult[];
}

export interface Version {
  number: number;
  status: VersionState;
  author: string;
  createdAt: string;
  note: string;
  snapshot: ContentSnapshot;
  evalRunId?: string;
  evalProgress?: number;
  approvedBy?: string;
  legalApprovedBy?: string;
  publishedAt?: string;
  publishedBy?: string;
  rejectedComment?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  title: string;
  lastAccess: string;
}

export interface RobotState {
  stopped: boolean;
  stoppedBy?: string;
  stoppedAt?: string;
  session: 'activo' | 'sin-sesion' | 'sin-senal';
  lastHeartbeat: string;
}

export interface Alert {
  id: string;
  severity: 'critica' | 'alta';
  title: string;
  since: string;
  detail: string;
  procedure: string[];
}

export interface ReviewItem {
  id: string;
  chatId: string;
  reason: string;
  step: string;
  since: string;
}

export type ConversationResult = 'venta' | 'sin-venta' | 'en-curso' | 'revision';
export interface ConversationRow {
  id: string;
  chatId: string;
  startedAt: string;
  step: string;
  option: MenuLetter | null;
  plan: string | null;
  result: ConversationResult;
  durationMin: number;
  campaign: string | null;
  timeline: { at: string; action: string; ok: boolean }[];
  /** Contenido oculto por defecto (datos personales): solo se revela con motivo auditado. */
  messages: { from: 'bot' | 'client'; text: string; at: string }[];
}

export interface AuditEntry {
  id: string;
  at: string;
  user: string;
  role: string;
  action: string;
  target: string;
  detail: string;
  prevHash: string;
  hash: string;
}

export interface EvalCase {
  id: string;
  name: string;
  category: 'Flujo feliz' | 'Objeción' | 'Manipulación' | 'Fuera de alcance' | 'Autorización';
  messages: string[];
  expect: { finalStage?: string; mustMention?: string[] };
  fromSimulator?: boolean;
}

export interface Settings {
  burstWaitSec: number;
  inactivityMin: number;
  schedule: { day: string; open: boolean; from: string; to: string }[];
  alertWebhook: string;
  llmProvider: string;
  llmModel: string;
}

export interface DraftState {
  snapshot: ContentSnapshot;
  /** Última edición por sección/objeto, para el pie "Última edición: usuario · fecha". */
  edits: Record<string, { by: string; at: string }>;
}

export interface Db {
  versions: Version[];
  draft: DraftState;
  evalRuns: EvalRun[];
  evalCases: EvalCase[];
  robot: RobotState;
  alerts: Alert[];
  review: ReviewItem[];
  conversations: ConversationRow[];
  audit: AuditEntry[];
  users: User[];
  settings: Settings;
}
