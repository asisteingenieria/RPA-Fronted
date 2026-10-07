/**
 * En vivo (inicio de ambos roles; kit: reference/screens/envivo.*.png).
 * Datos: /admin/overview, /admin/review, /admin/robots?rango=hoy, /admin/agent, /admin/sessions/:robot/reset.
 * Sin contenido de mensajes: solo estados, conteos, ids y tiempos.
 */
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Bot,
  ChevronRight,
  Copy,
  Eye,
  Gauge,
  Power,
  RefreshCw,
  RotateCw,
  WifiOff,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api, errorMessage } from '@/lib/api';
import { fmtAgo, fmtTime, formatInt, formatPct } from '@/lib/format';
import { actionLabel } from '@/lib/labels';
import { reasonFor } from '@/lib/roles';
import { useUser } from '@/auth/session';
import { keys, useNow, useOverview, useReview, useRobots } from '@/hooks/queries';
import { ActionButton, Callout, Count, Empty, ErrorState, ICON, Kpi, LiveIndicator, PageHead, Panel, SkeletonCard, SkeletonRows } from '@/components/rpa/common';
import { ActionResult, SessionState } from '@/components/rpa/status';
import { EmergencyStop } from '@/components/rpa/emergency';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Tone = 'danger' | 'warning' | 'info';
interface Attention {
  key: string;
  tone: Tone;
  icon: LucideIcon;
  title: ReactNode;
  sub: ReactNode;
  action?: ReactNode;
  priority: number;
}

const ATTN_ICON: Record<Tone, string> = {
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-primary-soft text-primary-soft-ink',
};

function RobotLink({ robot, children = 'Ver robot' }: { robot: string; children?: ReactNode }) {
  return (
    <Link
      to="/robots"
      search={{ robot }}
      className="inline-flex items-center gap-1.5 text-[13px] leading-4 font-semibold whitespace-nowrap text-primary-soft-ink hover:underline"
    >
      {children}
      <ChevronRight {...ICON} className="size-3.5" aria-hidden />
    </Link>
  );
}

export function EnVivoPage() {
  const me = useUser();
  const now = useNow(1000);
  const qc = useQueryClient();
  const overview = useOverview();
  const review = useReview();
  const robots = useRobots('hoy');
  const agent = useQuery({ queryKey: keys.agent, queryFn: api.agent, staleTime: 60_000 });

  const reset = useMutation({
    mutationFn: api.resetSession,
    onSuccess: (r) => {
      toast.success(r.note || 'Reintento habilitado');
      void qc.invalidateQueries({ queryKey: keys.overview });
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo habilitar el reintento.')),
  });

  const refresh = () => {
    void overview.refetch();
    void review.refetch();
    void robots.refetch();
  };

  const o = overview.data;
  const list = robots.data;
  const stopped = o?.killSwitch ?? false;
  const fleet = list?.robots.filter((r) => r.enabled) ?? [];
  const online = fleet.filter((r) => r.status === 'EN_LINEA');
  const lastSeen = fleet
    .map((r) => r.lastSeenAt)
    .filter((x): x is string => !!x)
    .sort()
    .at(-1);
  const capacity = list ? online.length * list.maxChatsPerRobot : 0;
  const totals = fleet.reduce((a, r) => ({ conv: a.conv + r.metrics.conversations, sales: a.sales + r.metrics.sales }), { conv: 0, sales: 0 });

  // ───── Lista priorizada "Requiere atención" ─────
  const items: Attention[] = [];
  for (const s of o?.sessions ?? []) {
    if (s.status !== 'DOWN') continue;
    items.push({
      key: `down-${s.robotUser}`,
      tone: 'danger',
      icon: WifiOff,
      priority: 0,
      title: `${s.robotUser} caído`,
      sub: `Sesión DOWN tras ${s.consecutiveFails} fallos seguidos · último heartbeat ${fmtTime(s.lastHeartbeat)}`,
      action: (
        <ActionButton
          variant="secondary"
          size="sm"
          icon={RotateCw}
          reason={reasonFor(me.role, 'habilitarReintento')}
          loading={reset.isPending && reset.variables === s.robotUser}
          onClick={() => reset.mutate(s.robotUser)}
        >
          Habilitar reintento
        </ActionButton>
      ),
    });
  }
  const downSessions = new Set((o?.sessions ?? []).filter((s) => s.status === 'DOWN').map((s) => s.robotUser));
  for (const r of fleet) {
    if (r.status === 'SIN_SENAL' || (r.status === 'CAIDO' && !downSessions.has(r.robotUser))) {
      items.push({
        key: `robot-${r.robotUser}`,
        tone: 'danger',
        icon: WifiOff,
        priority: 1,
        title: `${r.robotUser} ${r.status === 'SIN_SENAL' ? 'sin señal' : 'caído'}`,
        sub: `${r.host ?? 'equipo sin registrar'} · última señal ${fmtAgo(r.lastSeenAt, now)}`,
        action: <RobotLink robot={r.robotUser} />,
      });
    }
    if (r.lastRejectedAt && now - new Date(r.lastRejectedAt).getTime() < 24 * 3_600_000) {
      items.push({
        key: `dup-${r.robotUser}`,
        tone: 'warning',
        icon: Copy,
        priority: 4,
        title: `Arranque duplicado de ${r.robotUser}`,
        sub: `Se intentó abrir en ${r.lastRejectedHost ?? 'otro equipo'} a las ${fmtTime(r.lastRejectedAt)} y se rechazó`,
        action: <RobotLink robot={r.robotUser} />,
      });
    }
    if (list && r.openChats > list.maxChatsPerRobot) {
      items.push({
        key: `over-${r.robotUser}`,
        tone: 'warning',
        icon: Gauge,
        priority: 5,
        title: `${r.robotUser} sobrecargado`,
        sub: `${r.openChats} chats abiertos · tope ${list.maxChatsPerRobot}`,
        action: <RobotLink robot={r.robotUser} />,
      });
    }
  }
  for (const m of review.data?.uncertainMessages ?? []) {
    items.push({
      key: `unc-${m.id}`,
      tone: 'danger',
      icon: AlertTriangle,
      priority: 2,
      title: (
        <>
          Envío incierto · chat <span className="tabular-nums">{m.conversation.abayaChatId}</span>
        </>
      ),
      sub: `${m.conversation.robotUser} · ${m.attempts} ${m.attempts === 1 ? 'intento' : 'intentos'} · no se reintenta solo: verifica en Abaya si llegó`,
      action: <RobotLink robot={m.conversation.robotUser} />,
    });
  }
  for (const c of review.data?.conversations ?? []) {
    items.push({
      key: `rev-${c.id}`,
      tone: 'warning',
      icon: Eye,
      priority: 3,
      title: (
        <>
          Conversación en revisión · chat <span className="tabular-nums">{c.abayaChatId}</span>
        </>
      ),
      sub: `${c.robotUser} · etapa ${c.stage} · desde ${fmtTime(c.updatedAt)}`,
      action: <RobotLink robot={c.robotUser} />,
    });
  }
  items.sort((a, b) => a.priority - b.priority);

  const needsReview = o?.conversations.needsReview ?? 0;
  const uncertain = review.data?.uncertainMessages.length ?? 0;
  const pendingConfirm = o ? Math.max(0, o.sales.today - o.sales.transferredToday) : 0;

  return (
    <>
      <PageHead
        title="Operación en vivo"
        sub="Campaña Claro Móvil por WhatsApp · Abaya"
        actions={
          <>
            {o && <LiveIndicator text={`En vivo · actualizado ${fmtAgo(o.generatedAt, now)}`} />}
            <ActionButton variant="secondary" icon={RefreshCw} loading={overview.isFetching && !overview.isLoading} onClick={refresh}>
              Actualizar
            </ActionButton>
          </>
        }
      />

      {/* Semáforo general */}
      {overview.isError && !o ? (
        <Panel>
          <ErrorState message="No se pudo leer el estado del robot." onRetry={() => void overview.refetch()} retrying={overview.isFetching} />
        </Panel>
      ) : (
        <section
          className={cn(
            'flex flex-wrap items-center gap-5 rounded-lg border bg-surface-100 px-6 py-5 shadow-card',
            stopped && 'border-danger',
          )}
          aria-live="polite"
        >
          <span
            className={cn(
              'grid size-[52px] shrink-0 place-items-center rounded-full',
              stopped ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success',
            )}
          >
            {stopped ? <Power {...ICON} className="size-6" aria-hidden /> : <Activity {...ICON} className="size-6" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={cn('m-0 font-display text-xl leading-[26px] font-semibold', stopped ? 'text-danger' : 'text-ink')}>
              {o ? (stopped ? 'Robot detenido' : 'Robot operando') : 'Cargando estado…'}
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              {list ? `${online.length} de ${fleet.length} robots en línea` : '— robots en línea'}
              {' · '}última señal {fmtAgo(lastSeen, now)}
              {' · '}versión del agente {agent.data ? `v${agent.data.published.version}` : '—'}
            </p>
          </div>
          <EmergencyStop stopped={stopped} role={me.role} size="lg" />
        </section>
      )}

      {/* KPIs del día */}
      {!o ? (
        <div className="grid grid-cols-5 gap-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {Array.from({ length: 5 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <Kpi
            label="Conversaciones activas"
            value={formatInt(o.conversations.active)}
            bar={capacity ? (o.conversations.active / capacity) * 100 : undefined}
            foot={list ? `${formatInt(o.conversations.active)} de ${formatInt(capacity)} cupos` : '— cupos'}
          />
          <Kpi label="En transferencia" value={formatInt(o.conversations.transferring)} foot="En cola de backoffice" />
          <Kpi
            label="Ventas hoy"
            value={formatInt(o.sales.today)}
            foot={totals.conv ? `Conversión ${formatPct((totals.sales / totals.conv) * 100)}` : 'Conversión —'}
          />
          <Kpi
            label="Transferidas al backoffice"
            value={formatInt(o.sales.transferredToday)}
            foot={pendingConfirm ? `${pendingConfirm} pendiente${pendingConfirm === 1 ? '' : 's'} de confirmar` : 'Todas confirmadas'}
          />
          <Kpi
            label="Requieren revisión"
            value={formatInt(needsReview + uncertain)}
            tone={needsReview + uncertain > 0 ? 'danger' : undefined}
            foot={`${uncertain} envío${uncertain === 1 ? '' : 's'} incierto${uncertain === 1 ? '' : 's'} · ${needsReview} en revisión`}
          />
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start gap-5 max-xl:grid-cols-1">
        <Panel title="Requiere atención" icon={AlertTriangle} badge={<Count>{items.length}</Count>} flush>
          {!o || !review.data ? (
            <SkeletonRows rows={3} cols={2} />
          ) : items.length === 0 ? (
            <Empty icon={Bot} title="Nada requiere atención">
              Sin sesiones caídas, envíos inciertos ni conversaciones en revisión.
            </Empty>
          ) : (
            <ul className="m-0 list-none p-0">
              {items.map((it) => (
                <li key={it.key} className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-t px-5 py-3 first:border-t-0 max-sm:grid-cols-[36px_minmax(0,1fr)]">
                  <span className={cn('grid size-9 place-items-center rounded-md', ATTN_ICON[it.tone])}>
                    <it.icon {...ICON} className="size-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <b className="block font-semibold text-ink">{it.title}</b>
                    <small className="block text-xs text-ink-subtle">{it.sub}</small>
                  </div>
                  {it.action && <div className="max-sm:col-start-2">{it.action}</div>}
                </li>
              ))}
            </ul>
          )}
          {review.isError && (
            <div className="px-5 pb-4">
              <Callout tone="warning">No se pudo leer la cola de revisión; la lista puede estar incompleta.</Callout>
            </div>
          )}
        </Panel>

        <Panel title="Sesiones de los robots" icon={Bot} flush>
          {!o ? (
            <SkeletonRows rows={3} cols={4} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Robot</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Heartbeat</TableHead>
                  <TableHead className="text-right">Fallos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {o.sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-ink-muted">
                      Sin sesiones registradas todavía.
                    </TableCell>
                  </TableRow>
                ) : (
                  o.sessions.map((s) => (
                    <TableRow key={s.robotUser}>
                      <TableCell className="font-semibold">{s.robotUser}</TableCell>
                      <TableCell>
                        <SessionState status={s.status} />
                      </TableCell>
                      <TableCell>{fmtAgo(s.lastHeartbeat, now)}</TableCell>
                      <TableCell className={cn('text-right', s.consecutiveFails > 0 && 'font-semibold text-danger')}>{s.consecutiveFails}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>

      <Panel title="Errores recientes del robot" icon={XCircle} actions={<span className="text-[13px] text-ink-muted">Últimos 20</span>} flush>
        {!o ? (
          <SkeletonRows rows={3} cols={5} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Robot</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Chat</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {o.recentErrors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-ink-muted">
                    Sin errores recientes.
                  </TableCell>
                </TableRow>
              ) : (
                o.recentErrors.map((e, i) => (
                  <TableRow key={`${e.createdAt}-${i}`}>
                    <TableCell>{fmtTime(e.createdAt, true)}</TableCell>
                    <TableCell>{e.robotUser}</TableCell>
                    <TableCell>{actionLabel(e.action)}</TableCell>
                    <TableCell>{e.abayaChatId ?? '—'}</TableCell>
                    <TableCell>
                      <ActionResult result={e.result} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
