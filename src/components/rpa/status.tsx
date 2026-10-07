/** Insignias de estado del dominio (claves reales del backend). Siempre texto + color. */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AgentStatus, RobotStatus } from '@/lib/api';
import { fmtTime } from '@/lib/format';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'outline';

function Status({
  tone,
  label,
  title,
  pulse,
  dot = true,
  icon: I,
}: {
  tone: Tone;
  label: ReactNode;
  title?: string;
  pulse?: boolean;
  dot?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <Badge variant={tone} title={title}>
      {I ? <I strokeWidth={1.75} aria-hidden /> : dot && <span className={cn('ai-dot', pulse && 'ai-dot--pulse')} aria-hidden />}
      {label}
    </Badge>
  );
}

/* Versión del agente */
const VERSION: Record<AgentStatus, [Tone, string]> = {
  DRAFT: ['neutral', 'Borrador'],
  EVALUATING: ['warning', 'Evaluando…'],
  PUBLISHED: ['success', 'Publicado'],
  REJECTED: ['danger', 'Rechazado'],
  ARCHIVED: ['outline', 'Archivado'],
};
export function VersionStatus({ status }: { status: AgentStatus }) {
  const [tone, label] = VERSION[status];
  return <Status tone={tone} label={label} pulse={status === 'EVALUATING'} dot={status !== 'ARCHIVED'} />;
}

/* Robot por equipo (/admin/robots) */
export const ROBOT_STATUS: Record<RobotStatus, [Tone, string, string]> = {
  EN_LINEA: ['success', 'En línea', 'Trabajando y con sesión en Abaya.'],
  RECONECTANDO: ['warning', 'Reconectando', 'Volviendo a iniciar sesión en Abaya.'],
  CAIDO: ['danger', 'Caído', 'Falló 3 logins seguidos y dejó de intentar. Revisa las credenciales y habilita el reintento.'],
  SIN_SENAL: ['danger', 'Sin señal', 'El equipo no reporta hace más de 1 minuto: apagado sin aviso, sin red o colgado.'],
  APAGADO: ['neutral', 'Apagado', 'Se apagó en orden o nunca arrancó.'],
  DESHABILITADO: ['outline', 'Deshabilitado', 'Instalación revocada por un administrador.'],
};
export function RobotState({ status }: { status: RobotStatus }) {
  const [tone, label, help] = ROBOT_STATUS[status];
  return <Status tone={tone} label={label} title={help} dot={status !== 'DESHABILITADO'} />;
}

/* Sesión de Abaya: nombre en español + código */
const SESSION: Record<string, [Tone, string]> = {
  ACTIVE: ['success', 'Activa'],
  RELOGGING: ['warning', 'Reingresando'],
  PAUSED: ['info', 'Pausada'],
  DOWN: ['danger', 'Caída'],
};
export function SessionState({ status }: { status: string }) {
  const [tone, label] = SESSION[status] ?? (['neutral', status] as [Tone, string]);
  return (
    <Status
      tone={tone}
      label={
        <>
          {label}
          {label !== status && <span className="font-medium opacity-70"> · {status}</span>}
        </>
      }
    />
  );
}

/* Resultado de una acción del robot */
export function ActionResult({ result }: { result: string }) {
  const tone: Tone = result === 'OK' ? 'success' : result === 'ERROR' ? 'danger' : result === 'UNCERTAIN' ? 'warning' : 'neutral';
  return <Status tone={tone} label={result} />;
}

/* Usuario del panel */
export function UserStatus({ active, lockedUntil }: { active: boolean; lockedUntil: string | null }) {
  if (!active) return <Status tone="neutral" label="Inactivo" />;
  if (lockedUntil && new Date(lockedUntil) > new Date()) return <Status tone="warning" label={`Bloqueado hasta ${fmtTime(lockedUntil)}`} />;
  return <Status tone="success" label="Activo" />;
}

export { Status };
