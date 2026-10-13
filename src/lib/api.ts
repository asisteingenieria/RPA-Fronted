/**
 * Cliente de la API de administración del robot (apps/api de RobotRPA, rutas /admin/*).
 * Tipos tomados de lo que hoy entrega el servidor; la UI no inventa campos que no vienen.
 *
 * Sesión: cookie httpOnly (el panel nunca ve ni guarda el token). `x-requested-with` es la defensa
 * CSRF que exige la API en peticiones que cambian algo. En desarrollo Vite reenvía /admin al
 * servidor (ver vite.config.ts y .env.example).
 */
import type { Role } from "./roles";
import type {
  DeliveryStatus,
  Etapa,
  LlmResult,
  Proceso,
  Tipificacion,
  TraceEventKind,
  TraceFlag,
} from "./tipificaciones";

export type { Role };

export interface Me {
  username: string;
  role: Role;
  mustChangePassword: boolean;
  /** v1.9: permiso «Publicar conocimiento» (publicar, revertir y conectar Brains). */
  knowledgePublisher?: boolean;
}

export interface Session {
  robotUser: string;
  status: string;
  lastHeartbeat: string;
  lastLoginAt: string | null;
  consecutiveFails: number;
}

export interface Overview {
  generatedAt: string;
  killSwitch: boolean;
  /** D-009: el apagado lo activó el sistema (p. ej. `LLM_OUTAGE`: el modelo no responde); null si fue manual. */
  killSwitchReason?: { cause: string; detail: string; at: string } | null;
  sessions: Session[];
  conversations: {
    active: number;
    transferring: number;
    needsReview: number;
    byStatus: Record<string, number>;
  };
  sales: { today: number; transferredToday: number };
  recentErrors: {
    robotUser: string;
    action: string;
    abayaChatId: string | null;
    result: string;
    createdAt: string;
  }[];
}

export interface ReviewQueue {
  conversations: {
    id: string;
    abayaChatId: string;
    robotUser: string;
    stage: string;
    updatedAt: string;
  }[];
  uncertainMessages: {
    id: string;
    attempts: number;
    createdAt: string;
    conversation: { id: string; abayaChatId: string; robotUser: string };
  }[];
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  createdAt: string;
}

export interface PanelUser {
  id: string;
  username: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  /** v1.9: permiso «Publicar conocimiento». */
  knowledgePublisher?: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface TemporaryPassword {
  user: PanelUser;
  temporaryPassword: string;
}

export type RobotStatus =
  | "EN_LINEA"
  | "RECONECTANDO"
  | "CAIDO"
  | "SIN_SENAL"
  | "APAGADO"
  | "DESHABILITADO";
export type Range = "hoy" | "7d" | "30d";

export interface RobotSummary {
  robotUser: string;
  status: RobotStatus;
  sessionStatus: string | null;
  paused: boolean;
  enabled: boolean;
  host: string | null;
  version: string | null;
  startedAt: string | null;
  lastSeenAt: string | null;
  stoppedAt: string | null;
  installed: boolean;
  enrolledAt: string | null;
  pendingCodeUntil: string | null;
  hasCredentials: boolean;
  mfaMode: string;
  lastRejectedHost: string | null;
  lastRejectedAt: string | null;
  /** v1.7: última actualización pedida y lo que reportó el robot. */
  update: {
    requested: boolean;
    status: string;
    version: string | null;
    message: string | null;
    at: string | null;
  } | null;
}

export interface RobotListItem extends RobotSummary {
  /** Chats que siguen en su bandeja (v1.5). */
  openChats: number;
  metrics: {
    responseP50Ms: number | null;
    responseP95Ms: number | null;
    responses: number;
    conversations: number;
    sales: number;
    transferred: number;
    conversionPct: number | null;
    needsReview: number;
    actions: number;
    errors: number;
    uncertain: number;
    sendP95Ms: number | null;
  };
}

export interface PublishedPackage {
  version: string;
  size: number;
  builtAt: string;
  signatureValid: boolean;
}

export interface RobotList {
  range: Range;
  from: string;
  generatedAt: string;
  maxChatsPerRobot: number;
  published: PublishedPackage | null;
  robots: RobotListItem[];
}

export interface RobotDetail {
  range: Range;
  from: string;
  robot: RobotSummary;
  openChats: number;
  maxChatsPerRobot: number;
  response: {
    samples: number;
    p50Ms: number | null;
    p95Ms: number | null;
    maxMs: number | null;
  };
  session: {
    status: string;
    lastHeartbeat: string;
    lastLoginAt: string | null;
    consecutiveFails: number;
  } | null;
  metrics: {
    conversations: number;
    byStatus: Record<string, number>;
    sales: number;
    transferred: number;
    conversionPct: number | null;
  };
  actions: {
    action: string;
    total: number;
    ok: number;
    errors: number;
    uncertain: number;
    blocked: number;
    p50: number | null;
    p95: number | null;
  }[];
  recentActions: {
    createdAt: string;
    action: string;
    abayaChatId: string | null;
    result: string;
    durationMs: number;
  }[];
}

export interface RobotTrace {
  ref: string;
  bytes: number;
  at: string;
}

export interface EnrollmentCode {
  robotUser: string;
  enrollmentCode: string;
  expiresAt: string;
}

export interface RobotCredentials {
  abayaPassword?: string;
  mfaMode?: "none" | "totp";
  totpSecret?: string;
}

// ---------- configuración del agente (v1.8) ----------

export type AgentStatus =
  "DRAFT" | "EVALUATING" | "PUBLISHED" | "ARCHIVED" | "REJECTED";

/**
 * D-013: qué hace el sistema con cada plantilla de la campaña. RESPUESTA = la elige el modelo
 * ({{PLANTILLA:id}}); las demás las envía el código en su momento; REFERENCIA nunca se envía.
 */
export type TemplateRole =
  | "RESPUESTA"
  | "INTRO_AUTORIZACION"
  | "AUTORIZACION"
  | "SOLICITUD_DATOS"
  | "DESPEDIDA_NO_VENTA"
  | "REACTIVACION"
  | "REFERENCIA"
  // D-015: plantillas del sistema (textos que antes estaban fijos en el código).
  | "SOPORTE"
  | "PREGUNTA_NECESIDAD"
  | "ESCALAR"
  | "RESPUESTA_SEGURA"
  | "ESPERA"
  | "TRANSFERENCIA"
  | "NO_AUTORIZA"
  | "ASESOR_TRAS_NO_AUTORIZAR"
  | "CONFIRMAR_AUTORIZACION"
  | "AUTORIZACION_POR_ESCRITO"
  | "NOTA_DE_VOZ_ILEGIBLE"
  | "DATOS_FALTANTES";

/** D-015: flujo de la conversación (listas cerradas; lo aplica la máquina de estados). */
export type FlowProcess = "PORTABILIDAD" | "MIGRACION" | "LINEA_NUEVA";
export type MenuLetter = "A" | "B" | "C" | "D";
export type MenuAction = FlowProcess | "PREGUNTAR_NECESIDAD";
export type ProfileField = "currentOperator" | "usage";
export type OutOfScopeStage = "MENU" | "PERFIL" | "OFERTA" | "OBJECIONES";
export type OutOfScopeAction = "SOPORTE" | "ESCALAR";
export type ImageOrder = "PROPIAS_PRIMERO" | "PRECIO" | "CARGA";
export type SharedImageMode = "CON_LAS_DEMAS" | "SI_PIDE_PLATAFORMA";
export type SaleDataField = "DOCUMENTO" | "NOMBRE" | "CORREO" | "CELULAR";

export interface AgentFlow {
  menu: { letter: MenuLetter; text: string; action: MenuAction }[];
  processes: Record<
    FlowProcess,
    {
      asks: ProfileField[];
      firstTemplate: string | null;
      imageOrder: ImageOrder;
      sharedImages: SharedImageMode;
    }
  >;
  outOfScope: Record<OutOfScopeStage, OutOfScopeAction>;
  /** Datos del cliente que deben estar antes de pasar la venta al backoffice. */
  saleData: SaleDataField[];
  /** Segundos que el robot espera en silencio a que el cliente termine de mandar sus datos. */
  saleDataWaitSeconds: number;
}

export interface AgentTemplate {
  id: string;
  group: string;
  title: string;
  role: TemplateRole;
  /** Para RESPUESTA: cuándo usarla (lo lee el modelo). */
  when: string;
  /** Texto exacto; variables {nombre_agente}, {nombre_cliente}, {fecha}. */
  text: string;
}

export interface ReactivationConfig {
  minutes: number;
  max: number;
}

export interface AgentFields {
  agentName: string;
  companyName: string;
  companyInfo: string;
  welcome: string;
  prompt: string;
  model: string | null;
  temperature: number;
  /** D-013 */
  templates: AgentTemplate[];
  reactivation: ReactivationConfig;
  /** D-015 (un servidor anterior no lo manda). */
  flow?: AgentFlow;
}

export interface EvalSummary {
  provider?: string;
  model?: string | null;
  cases?: number;
  passed?: number;
  invented?: number;
  p50?: number;
  p95?: number;
  regenRate?: string;
  fallbackRate?: string;
  problems?: string[];
  failedCases?: {
    id: string;
    group?: string;
    failures: string[];
    transcript?: { role: "cliente" | "bot"; text: string }[];
  }[];
  startedAt?: string;
  finishedAt?: string;
  /** D-004: avance mientras evalúa. */
  progress?: { done: number; total: number | null };
  verdict?: EvalVerdict;
}

/** D-004: resultado de evaluar una versión (evidencia, D-005). null = sin evaluar; RUNNING = evaluando. */
export type EvalVerdict =
  "OK" | "WARN" | "BLOCKED" | "ERROR" | "CANCELLED" | "RUNNING";

export interface AgentVersionInfo {
  id: string;
  version: number;
  status: AgentStatus;
  agentName: string;
  model: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedBy: string | null;
  publishedAt: string | null;
  evalSummary: EvalSummary | null;
  /** D-004 */
  evalVerdict: EvalVerdict | null;
  evaluatedAt: string | null;
  changeNote: string | null;
  publishReason: string | null;
  appliedToOpen: boolean;
  /** Solo en el historial: conversaciones reales atendidas y pruebas guardadas. */
  conversations?: number;
  tests?: number;
}

export type AgentVersion = AgentVersionInfo & AgentFields;

/** D-004: prueba de «Probar agente» guardada en el historial de una versión. */
export interface AgentTestRecord {
  id: string;
  versionId: string | null;
  version: number | null;
  source: "editor" | "published";
  note: string | null;
  transcript: { role: "customer" | "bot" | "event"; text: string }[];
  finalStage: string;
  createdBy: string;
  createdAt: string;
}

export interface PublishResult {
  version: number;
  status: AgentStatus;
  /** Resultado que tenía al publicarse (D-005: no frena la publicación). */
  verdict: EvalVerdict | null;
  applyToOpen: boolean;
  openConversations: number;
  /** D-005: qué pasó con la evaluación de evidencia después de publicar. */
  evaluation?:
    "STARTED" | "RUNNING" | "DONE" | "SKIPPED" | "UNAVAILABLE" | "FAILED";
  evaluationBlocker?: string | null;
}

export interface AgentPlan {
  code: string;
  process: string;
  name: string;
  dataGb: number;
  priceCop: number;
  benefits: string[];
  discountText: string | null;
  validTo: string | null;
}

export interface AgentOverview {
  /** Sin versiones en la base: la v1 del código (`builtIn`). */
  published: AgentFields & {
    version: number;
    status: AgentStatus;
    builtIn?: boolean;
  } & Partial<AgentVersionInfo>;
  working: AgentVersion | null;
  systemRules: string;
  menuOptions: string;
  stages: string[];
  limits: {
    agentName: number;
    companyName: number;
    companyInfo: number;
    welcome: number;
    prompt: number;
    temperatureMin: number;
    temperatureMax: number;
  };
  /** D-013 */
  templateLimits?: {
    count: number;
    id: number;
    group: number;
    title: number;
    when: number;
    text: number;
    reactivationMinutesMin: number;
    reactivationMinutesMax: number;
    reactivationMaxMax: number;
  };
  templateRoles?: TemplateRole[];
  templateVariables?: string[];
  /** D-015 */
  systemTemplateRoles?: TemplateRole[];
  flowOptions?: {
    menuLetters: MenuLetter[];
    menuActions: MenuAction[];
    processes: FlowProcess[];
    profileFields: ProfileField[];
    outOfScopeStages: OutOfScopeStage[];
    outOfScopeActions: OutOfScopeAction[];
    imageOrders: ImageOrder[];
    limits: { menuText: number };
    defaultFlow: AgentFlow;
  };
  provider: string;
  canPublish: boolean;
  publishBlocker: string | null;
  /** D-005: evaluar (evidencia) requiere un LLM real con API key. */
  canEvaluate?: boolean;
  evaluateBlocker?: string | null;
  temperatureApplies: boolean;
  defaultModel: string | null;
  models: string[];
  catalog: AgentPlan[];
}

export interface AgentTestState {
  stage: string;
  /** Datos del perfil (texto) y marcas del flujo (sí/no, D-003): se devuelven en cada turno. */
  profile: Record<string, string | boolean>;
  history: { role: "customer" | "bot"; text: string }[];
}

export interface AgentTestResult {
  stage: string;
  profile: Record<string, string | boolean>;
  replies: string[];
  events: string[];
  validation: string;
  llm: {
    provider: string;
    model: string;
    latencyMs: number;
    validationResult: string;
  }[];
  /** D-010: lo que el servidor entendió de la nota de voz de prueba. */
  heard?: {
    status: Exclude<TranscriptStatus, "PENDING">;
    transcript: string;
    model: string | null;
    latencyMs: number | null;
  };
  /** Texto del cliente tal como debe ir en el historial del turno siguiente. */
  customerText?: string;
  /**
   * D-011: imágenes de planes que enviaría el agente, cada una después de `afterReply`
   * mensajes de texto del turno. En Abaya el robot las pega con su texto (D-014, SEND_PLAN_IMAGES).
   */
  images?: AgentTestImage[];
}

export interface AgentTestImage {
  afterReply: number;
  brainId: string;
  version: number;
  imageId: string;
  sourceName: string;
  caption: string | null;
  /** Planes del catálogo que muestra. */
  codes: string[];
}

/* ───── Consumo de los modelos: /admin/usage ───── */

export type UsageUse =
  "CHAT" | "VOICE" | "IMAGE_READ" | "EMBEDDING" | "EVAL" | "TEST";

export interface UsageTotals {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  /** null: algún modelo del grupo no tiene tarifa configurada. */
  costUsd: number | null;
  /** Incluye tokens aproximados (embeddings). */
  estimated: boolean;
}

export interface UsageSummary {
  range: string;
  from: string;
  to: string;
  totals: UsageTotals;
  byKind: (UsageTotals & { kind: UsageUse })[];
  byModel: (UsageTotals & {
    provider: string;
    model: string;
    priced: boolean;
  })[];
  /** `day` = AAAA-MM-DD (día de Bogotá). */
  byDay: { day: string; kind: UsageUse; tokens: number; calls: number }[];
  conversations: { count: number; avgTokens: number | null };
  sales: { count: number; avgTokens: number | null };
  prices: { configured: boolean; models: string[] };
}

export interface AgentIssue {
  field: keyof AgentFields;
  /** D-013: plantilla con el problema (field = templates). */
  templateId?: string;
  line?: number;
  message: string;
}

// ---------- Brains (v1.9, /admin/knowledge, D-001 de RobotRPA) ----------

export type KnowledgeUse = "CATALOG" | "FULL_CONTEXT" | "SEARCH" | "IMAGE";
export type SourceKind = "FILE" | "TEXT" | "WEB";
export type SourceStatus = "PROCESSING" | "READY" | "ERROR";
export type SaleProcess = "PORTABILIDAD" | "MIGRACION" | "LINEA_NUEVA";

export interface SourceIssue {
  row?: number;
  column?: string;
  message: string;
}

/** D-011: un plan leído de una imagen de planes. */
export interface PlanImageCard {
  code: string | null;
  dataText: string;
  priceCop: number;
  /** D-014: el resto de la tarjeta, tal como se leyó (null = no aparece). */
  sharedDataText?: string | null;
  includesText?: string | null;
  unlimitedAppsText?: string | null;
  callsText?: string | null;
}

/** D-011: lo leído de una imagen y su validación contra el catálogo del Brain. */
export interface SourceImageInfo {
  processes: SaleProcess[];
  /** D-014: circular de apps de video (aplica a todos los procesos). */
  videoApps?: boolean;
  /** null = todavía no se ha leído. */
  cards: PlanImageCard[] | null;
  model: string | null;
  /** Códigos del catálogo que muestra, por proceso. */
  codes: Partial<Record<SaleProcess, string[]>>;
  problems: string[];
}

export interface KnowledgeSource {
  id: string;
  kind: SourceKind;
  use: KnowledgeUse;
  name: string;
  mime: string | null;
  url: string | null;
  refreshHours: number | null;
  /** D-016: en imágenes, `descuento_<PROCESO>` con el descuento de sus planes en ese proceso. */
  metadata: { proceso?: SaleProcess; [key: string]: string | undefined } | null;
  sizeBytes: number;
  contentHash: string;
  status: SourceStatus;
  errorReason: string | null;
  issues: SourceIssue[] | null;
  lastIngestedAt: string | null;
  createdBy: string;
  createdAt: string;
  chunks: number;
  /** Solo en fuentes de uso IMAGE (D-011). */
  image?: SourceImageInfo;
}

export interface CatalogFieldChange {
  field: string;
  label: string;
  before: string | number | null;
  after: string | number | null;
}

export interface BrainDiff {
  added: { code: string; process: SaleProcess; name: string }[];
  removed: { code: string; process: SaleProcess; name: string }[];
  changed: {
    code: string;
    process: SaleProcess;
    name: string;
    changes: CatalogFieldChange[];
  }[];
  unchanged: number;
  documents?: {
    added: { source: string; use: KnowledgeUse; chunks: number }[];
    removed: { source: string; use: KnowledgeUse; chunks: number }[];
    changed: {
      source: string;
      use: KnowledgeUse;
      chunksBefore: number;
      chunksAfter: number;
    }[];
  };
  /** D-011: imágenes de planes agregadas, quitadas o cambiadas. */
  images?: {
    added: { source: string; processes: SaleProcess[] }[];
    removed: { source: string; processes: SaleProcess[] }[];
    changed: { source: string; processes: SaleProcess[] }[];
  };
}

export interface BrainVersionSummary {
  id: string;
  version: number;
  status: AgentStatus;
  basedOn: number | null;
  diff: BrainDiff | null;
  evalSummary: EvalSummary | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedBy: string | null;
  publishedAt: string | null;
  /** Cantidad de planes del catálogo. */
  records: number;
  /** Cantidad de fragmentos de documentos. */
  chunks: number;
  /** D-011: cantidad de imágenes de planes. */
  images?: number;
  changes: {
    added: number;
    removed: number;
    changed: number;
    documents: number;
    images?: number;
  } | null;
}

export interface BrainListItem {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  sources: number;
  uses: KnowledgeUse[];
  processing: number;
  errors: number;
  agents: string[];
  published: BrainVersionSummary | null;
  working: BrainVersionSummary | null;
}

export interface BrainDetail {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  agents: { agentKey: string; connectedBy: string; connectedAt: string }[];
  sources: KnowledgeSource[];
  versions: BrainVersionSummary[];
  limits: {
    catalogMaxBytes: number;
    documentMaxBytes: number;
    textMaxChars: number;
    imageMaxBytes?: number;
    imagesPerProcess?: number;
  };
}

export interface CatalogRecordRow {
  id: string;
  process: SaleProcess;
  code: string;
  title: string;
  name: string | null;
  dataText: string;
  sharedDataText: string | null;
  includesText: string | null;
  extrasText: string | null;
  unlimitedAppsText: string | null;
  callsText: string | null;
  priceCop: number;
  discountText: string | null;
  hash: string;
}

/** D-011: imagen de planes congelada en una versión. */
export interface VersionImageRow {
  id: string;
  sourceName: string;
  mime: string;
  sizeBytes: number;
  processes: SaleProcess[];
  /** D-014: circular de apps de video. */
  videoApps?: boolean;
  cards: PlanImageCard[];
  codes: Partial<Record<SaleProcess, string[]>>;
  problems: string[];
}

/** Vista previa de una versión: aquí `records` es la lista de planes, no el conteo. */
export type BrainVersionDetail = Omit<
  BrainVersionSummary,
  "records" | "images"
> & {
  records: CatalogRecordRow[];
  documents: {
    source: string;
    use: KnowledgeUse;
    chunks: number;
    tokens: number;
    preview: string[];
  }[];
  images?: VersionImageRow[];
  /** Problemas de las imágenes contra el catálogo: con alguno no se puede publicar. */
  imageProblems?: string[];
};

export type BrainTestResult =
  | {
      version: number;
      mode: "catalog";
      status: "OK" | "SIN_PLANES";
      process: SaleProcess;
      plans: CatalogRecordRow[];
    }
  | {
      version: number;
      mode: "documents";
      question: string;
      blocks: {
        kind: "FULL_CONTEXT" | "SEARCH";
        chunkId: string;
        sourceName: string;
        text: string;
      }[];
    };

export interface NewSourceOptions {
  use: KnowledgeUse;
  proceso?: SaleProcess | "";
  /** D-011: procesos de una imagen de planes (uno o varios). */
  procesos?: SaleProcess[];
  /** D-014: la imagen es la circular de apps de video (se envía en los tres procesos). */
  appsVideo?: boolean;
  /** D-016: descuento de los planes de la imagen en cada proceso (comentario opcional). */
  descuentos?: ImageDiscounts;
}

/** D-016: descuento por proceso de una imagen de planes (p. ej. «✅Descuento del 25%…»). */
export type ImageDiscounts = Partial<Record<SaleProcess, string>>;

/** D-016: descuentos guardados en el metadato de una imagen. */
export const imageDiscounts = (s: Pick<KnowledgeSource, "metadata">): ImageDiscounts =>
  Object.fromEntries(
    Object.entries(s.metadata ?? {})
      .filter(([k, v]) => k.startsWith("descuento_") && !!v?.trim())
      .map(([k, v]) => [k.slice("descuento_".length), v!]),
  ) as ImageDiscounts;

/** D-011: dirección de una imagen (mismo origen; la cookie de sesión la autoriza). */
export const imageUrls = {
  source: (brainId: string, sourceId: string) =>
    `/admin/knowledge/brains/${enc(brainId)}/sources/${enc(sourceId)}/image`,
  version: (brainId: string, version: number, imageId: string) =>
    `/admin/knowledge/brains/${enc(brainId)}/versions/${version}/images/${enc(imageId)}`,
};

/* ───── Trazabilidad (D-002): /admin/conversations ───── */

export type TraceRange = "hoy" | "7d" | "30d" | "custom";

export interface ConversationFilters {
  range: TraceRange;
  /** AAAA-MM-DD (día de Bogotá), solo con range = custom. */
  from?: string;
  to?: string;
  robots?: string[];
  tipificaciones?: Tipificacion[];
  procesos?: Proceso[];
  etapasFinales?: Etapa[];
  pasoPorRevision?: boolean;
  /** D-004: versión del guion. */
  version?: number;
  /** Id del chat de Abaya, nombre del cliente o texto de los mensajes (rango ≤ 30 días). */
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface ConversationListItem {
  id: string;
  createdAt: string;
  /** Fin: null mientras sigue abierta. */
  updatedAt: string | null;
  closed: boolean;
  robotUser: string;
  abayaChatId: string;
  customerName: string | null;
  status: Tipificacion;
  stage: string;
  process: Proceso | null;
  planCode: string | null;
  inbound: number;
  outbound: number;
  firstResponseMs: number | null;
  durationMs: number | null;
  flags: TraceFlag[];
  /** El contenido se borró por retención. */
  contentPurged: boolean;
  /** D-004: versión del guion con la que se atendió (null = antes de fijar versiones). */
  agentVersion: number | null;
}

export interface ConversationKpis {
  total: number;
  sales: number;
  conversionPct: number;
  firstResponseP50Ms: number | null;
  firstResponseP95Ms: number | null;
  avgDurationMs: number | null;
  byTipificacion: Partial<Record<Tipificacion, number>>;
}

export interface ConversationListResponse {
  items: ConversationListItem[];
  total: number;
  offset: number;
  nextCursor: string | null;
  prevCursor: string | null;
  kpis: ConversationKpis;
  /** CONVERSATION_RETENTION_DAYS; null = sin plazo definido. */
  retentionDays: number | null;
}

export interface TraceMessage {
  id: string;
  from: "client" | "bot";
  text: string;
  sentAt: string;
  delivery?: { status: DeliveryStatus; attempts: number };
  /** Desde que llegó la ráfaga del cliente hasta que Abaya confirmó el envío. */
  responseMs?: number | null;
  /** D-010: nota de voz del cliente; `text` es su transcripción. El audio no se guarda. */
  media?: TraceMedia | null;
  /** D-014: imagen de planes enviada; `text` es su pie de foto. null = la versión ya no existe. */
  image?: TraceImage | null;
}
export interface TraceImage {
  id: string;
  sourceName: string;
  brainId: string;
  version: number;
}
export type TranscriptStatus =
  "PENDING" | "OK" | "UNINTELLIGIBLE" | "TOO_LONG" | "FAILED";
export interface TraceMedia {
  kind: "AUDIO";
  durationSec: number | null;
  transcriptStatus: TranscriptStatus;
  transcriptMs: number | null;
}
export interface TraceEvent {
  at: string;
  kind: TraceEventKind;
  detail?: string;
}
export interface LlmCallRow {
  at: string;
  stage: string;
  provider: string;
  model: string;
  latencyMs: number;
  tokens: number;
  result: LlmResult;
}
export interface RpaActionRow {
  at: string;
  action: string;
  result: string;
  durationMs: number;
  traceRef: string | null;
}

export interface ConversationDetail extends ConversationListItem {
  contentPurgedAt: string | null;
  /** Recorrido aproximado (etapas de las llamadas al modelo + la final), con retrocesos. */
  stagePath: string[];
  messages: TraceMessage[];
  events: TraceEvent[];
  profile: {
    name: string | null;
    currentOperator: string | null;
    declaredUse: string | null;
    process: Proceso | null;
  };
  sale: {
    planCode: string;
    backofficeSummary: string | null;
    transferredAt: string | null;
    internalNoteOk: boolean;
  } | null;
  consent: {
    answer: string | null;
    at: string;
    legalTemplateVersion: string;
    hash: string;
    chainVerified: boolean;
  } | null;
  brainVersion: string | null;
  knowledgeUsage: { at: string; planCode: string; priceShown: number | null }[];
  llmCalls: LlmCallRow[];
  rpaActions: RpaActionRow[];
  /** Posición en el filtro (solo si se pidió con los filtros de la lista). */
  nav: {
    index: number;
    total: number;
    prevId: string | null;
    nextId: string | null;
  } | null;
}

export interface RobotPerformanceRow {
  robotUser: string;
  hostname: string | null;
  total: number;
  byTipificacion: Partial<Record<Tipificacion, number>>;
  sales: number;
  conversionPct: number;
  firstResponseP95Ms: number | null;
  uncertainSends: number;
  regenerations: number;
}
export interface RobotPerformanceResponse {
  rows: RobotPerformanceRow[];
  total: number;
}

/** El texto de los mensajes está cifrado: el servidor solo busca dentro en rangos ≤ 30 días. */
export const TEXT_SEARCH_MAX_DAYS = 30;

/** Filtros → query string de /admin/conversations (arrays separados por coma). */
export function conversationQuery(f: ConversationFilters): string {
  const p = new URLSearchParams();
  p.set("range", f.range);
  if (f.range === "custom") {
    if (f.from) p.set("from", f.from);
    if (f.to) p.set("to", f.to);
  }
  if (f.robots?.length) p.set("robot", f.robots.join(","));
  if (f.tipificaciones?.length) p.set("status", f.tipificaciones.join(","));
  if (f.procesos?.length) p.set("process", f.procesos.join(","));
  if (f.etapasFinales?.length) p.set("stage", f.etapasFinales.join(","));
  if (f.pasoPorRevision != null) p.set("reviewed", String(f.pasoPorRevision));
  if (f.version) p.set("version", String(f.version));
  if (f.q?.trim()) p.set("q", f.q.trim());
  if (f.cursor) p.set("cursor", f.cursor);
  p.set("limit", String(f.limit ?? 25));
  return p.toString();
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    /** Problemas de revisión de la configuración del agente (400). */
    readonly issues?: AgentIssue[],
  ) {
    super(message);
  }
}

/** Mensaje para la persona: el del servidor si es un error de la petición (4xx), si no el genérico. */
export const errorMessage = (err: unknown, fallback: string) =>
  err instanceof ApiError && err.status < 500 && err.status !== 401
    ? err.message
    : fallback;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        "x-requested-with": "abaya-panel",
      },
    });
  } catch {
    throw new ApiError(0, "No hay conexión con el servidor del robot.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: unknown;
      code?: string;
      issues?: AgentIssue[];
    };
    const message = Array.isArray(body.message)
      ? body.message.join(". ")
      : body.message;
    throw new ApiError(
      res.status,
      typeof message === "string" ? message : `HTTP ${res.status}`,
      body.code,
      Array.isArray(body.issues) ? body.issues : undefined,
    );
  }
  return (await res.json()) as T;
}

const send = (body: unknown, method = "POST"): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

/**
 * Subida de archivos. Multipart: sin content-type, el navegador pone el límite del formulario.
 * Binario (Blob, p. ej. una nota de voz): va tal cual con su tipo.
 */
async function upload<T>(path: string, body: FormData | Blob): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      body,
      credentials: "same-origin",
      headers: {
        "x-requested-with": "abaya-panel",
        ...(body instanceof Blob
          ? { "content-type": body.type || "application/octet-stream" }
          : {}),
      },
    });
  } catch {
    throw new ApiError(0, "No hay conexión con el servidor del robot.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: unknown };
    const message = Array.isArray(body.message)
      ? body.message.join(". ")
      : body.message;
    throw new ApiError(
      res.status,
      typeof message === "string" ? message : `HTTP ${res.status}`,
    );
  }
  return (await res.json()) as T;
}
const enc = encodeURIComponent;

export const api = {
  login: (username: string, password: string) =>
    request<Me>("/admin/auth/login", send({ username, password })),
  logout: () => request<{ ok: true }>("/admin/auth/logout", send({})),
  me: () => request<Me>("/admin/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>(
      "/admin/auth/password",
      send({ currentPassword, newPassword }),
    ),

  overview: () => request<Overview>("/admin/overview"),
  usage: (range: Range) =>
    request<UsageSummary>(`/admin/usage?range=${enc(range)}`),
  review: () => request<ReviewQueue>("/admin/review"),
  audit: () => request<AuditEntry[]>("/admin/audit"),
  setKillSwitch: (active: boolean) =>
    request<{ killSwitch: boolean }>("/admin/kill-switch", send({ active })),
  resetSession: (robotUser: string) =>
    request<{ reset: boolean; note: string }>(
      `/admin/sessions/${enc(robotUser)}/reset`,
      send({}),
    ),

  users: () => request<PanelUser[]>("/admin/users"),
  createUser: (username: string, role: Role) =>
    request<TemporaryPassword>("/admin/users", send({ username, role })),
  updateUser: (
    id: string,
    patch: { role?: Role; active?: boolean; knowledgePublisher?: boolean },
  ) => request<PanelUser>(`/admin/users/${enc(id)}`, send(patch, "PATCH")),
  resetPassword: (id: string) =>
    request<TemporaryPassword>(
      `/admin/users/${enc(id)}/reset-password`,
      send({}),
    ),

  robots: (range: Range) => request<RobotList>(`/admin/robots?rango=${range}`),
  robot: (robotUser: string, range: Range) =>
    request<RobotDetail>(`/admin/robots/${enc(robotUser)}?rango=${range}`),
  createRobot: (robotUser: string, creds: RobotCredentials) =>
    request<EnrollmentCode>("/admin/robots", send({ robotUser, ...creds })),
  robotCredentials: (robotUser: string, creds: RobotCredentials) =>
    request<{ ok: true; note: string }>(
      `/admin/robots/${enc(robotUser)}/credentials`,
      send(creds, "PATCH"),
    ),
  enrollmentCode: (robotUser: string) =>
    request<EnrollmentCode>(
      `/admin/robots/${enc(robotUser)}/enrollment-code`,
      send({}),
    ),
  robotTraces: (robotUser: string) =>
    request<RobotTrace[]>(`/admin/robots/${enc(robotUser)}/traces`),
  updateRobot: (robotUser: string) =>
    request<{ version: string }>(
      `/admin/robots/${enc(robotUser)}/update`,
      send({}),
    ),
  cancelUpdate: (robotUser: string) =>
    request<{ cancelled: boolean }>(
      `/admin/robots/${enc(robotUser)}/update/cancel`,
      send({}),
    ),
  updateAll: () =>
    request<{ version: string; robots: number }>(
      "/admin/robots/update-all",
      send({}),
    ),
  pauseRobot: (robotUser: string, paused: boolean) =>
    request<{ paused: boolean }>(
      `/admin/robots/${enc(robotUser)}/pause`,
      send({ paused }),
    ),
  enableRobot: (robotUser: string, enabled: boolean) =>
    request<{ enabled: boolean; note?: string }>(
      `/admin/robots/${enc(robotUser)}/enabled`,
      send({ enabled }),
    ),

  agent: () => request<AgentOverview>("/admin/agent"),
  agentVersions: () => request<AgentVersionInfo[]>("/admin/agent/versions"),
  agentVersion: (id: string) =>
    request<AgentVersion>(`/admin/agent/versions/${enc(id)}`),
  reviewAgent: (fields: AgentFields) =>
    request<{ issues: AgentIssue[] }>("/admin/agent/review", send(fields)),
  /** D-004: con `evaluate` se lanza la suite sobre lo guardado (y se cancela la que estuviera en curso). */
  saveAgentDraft: (
    fields: AgentFields,
    opts: { evaluate?: boolean; changeNote?: string } = {},
  ) =>
    request<AgentVersion>(
      "/admin/agent/draft",
      send({ ...fields, ...opts }, "PUT"),
    ),
  evaluateAgentVersion: (id: string) =>
    request<AgentVersion>(
      `/admin/agent/versions/${enc(id)}/evaluate`,
      send({}),
    ),
  /** D-004: publica al instante una versión evaluada (OK, o WARN con motivo). */
  publishAgent: (
    opts: {
      versionId?: string;
      reason?: string;
      applyToOpen?: boolean;
      evaluate?: boolean;
    } = {},
  ) => request<PublishResult>("/admin/agent/draft/publish", send(opts)),
  agentTests: (versionId: string) =>
    request<AgentTestRecord[]>(`/admin/agent/versions/${enc(versionId)}/tests`),
  /** Pruebas guardadas sin versión (el editor tenía cambios sin guardar al probar). */
  unversionedAgentTests: () =>
    request<AgentTestRecord[]>("/admin/agent/tests/unversioned"),
  /** Todas las pruebas guardadas (las más recientes primero), con su versión. */
  recentAgentTests: () =>
    request<AgentTestRecord[]>("/admin/agent/tests/recent"),
  saveAgentTest: (body: {
    versionId?: string;
    source: "editor" | "published";
    transcript: AgentTestRecord["transcript"];
    finalStage: string;
    note?: string;
  }) => request<AgentTestRecord>("/admin/agent/tests", send(body)),
  testAgent: (body: {
    source: "editor" | "published";
    fields?: AgentFields;
    state: AgentTestState;
    message?: string;
    /** D-010: nota de voz subida antes con `uploadTestAudio` (un solo uso). */
    audioId?: string;
    /** D-017: el robot abre la conversación (saludo con el menú) sin mensaje del cliente. */
    opening?: true;
  }) => request<AgentTestResult>("/admin/agent/test", send(body)),
  /** D-010: sube la nota de voz de prueba; la transcribe el servidor con el proveedor real. */
  uploadTestAudio: (audio: Blob, durationSec: number | null) =>
    upload<{ audioId: string; durationSec: number | null }>(
      `/admin/agent/test/audio${durationSec !== null ? `?durationSec=${Math.round(durationSec)}` : ""}`,
      audio,
    ),
  /** D-019: una versión como archivo («abaya-agente») para llevarla a otro ambiente. */
  exportAgentVersion: (id: string) =>
    request<unknown>(`/admin/agent/versions/${enc(id)}/export`),
  /** D-019: importa un archivo exportado como borrador (misma revisión que guardar). */
  importAgentVersion: (file: File) => {
    const form = new FormData();
    form.append("file", file, file.name);
    return upload<AgentVersion & { modelReset?: boolean }>("/admin/agent/import", form);
  },
  restoreAgentVersion: (id: string) =>
    request<AgentVersion>(`/admin/agent/versions/${enc(id)}/restore`, send({})),

  // Brains (v1.9)
  brains: () => request<BrainListItem[]>("/admin/knowledge/brains"),
  brain: (id: string) =>
    request<BrainDetail>(`/admin/knowledge/brains/${enc(id)}`),
  createBrain: (name: string) =>
    request<{ id: string; name: string }>(
      "/admin/knowledge/brains",
      send({ name }),
    ),
  deleteBrain: (id: string) =>
    request<{ ok: true }>(`/admin/knowledge/brains/${enc(id)}`, {
      method: "DELETE",
    }),
  addFileSource: (id: string, file: File, o: NewSourceOptions) => {
    const form = new FormData();
    form.append("use", o.use);
    if (o.proceso) form.append("proceso", o.proceso);
    if (o.procesos?.length) form.append("procesos", o.procesos.join(","));
    if (o.appsVideo) form.append("appsVideo", "true");
    for (const [p, text] of Object.entries(o.descuentos ?? {}))
      if (text?.trim()) form.append(`descuento_${p}`, text.trim());
    form.append("file", file, file.name);
    return upload<KnowledgeSource>(
      `/admin/knowledge/brains/${enc(id)}/sources`,
      form,
    );
  },
  addTextSource: (
    id: string,
    body: NewSourceOptions & { name: string; text: string },
  ) =>
    request<KnowledgeSource>(
      `/admin/knowledge/brains/${enc(id)}/sources/text`,
      send(body),
    ),
  addWebSource: (
    id: string,
    body: NewSourceOptions & { url: string; refreshHours: number | null },
  ) =>
    request<KnowledgeSource>(
      `/admin/knowledge/brains/${enc(id)}/sources/web`,
      send(body),
    ),
  /** D-019: el Brain con sus fuentes como archivo («abaya-brain»). */
  exportBrain: (id: string) => request<unknown>(`/admin/knowledge/brains/${enc(id)}/export`),
  /** D-019: importa un Brain exportado como Brain nuevo (borrador). */
  importBrain: (file: File, nombre?: string) => {
    const form = new FormData();
    if (nombre?.trim()) form.append("nombre", nombre.trim());
    form.append("file", file, file.name);
    return upload<{ id: string; name: string; sources: number; draftVersion: number | null }>(
      "/admin/knowledge/brains/import",
      form,
    );
  },
  removeSource: (id: string, sourceId: string) =>
    request<{ draftVersion: number | null }>(
      `/admin/knowledge/brains/${enc(id)}/sources/${enc(sourceId)}`,
      {
        method: "DELETE",
      },
    ),
  /** D-016: procesos y descuentos de una imagen ya cargada (no se vuelve a leer). */
  updateImageSource: (
    id: string,
    sourceId: string,
    body: { procesos: SaleProcess[]; descuentos: ImageDiscounts },
  ) =>
    request<{ draftVersion: number | null }>(
      `/admin/knowledge/brains/${enc(id)}/sources/${enc(sourceId)}/image`,
      send({ ...body, procesos: body.procesos.join(",") }, "PATCH"),
    ),
  reprocessSource: (id: string, sourceId: string) =>
    request<{ ok: true }>(
      `/admin/knowledge/brains/${enc(id)}/sources/${enc(sourceId)}/reprocess`,
      send({}),
    ),
  brainVersion: (id: string, version: number, process?: SaleProcess) =>
    request<BrainVersionDetail>(
      `/admin/knowledge/brains/${enc(id)}/versions/${version}${process ? `?process=${process}` : ""}`,
    ),
  publishBrain: (id: string) =>
    request<{ version: number; status: AgentStatus; diff: BrainDiff }>(
      `/admin/knowledge/brains/${enc(id)}/draft/publish`,
      send({}),
    ),
  restoreBrainVersion: (id: string, version: number) =>
    request<{ version: number }>(
      `/admin/knowledge/brains/${enc(id)}/versions/${version}/restore`,
      send({}),
    ),
  testBrain: (
    id: string,
    body: { process?: SaleProcess; question?: string; version?: "draft" },
  ) =>
    request<BrainTestResult>(
      `/admin/knowledge/brains/${enc(id)}/test`,
      send(body),
    ),
  agentBrains: () =>
    request<
      { id: string; name: string; connectedBy: string; connectedAt: string }[]
    >("/admin/knowledge/agents/default/brains"),
  connectBrain: (brainId: string) =>
    request<{ ok: true }>(
      `/admin/knowledge/agents/default/brains/${enc(brainId)}`,
      { method: "PUT" },
    ),
  disconnectBrain: (brainId: string) =>
    request<{ ok: true }>(
      `/admin/knowledge/agents/default/brains/${enc(brainId)}`,
      { method: "DELETE" },
    ),

  // Trazabilidad (D-002). Abrir un detalle o exportar queda en Auditoría (lo escribe el servidor).
  conversations: (f: ConversationFilters) =>
    request<ConversationListResponse>(
      `/admin/conversations?${conversationQuery(f)}`,
    ),
  conversationStats: (f: ConversationFilters) =>
    request<RobotPerformanceResponse>(
      `/admin/conversations/stats?${conversationQuery(f)}`,
    ),
  /** `ref` = id interno o id del chat de Abaya. Con filtros devuelve `nav` (anterior/siguiente). */
  conversation: (ref: string, f?: ConversationFilters) =>
    request<ConversationDetail>(
      `/admin/conversations/${enc(ref)}${f ? `?${conversationQuery(f)}` : ""}`,
    ),
};

/** Descargas directas (el navegador manda la cookie de sesión). */
export const urls = {
  robotPackage: "/admin/robots/package",
  trace: (robotUser: string, ref: string) =>
    `/admin/robots/${enc(robotUser)}/traces/${enc(ref)}`,
  /** CSV del filtro, sin el texto de los mensajes. */
  conversationsCsv: (f: ConversationFilters) =>
    `/admin/conversations/export?${conversationQuery({ ...f, cursor: undefined })}`,
  /** Transcripción completa de una conversación. */
  transcript: (id: string) => `/admin/conversations/export?id=${enc(id)}`,
};

/**
 * Descarga autenticada (cookie de sesión) que informa el error del servidor si falla; el archivo
 * se guarda con el nombre que manda el servidor.
 */
export async function download(
  path: string,
  fallbackName: string,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      headers: { "x-requested-with": "abaya-panel" },
    });
  } catch {
    throw new ApiError(0, "No hay conexión con el servidor del robot.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: unknown };
    throw new ApiError(
      res.status,
      typeof body.message === "string" ? body.message : `HTTP ${res.status}`,
    );
  }
  const name =
    /filename="([^"]+)"/.exec(
      res.headers.get("content-disposition") ?? "",
    )?.[1] ?? fallbackName;
  const href = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1_000);
}
