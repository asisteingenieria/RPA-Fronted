/** Insignias de estado del dominio. Siempre texto + color, nunca solo color. */
import { Badge, type Tone } from "./ui";

/* Versión del agente: Borrador · Evaluando… · Publicado · Rechazado · Archivado */
export type VersionState = "DRAFT" | "EVALUATING" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
const V: Record<VersionState, [Tone, string]> = {
  DRAFT: ["neutral", "Borrador"],
  EVALUATING: ["warning", "Evaluando…"],
  PUBLISHED: ["success", "Publicado"],
  REJECTED: ["danger", "Rechazado"],
  ARCHIVED: ["outline", "Archivado"],
};
/** Ajusta las claves a los valores reales que devuelve /admin/agent/versions. */
export function VersionStatus({ status }: { status: VersionState }) {
  const [tone, label] = V[status];
  return <Badge tone={tone} pulse={status === "EVALUATING"} dot={status !== "ARCHIVED"}>{label}</Badge>;
}

/* Robot por equipo: En línea · Reconectando · Caído · Sin señal · Apagado · Deshabilitado */
export type RobotStatus = "ONLINE" | "RECONNECTING" | "DOWN" | "NO_SIGNAL" | "OFF" | "DISABLED";
const R: Record<RobotStatus, [Tone, string, string]> = {
  ONLINE: ["success", "En línea", "Conectado y atendiendo chats"],
  RECONNECTING: ["warning", "Reconectando", "Volviendo a iniciar sesión en Abaya"],
  DOWN: ["danger", "Caído", "La sesión falló; requiere habilitar reintento"],
  NO_SIGNAL: ["neutral", "Sin señal", "No llega heartbeat del equipo"],
  OFF: ["neutral", "Apagado", "El equipo está apagado"],
  DISABLED: ["outline", "Deshabilitado", "Deshabilitado por un administrador"],
};
export function RobotState({ status }: { status: RobotStatus }) {
  const [tone, label, help] = R[status];
  return <Badge tone={tone} title={help} dot={status !== "DISABLED"}>{label}</Badge>;
}

/* Sesión de Abaya: ACTIVE / RELOGGING / PAUSED / DOWN (nombre en español + código) */
export type SessionStatus = "ACTIVE" | "RELOGGING" | "PAUSED" | "DOWN";
const S: Record<SessionStatus, [Tone, string]> = { ACTIVE: ["success", "Activa"], RELOGGING: ["warning", "Reingresando"], PAUSED: ["info", "Pausada"], DOWN: ["danger", "Caída"] };
export function SessionState({ status }: { status: SessionStatus }) {
  const [tone, label] = S[status];
  return (
    <Badge tone={tone}>
      {label}
      <span style={{ opacity: 0.7, fontWeight: 500 }}> · {status}</span>
    </Badge>
  );
}

/* Resultado de una acción del robot: OK / ERROR / UNCERTAIN / BLOCKED */
export function ActionResult({ result }: { result: "OK" | "ERROR" | "UNCERTAIN" | "BLOCKED" }) {
  const tone: Tone = result === "OK" ? "success" : result === "ERROR" ? "danger" : result === "UNCERTAIN" ? "warning" : "neutral";
  return <Badge tone={tone}>{result}</Badge>;
}

/* Usuario del panel: activo / inactivo / bloqueado hasta… */
export function UserStatus({ active, lockedUntil }: { active: boolean; lockedUntil?: string }) {
  if (lockedUntil) return <Badge tone="warning">Bloqueado hasta {lockedUntil}</Badge>;
  return active ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>;
}
