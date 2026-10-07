/**
 * Cliente de la API de administración del robot (apps/api de RobotRPA, rutas /admin/*).
 * Tipos tomados de lo que hoy entrega el servidor; la UI no inventa campos que no vienen.
 *
 * Sesión: cookie httpOnly (el panel nunca ve ni guarda el token). `x-requested-with` es la defensa
 * CSRF que exige la API en peticiones que cambian algo. En desarrollo Vite reenvía /admin al
 * servidor (ver vite.config.ts y .env.example).
 */
import type { Role } from './roles';

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
  sessions: Session[];
  conversations: { active: number; transferring: number; needsReview: number; byStatus: Record<string, number> };
  sales: { today: number; transferredToday: number };
  recentErrors: { robotUser: string; action: string; abayaChatId: string | null; result: string; createdAt: string }[];
}

export interface ReviewQueue {
  conversations: { id: string; abayaChatId: string; robotUser: string; stage: string; updatedAt: string }[];
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

export type RobotStatus = 'EN_LINEA' | 'RECONECTANDO' | 'CAIDO' | 'SIN_SENAL' | 'APAGADO' | 'DESHABILITADO';
export type Range = 'hoy' | '7d' | '30d';

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
  update: { requested: boolean; status: string; version: string | null; message: string | null; at: string | null } | null;
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
  response: { samples: number; p50Ms: number | null; p95Ms: number | null; maxMs: number | null };
  session: { status: string; lastHeartbeat: string; lastLoginAt: string | null; consecutiveFails: number } | null;
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
  recentActions: { createdAt: string; action: string; abayaChatId: string | null; result: string; durationMs: number }[];
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
  mfaMode?: 'none' | 'totp';
  totpSecret?: string;
}

// ---------- configuración del agente (v1.8) ----------

export type AgentStatus = 'DRAFT' | 'EVALUATING' | 'PUBLISHED' | 'ARCHIVED' | 'REJECTED';

export interface AgentFields {
  agentName: string;
  companyName: string;
  companyInfo: string;
  welcome: string;
  prompt: string;
  model: string | null;
  temperature: number;
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
  failedCases?: { id: string; failures: string[] }[];
  startedAt?: string;
  finishedAt?: string;
}

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
}

export type AgentVersion = AgentVersionInfo & AgentFields;

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
  published: AgentFields & { version: number; status: AgentStatus; builtIn?: boolean } & Partial<AgentVersionInfo>;
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
  provider: string;
  canPublish: boolean;
  publishBlocker: string | null;
  temperatureApplies: boolean;
  defaultModel: string | null;
  models: string[];
  catalog: AgentPlan[];
}

export interface AgentTestState {
  stage: string;
  profile: Record<string, string>;
  history: { role: 'customer' | 'bot'; text: string }[];
}

export interface AgentTestResult {
  stage: string;
  profile: Record<string, string>;
  replies: string[];
  events: string[];
  validation: string;
  llm: { provider: string; model: string; latencyMs: number; validationResult: string }[];
}

export interface AgentIssue {
  field: keyof AgentFields;
  line?: number;
  message: string;
}

// ---------- Brains (v1.9, /admin/knowledge, D-001 de RobotRPA) ----------

export type KnowledgeUse = 'CATALOG' | 'FULL_CONTEXT' | 'SEARCH';
export type SourceKind = 'FILE' | 'TEXT' | 'WEB';
export type SourceStatus = 'PROCESSING' | 'READY' | 'ERROR';
export type SaleProcess = 'PORTABILIDAD' | 'MIGRACION' | 'LINEA_NUEVA';

export interface SourceIssue {
  row?: number;
  column?: string;
  message: string;
}

export interface KnowledgeSource {
  id: string;
  kind: SourceKind;
  use: KnowledgeUse;
  name: string;
  mime: string | null;
  url: string | null;
  refreshHours: number | null;
  metadata: { proceso?: SaleProcess } | null;
  sizeBytes: number;
  contentHash: string;
  status: SourceStatus;
  errorReason: string | null;
  issues: SourceIssue[] | null;
  lastIngestedAt: string | null;
  createdBy: string;
  createdAt: string;
  chunks: number;
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
  changed: { code: string; process: SaleProcess; name: string; changes: CatalogFieldChange[] }[];
  unchanged: number;
  documents?: {
    added: { source: string; use: KnowledgeUse; chunks: number }[];
    removed: { source: string; use: KnowledgeUse; chunks: number }[];
    changed: { source: string; use: KnowledgeUse; chunksBefore: number; chunksAfter: number }[];
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
  changes: { added: number; removed: number; changed: number; documents: number } | null;
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
  limits: { catalogMaxBytes: number; documentMaxBytes: number; textMaxChars: number };
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

/** Vista previa de una versión: aquí `records` es la lista de planes, no el conteo. */
export type BrainVersionDetail = Omit<BrainVersionSummary, 'records'> & {
  records: CatalogRecordRow[];
  documents: { source: string; use: KnowledgeUse; chunks: number; tokens: number; preview: string[] }[];
};

export type BrainTestResult =
  | { version: number; mode: 'catalog'; status: 'OK' | 'SIN_PLANES'; process: SaleProcess; plans: CatalogRecordRow[] }
  | {
      version: number;
      mode: 'documents';
      question: string;
      blocks: { kind: 'FULL_CONTEXT' | 'SEARCH'; chunkId: string; sourceName: string; text: string }[];
    };

export interface NewSourceOptions {
  use: KnowledgeUse;
  proceso?: SaleProcess | '';
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
  err instanceof ApiError && err.status < 500 && err.status !== 401 ? err.message : fallback;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-requested-with': 'abaya-panel' },
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor del robot.');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: unknown; code?: string; issues?: AgentIssue[] };
    const message = Array.isArray(body.message) ? body.message.join('. ') : body.message;
    throw new ApiError(
      res.status,
      typeof message === 'string' ? message : `HTTP ${res.status}`,
      body.code,
      Array.isArray(body.issues) ? body.issues : undefined,
    );
  }
  return (await res.json()) as T;
}

const send = (body: unknown, method = 'POST'): RequestInit => ({ method, body: JSON.stringify(body) });

/** Subida de archivos (multipart): sin content-type, el navegador pone el límite del formulario. */
async function upload<T>(path: string, form: FormData): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      body: form,
      credentials: 'same-origin',
      headers: { 'x-requested-with': 'abaya-panel' },
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor del robot.');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: unknown };
    const message = Array.isArray(body.message) ? body.message.join('. ') : body.message;
    throw new ApiError(res.status, typeof message === 'string' ? message : `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
const enc = encodeURIComponent;

export const api = {
  login: (username: string, password: string) => request<Me>('/admin/auth/login', send({ username, password })),
  logout: () => request<{ ok: true }>('/admin/auth/logout', send({})),
  me: () => request<Me>('/admin/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>('/admin/auth/password', send({ currentPassword, newPassword })),

  overview: () => request<Overview>('/admin/overview'),
  review: () => request<ReviewQueue>('/admin/review'),
  audit: () => request<AuditEntry[]>('/admin/audit'),
  setKillSwitch: (active: boolean) => request<{ killSwitch: boolean }>('/admin/kill-switch', send({ active })),
  resetSession: (robotUser: string) =>
    request<{ reset: boolean; note: string }>(`/admin/sessions/${enc(robotUser)}/reset`, send({})),

  users: () => request<PanelUser[]>('/admin/users'),
  createUser: (username: string, role: Role) => request<TemporaryPassword>('/admin/users', send({ username, role })),
  updateUser: (id: string, patch: { role?: Role; active?: boolean; knowledgePublisher?: boolean }) =>
    request<PanelUser>(`/admin/users/${enc(id)}`, send(patch, 'PATCH')),
  resetPassword: (id: string) => request<TemporaryPassword>(`/admin/users/${enc(id)}/reset-password`, send({})),

  robots: (range: Range) => request<RobotList>(`/admin/robots?rango=${range}`),
  robot: (robotUser: string, range: Range) => request<RobotDetail>(`/admin/robots/${enc(robotUser)}?rango=${range}`),
  createRobot: (robotUser: string, creds: RobotCredentials) =>
    request<EnrollmentCode>('/admin/robots', send({ robotUser, ...creds })),
  robotCredentials: (robotUser: string, creds: RobotCredentials) =>
    request<{ ok: true; note: string }>(`/admin/robots/${enc(robotUser)}/credentials`, send(creds, 'PATCH')),
  enrollmentCode: (robotUser: string) =>
    request<EnrollmentCode>(`/admin/robots/${enc(robotUser)}/enrollment-code`, send({})),
  robotTraces: (robotUser: string) => request<RobotTrace[]>(`/admin/robots/${enc(robotUser)}/traces`),
  updateRobot: (robotUser: string) => request<{ version: string }>(`/admin/robots/${enc(robotUser)}/update`, send({})),
  cancelUpdate: (robotUser: string) =>
    request<{ cancelled: boolean }>(`/admin/robots/${enc(robotUser)}/update/cancel`, send({})),
  updateAll: () => request<{ version: string; robots: number }>('/admin/robots/update-all', send({})),
  pauseRobot: (robotUser: string, paused: boolean) =>
    request<{ paused: boolean }>(`/admin/robots/${enc(robotUser)}/pause`, send({ paused })),
  enableRobot: (robotUser: string, enabled: boolean) =>
    request<{ enabled: boolean; note?: string }>(`/admin/robots/${enc(robotUser)}/enabled`, send({ enabled })),

  agent: () => request<AgentOverview>('/admin/agent'),
  agentVersions: () => request<AgentVersionInfo[]>('/admin/agent/versions'),
  agentVersion: (id: string) => request<AgentVersion>(`/admin/agent/versions/${enc(id)}`),
  reviewAgent: (fields: AgentFields) => request<{ issues: AgentIssue[] }>('/admin/agent/review', send(fields)),
  saveAgentDraft: (fields: AgentFields) => request<AgentVersion>('/admin/agent/draft', send(fields, 'PUT')),
  publishAgent: () => request<{ version: number; status: AgentStatus }>('/admin/agent/draft/publish', send({})),
  testAgent: (body: {
    source: 'editor' | 'published';
    fields?: AgentFields;
    state: AgentTestState;
    message: string;
  }) => request<AgentTestResult>('/admin/agent/test', send(body)),
  restoreAgentVersion: (id: string) => request<AgentVersion>(`/admin/agent/versions/${enc(id)}/restore`, send({})),

  // Brains (v1.9)
  brains: () => request<BrainListItem[]>('/admin/knowledge/brains'),
  brain: (id: string) => request<BrainDetail>(`/admin/knowledge/brains/${enc(id)}`),
  createBrain: (name: string) => request<{ id: string; name: string }>('/admin/knowledge/brains', send({ name })),
  deleteBrain: (id: string) => request<{ ok: true }>(`/admin/knowledge/brains/${enc(id)}`, { method: 'DELETE' }),
  addFileSource: (id: string, file: File, o: NewSourceOptions) => {
    const form = new FormData();
    form.append('use', o.use);
    if (o.proceso) form.append('proceso', o.proceso);
    form.append('file', file, file.name);
    return upload<KnowledgeSource>(`/admin/knowledge/brains/${enc(id)}/sources`, form);
  },
  addTextSource: (id: string, body: NewSourceOptions & { name: string; text: string }) =>
    request<KnowledgeSource>(`/admin/knowledge/brains/${enc(id)}/sources/text`, send(body)),
  addWebSource: (id: string, body: NewSourceOptions & { url: string; refreshHours: number | null }) =>
    request<KnowledgeSource>(`/admin/knowledge/brains/${enc(id)}/sources/web`, send(body)),
  removeSource: (id: string, sourceId: string) =>
    request<{ draftVersion: number | null }>(`/admin/knowledge/brains/${enc(id)}/sources/${enc(sourceId)}`, {
      method: 'DELETE',
    }),
  reprocessSource: (id: string, sourceId: string) =>
    request<{ ok: true }>(`/admin/knowledge/brains/${enc(id)}/sources/${enc(sourceId)}/reprocess`, send({})),
  brainVersion: (id: string, version: number, process?: SaleProcess) =>
    request<BrainVersionDetail>(
      `/admin/knowledge/brains/${enc(id)}/versions/${version}${process ? `?process=${process}` : ''}`,
    ),
  publishBrain: (id: string) =>
    request<{ version: number; status: AgentStatus; diff: BrainDiff }>(
      `/admin/knowledge/brains/${enc(id)}/draft/publish`,
      send({}),
    ),
  restoreBrainVersion: (id: string, version: number) =>
    request<{ version: number }>(`/admin/knowledge/brains/${enc(id)}/versions/${version}/restore`, send({})),
  testBrain: (id: string, body: { process?: SaleProcess; question?: string; version?: 'draft' }) =>
    request<BrainTestResult>(`/admin/knowledge/brains/${enc(id)}/test`, send(body)),
  agentBrains: () =>
    request<{ id: string; name: string; connectedBy: string; connectedAt: string }[]>(
      '/admin/knowledge/agents/default/brains',
    ),
  connectBrain: (brainId: string) =>
    request<{ ok: true }>(`/admin/knowledge/agents/default/brains/${enc(brainId)}`, { method: 'PUT' }),
  disconnectBrain: (brainId: string) =>
    request<{ ok: true }>(`/admin/knowledge/agents/default/brains/${enc(brainId)}`, { method: 'DELETE' }),
};

/** Descargas directas (el navegador manda la cookie de sesión). */
export const urls = {
  robotPackage: '/admin/robots/package',
  trace: (robotUser: string, ref: string) => `/admin/robots/${enc(robotUser)}/traces/${enc(ref)}`,
};
