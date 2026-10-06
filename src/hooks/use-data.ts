import { useMemo, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useUser } from '@/auth/session';
import { backend, inFlight, published, subscribe } from '@/data/store';
import { OPS_LIVE, ops } from '@/data/ops-http';
import { diffSnapshots } from '@/lib/content-diff';
import type { ReviewItem, RobotState } from '@/data/types';

/** Base de datos simulada, reactiva (se re-renderiza en cada escritura). */
export function useDb() {
  return useSyncExternalStore(subscribe, backend.snapshot);
}

/** Contenido: versión publicada, borrador, versión en curso y cambios sin publicar. */
export function useContent() {
  const db = useDb();
  const pub = published(db);
  const changes = useMemo(() => diffSnapshots(pub.snapshot, db.draft.snapshot), [pub, db.draft.snapshot]);
  const changedKeys = useMemo(() => new Set(changes.map((c) => c.key)), [changes]);
  return { db, pub, draft: db.draft, current: inFlight(db), changes, changedKeys };
}

/** Acción con toast de resultado y errores legibles. */
export function useAction<A extends unknown[]>(fn: (...a: A) => Promise<unknown>, ok?: string | ((...a: A) => string)) {
  const m = useMutation({
    mutationFn: (args: A) => fn(...args),
    onSuccess: (_r, args) => {
      if (ok) toast.success(typeof ok === 'function' ? ok(...args) : ok);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo completar la acción'),
  });
  return { ...m, run: (...a: A) => m.mutateAsync(a) };
}

/** Estado del robot: real si hay API de operación; si no, simulado. */
export function useRobot() {
  const db = useDb();
  const { adminToken, user, actor } = useUser();
  const qc = useQueryClient();
  const live = useQuery({
    queryKey: ['ops', 'overview'],
    queryFn: () => ops.overview(adminToken ?? '', user.email),
    enabled: OPS_LIVE,
    refetchInterval: 15_000,
  });

  let robot: RobotState = { ...db.robot, lastHeartbeat: new Date().toISOString() };
  if (OPS_LIVE && live.data) {
    const s = live.data.sessions[0];
    robot = {
      stopped: live.data.killSwitch,
      stoppedBy: db.robot.stoppedBy,
      stoppedAt: db.robot.stoppedAt,
      session: !s ? 'sin-senal' : s.status === 'ACTIVE' ? 'activo' : 'sin-sesion',
      lastHeartbeat: s?.lastHeartbeat ?? '',
    };
  } else if (OPS_LIVE) {
    robot = { stopped: false, session: 'sin-senal', lastHeartbeat: '' };
  }

  const setStopped = useMutation({
    mutationFn: async (stopped: boolean) => {
      if (OPS_LIVE) await ops.setKillSwitch(adminToken ?? '', user.email, stopped);
      await backend.setRobotStopped(actor, stopped);
    },
    onSuccess: (_r, stopped) => {
      void qc.invalidateQueries({ queryKey: ['ops'] });
      if (stopped) toast.error('Robot detenido');
      else toast.success('Robot reanudado');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo cambiar el estado del robot'),
  });
  return { robot, live, setStopped };
}

/** Cola de revisión humana: real si hay API de operación. */
export function useReview() {
  const db = useDb();
  const { adminToken, user } = useUser();
  const q = useQuery({
    queryKey: ['ops', 'review'],
    queryFn: () => ops.review(adminToken ?? '', user.email),
    enabled: OPS_LIVE,
    refetchInterval: 15_000,
  });
  if (!OPS_LIVE) return { items: db.review, isLoading: false, error: null as Error | null, refetch: () => {} };
  const items: ReviewItem[] = [
    ...(q.data?.uncertainMessages ?? []).map((m) => ({ id: m.id, chatId: m.conversation.abayaChatId, reason: 'Envío incierto', step: '—', since: m.createdAt })),
    ...(q.data?.conversations ?? []).map((c) => ({ id: c.id, chatId: c.abayaChatId, reason: 'Requiere revisión', step: c.stage, since: c.updatedAt })),
  ];
  return { items, isLoading: q.isLoading, error: q.error, refetch: () => void q.refetch() };
}
