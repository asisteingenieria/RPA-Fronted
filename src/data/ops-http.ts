/**
 * API REAL de operación del robot (apps/api de RobotRPA): estado, apagado de emergencia, revisión
 * y auditoría. Se usa solo si VITE_ADMIN_API_URL está definida; si no, todo es simulado.
 */
export const OPS_LIVE = Boolean(import.meta.env.VITE_ADMIN_API_URL);

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(
      status === 401
        ? 'Token de administración inválido'
        : status === 503
          ? 'Administración deshabilitada en el servidor'
          : `Error HTTP ${status}`,
    );
  }
}

async function req<T>(token: string, user: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-admin-user': user },
  });
  if (!res.ok) throw new ApiError(res.status);
  return (await res.json()) as T;
}

export interface Overview {
  killSwitch: boolean;
  sessions: { robotUser: string; status: string; lastHeartbeat: string; consecutiveFails: number }[];
  conversations: { active: number; transferring: number; needsReview: number; byStatus: Record<string, number> };
  sales: { today: number; transferredToday: number };
}
export interface ReviewQueue {
  conversations: { id: string; abayaChatId: string; robotUser: string; stage: string; updatedAt: string }[];
  uncertainMessages: { id: string; attempts: number; createdAt: string; conversation: { abayaChatId: string } }[];
}

export const ops = {
  overview: (t: string, u: string) => req<Overview>(t, u, '/admin/overview'),
  review: (t: string, u: string) => req<ReviewQueue>(t, u, '/admin/review'),
  setKillSwitch: (t: string, u: string, active: boolean) =>
    req<{ killSwitch: boolean }>(t, u, '/admin/kill-switch', { method: 'POST', body: JSON.stringify({ active }) }),
};
