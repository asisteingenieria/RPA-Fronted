/**
 * Trazabilidad (D-002; kit: reference/trazabilidad/screens/trazabilidad-{lista,robots,estados}).
 * Cada conversación del robot con el cliente, completa, con su tipificación y el rendimiento por
 * robot. Solo ADMIN (lo ve todo); el servidor audita aperturas y exportaciones.
 * Datos: /admin/conversations, /admin/conversations/stats, /admin/conversations/export.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Info,
  Lock,
  MessagesSquare,
  Monitor,
  RotateCw,
  Search,
  Shield,
  Timer,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/auth/session';
import { ApiError, api, download, errorMessage, urls, type ConversationListResponse, type RobotPerformanceResponse, type TraceRange } from '@/lib/api';
import { fmtMs, formatDate, formatInt, formatPct, formatTime } from '@/lib/format';
import { viewConversationsReason } from '@/lib/roles';
import { ETAPAS, PROCESOS, PROCESO_LABEL, TIPIFICACION, TIPIFICACION_ORDER } from '@/lib/tipificaciones';
import {
  PAGE_SIZE,
  RANGE_TEXT,
  activeFilters,
  searchBlocked,
  splitList,
  toFilters,
  todayBogota,
  type TraceSearch,
} from '@/lib/trace-search';
import { cn } from '@/lib/utils';
import { ActionButton, Callout, Empty, ICON, PageHead, Panel, Segmented, SubTabs } from '@/components/rpa/common';
import { AlertFlags, ChatId, FilterChip, Typification, TypificationBar } from '@/components/rpa/trazabilidad/parts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const RANGES: { id: TraceRange; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'custom', label: 'Personalizado' },
];

const keysTrace = {
  list: (s: TraceSearch) => ['conversations', s] as const,
  stats: (s: TraceSearch) => ['conversation-stats', s] as const,
};

const isForbidden = (err: unknown) => err instanceof ApiError && err.status === 403;

export function TrazabilidadPage() {
  const me = useUser();
  const search = useSearch({ strict: false }) as TraceSearch;
  const navigate = useNavigate();
  const locked = viewConversationsReason(me);
  const tab = search.tab ?? 'conversaciones';
  const set = (patch: Partial<TraceSearch>, keepPage = false) =>
    void navigate({
      to: '/trazabilidad',
      search: (prev: TraceSearch) => {
        const next: TraceSearch = { ...prev, ...patch };
        if (!keepPage) delete next.pag;
        for (const k of Object.keys(next) as (keyof TraceSearch)[]) if (next[k] === undefined || next[k] === '') delete next[k];
        return next;
      },
    });

  const blocked = searchBlocked(search);
  const list = useQuery({
    queryKey: keysTrace.list(search),
    queryFn: () => api.conversations(toFilters(search)),
    enabled: !locked && tab === 'conversaciones' && !blocked,
    placeholderData: (prev) => prev,
  });
  const { pag: _pag, ...statsSearch } = search;
  const stats = useQuery({
    queryKey: keysTrace.stats(statsSearch),
    queryFn: () => api.conversationStats(toFilters(search, false)),
    enabled: !locked && tab === 'rendimiento' && !blocked,
  });

  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      await download(urls.conversationsCsv(toFilters(search, false)), 'trazabilidad.csv');
      toast.success('Exportación lista', { description: 'CSV sin el texto de los mensajes. Quedó registrada en Auditoría.' });
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo exportar.'));
    } finally {
      setExporting(false);
    }
  };

  const forbidden = !!locked || isForbidden(list.error) || isForbidden(stats.error);

  return (
    <>
      <PageHead
        title="Trazabilidad"
        sub="Cada conversación del robot con el cliente, completa, con su tipificación y su recorrido"
        actions={
          <>
            <Segmented label="Rango" items={RANGES} value={search.rango ?? 'hoy'} onChange={(r) => set({ rango: r === 'hoy' ? undefined : r, ...(r !== 'custom' ? { desde: undefined, hasta: undefined } : {}) })} />
            <ActionButton
              variant="secondary"
              icon={Download}
              loading={exporting}
              reason={forbidden ? 'Requiere rol ADMIN' : blocked ? 'Reduce el rango para buscar texto' : undefined}
              onClick={() => void exportCsv()}
              title="CSV sin el texto de los mensajes · queda en Auditoría"
            >
              Exportar CSV
            </ActionButton>
          </>
        }
      />
      {search.rango === 'custom' && <CustomRange search={search} onChange={(desde, hasta) => set({ desde, hasta })} />}

      {forbidden ? (
        <TraceNoAccess />
      ) : (
        <>
          <SubTabs
            items={[
              { id: 'conversaciones', label: 'Conversaciones', icon: MessagesSquare, ...(list.data ? { count: list.data.total } : {}) },
              { id: 'rendimiento', label: 'Rendimiento por robot', icon: BarChart3 },
            ]}
            active={tab}
            onChange={(t) => set({ tab: t === 'rendimiento' ? 'rendimiento' : undefined })}
          />
          {blocked && <TextSearchRangeNotice />}
          {tab === 'conversaciones' ? (
            <>
              {list.data ? <TraceKpis data={list.data.kpis} /> : list.isLoading && <KpisSkeleton />}
              <ConversationList
                search={search}
                data={list.data}
                loading={list.isLoading && !blocked}
                fetching={list.isFetching}
                error={list.isError ? errorMessage(list.error, 'El servidor no respondió (GET /admin/conversations).') : undefined}
                onRetry={() => void list.refetch()}
                onSet={set}
                onOpen={(id) => void navigate({ to: '/trazabilidad/$id', params: { id }, search: (prev: TraceSearch) => prev })}
              />
            </>
          ) : (
            <RobotPerformance
              data={stats.data}
              loading={stats.isLoading && !blocked}
              error={stats.isError ? errorMessage(stats.error, 'El servidor no respondió (GET /admin/conversations/stats).') : undefined}
              onRetry={() => void stats.refetch()}
              rangeLabel={RANGE_TEXT[search.rango ?? 'hoy']}
              onOpenRobot={(robot, tip) => set({ tab: undefined, robot, tip })}
            />
          )}
        </>
      )}
    </>
  );
}

/* ───── Rango personalizado ───── */
function CustomRange({ search, onChange }: { search: TraceSearch; onChange: (desde: string, hasta: string) => void }) {
  const today = todayBogota();
  const [desde, setDesde] = useState(search.desde ?? today);
  const [hasta, setHasta] = useState(search.hasta ?? today);
  useEffect(() => {
    setDesde(search.desde ?? today);
    setHasta(search.hasta ?? today);
  }, [search.desde, search.hasta, today]);
  const invalid = !desde || !hasta || desde > hasta;
  const field = 'h-[38px] rounded-md border border-input bg-surface-100 px-3 text-[13px] text-ink tabular-nums';
  return (
    <form
      className="flex flex-wrap items-end justify-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid) onChange(desde, hasta);
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
        Desde
        <input type="date" className={field} value={desde} max={today} onChange={(e) => setDesde(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
        Hasta
        <input type="date" className={field} value={hasta} max={today} onChange={(e) => setHasta(e.target.value)} />
      </label>
      <Button type="submit" variant="secondary" disabled={invalid}>
        Aplicar
      </Button>
      {invalid && <span className="text-xs text-danger">«Desde» debe ser anterior o igual a «Hasta».</span>}
    </form>
  );
}

/* ───── KPIs del filtro + distribución ───── */
function KpiCell({ icon: I, label, value, success, className }: { icon: LucideIcon; label: string; value: ReactNode; success?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3.5 p-5', className)}>
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-md', success ? 'bg-success-soft text-success' : 'bg-primary-soft text-primary-soft-ink')}>
        <I {...ICON} className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="text-[13px] leading-4 font-medium text-ink-muted">{label}</div>
        <div className="mt-1 font-display text-[24px] leading-7 font-semibold text-ink tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function TraceKpis({ data }: { data: ConversationListResponse['kpis'] }) {
  return (
    <div className="grid gap-5 min-[1180px]:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border bg-surface-100 shadow-card max-sm:grid-cols-1">
        <KpiCell icon={MessagesSquare} label="Conversaciones" value={formatInt(data.total)} />
        <KpiCell
          icon={CheckCircle2}
          success
          label="Ventas · conversión"
          className="border-l max-sm:border-l-0 max-sm:border-t"
          value={
            <>
              {formatInt(data.sales)} <span className="font-sans text-xs font-medium text-ink-muted">{formatPct(data.conversionPct)}</span>
            </>
          }
        />
        <KpiCell
          icon={Timer}
          label="1.ª respuesta p50 / p95"
          className="border-t"
          value={
            <>
              {fmtMs(data.firstResponseP50Ms)} <span className="font-sans text-xs font-medium text-ink-muted">/ {fmtMs(data.firstResponseP95Ms)}</span>
            </>
          }
        />
        <KpiCell icon={Clock} label="Duración media" className="border-t border-l max-sm:border-l-0" value={fmtMs(data.avgDurationMs)} />
      </div>
      <Panel
        title="Distribución por tipificación"
        icon={BarChart3}
        actions={<span className="text-xs text-ink-muted">{formatInt(data.total)} conversaciones del filtro</span>}
      >
        <TypificationBar counts={data.byTipificacion} />
      </Panel>
    </div>
  );
}

const KpisSkeleton = () => (
  <div className="grid gap-5 min-[1180px]:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]" aria-busy="true" aria-label="Cargando indicadores">
    <Skeleton className="h-[162px] rounded-lg bg-surface-200" />
    <Skeleton className="h-[162px] rounded-lg bg-surface-200" />
  </div>
);

/* ───── Lista ───── */
const COLS = ['Inicio → fin', 'Robot', 'Chat de Abaya', 'Cliente', 'Tipificación', 'Etapa final', 'Proceso · plan', 'Guion', 'Mensajes', '1.ª resp. · duración', 'Alertas', ''];

function ConversationList({
  search,
  data,
  loading,
  fetching,
  error,
  onRetry,
  onSet,
  onOpen,
}: {
  search: TraceSearch;
  data?: ConversationListResponse;
  loading: boolean;
  fetching: boolean;
  error?: string;
  onRetry: () => void;
  onSet: (patch: Partial<TraceSearch>, keepPage?: boolean) => void;
  onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState(search.q ?? '');
  useEffect(() => setQ(search.q ?? ''), [search.q]);
  const robots = useQuery({ queryKey: ['robots', '30d'], queryFn: () => api.robots('30d'), staleTime: 60_000 });
  // D-004: versiones del guion que atendieron conversaciones (publicadas alguna vez).
  const agentVersions = useQuery({ queryKey: ['agent-versions'], queryFn: api.agentVersions, staleTime: 60_000 });
  const versionOptions = [
    ...new Set([
      ...(agentVersions.data ?? []).filter((v) => v.publishedAt || v.conversations).map((v) => v.version),
      ...(search.version ? [Number(search.version)] : []),
    ]),
  ]
    .sort((a, b) => b - a)
    .map((v) => ({ id: String(v), label: `v${v}` }));
  const robotOptions = [...new Set([...(robots.data?.robots.map((r) => r.robotUser) ?? []), ...splitList(search.robot)])]
    .sort()
    .map((r) => ({ id: r, label: r }));
  const active = activeFilters(search);
  const clear = () =>
    onSet({ robot: undefined, tip: undefined, proceso: undefined, etapa: undefined, revision: undefined, version: undefined, q: undefined });
  const offset = data?.offset ?? 0;
  const pageLabel = data && data.total ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, data.total)} de ${formatInt(data.total)}` : undefined;
  const emptyHint = [
    search.tip && splitList(search.tip).map((t) => `«${TIPIFICACION[t as keyof typeof TIPIFICACION]?.label ?? t}»`).join(', '),
    search.robot && `del ${splitList(search.robot).join(', ')}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className="min-w-0 rounded-lg border bg-surface-100 shadow-card">
      <div className="flex flex-wrap items-center gap-2.5 border-b p-4">
        <form
          className="flex h-[38px] min-w-[260px] flex-1 items-center gap-2 rounded-md border bg-surface-100 px-3 text-[13px] text-ink-subtle focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary-soft"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            onSet({ q: q.trim() || undefined });
          }}
        >
          <Search {...ICON} className="size-4 shrink-0" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por chat de Abaya, cliente o texto del mensaje… (Enter)"
            aria-label="Buscar conversaciones"
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-subtle"
          />
          {search.q && (
            <button type="button" className="cursor-pointer text-ink-subtle hover:text-ink" aria-label="Quitar búsqueda" onClick={() => onSet({ q: undefined })}>
              <X {...ICON} className="size-4" />
            </button>
          )}
        </form>
        <FilterChip label="Robot" options={robotOptions} value={splitList(search.robot)} onChange={(v) => onSet({ robot: v.join(',') || undefined })} />
        <FilterChip
          label="Tipificación"
          options={TIPIFICACION_ORDER.map((t) => ({ id: t, label: TIPIFICACION[t].label }))}
          value={splitList(search.tip) as typeof TIPIFICACION_ORDER}
          onChange={(v) => onSet({ tip: v.join(',') || undefined })}
        />
        <FilterChip
          label="Proceso"
          options={PROCESOS.map((p) => ({ id: p, label: PROCESO_LABEL[p] }))}
          value={splitList(search.proceso) as typeof PROCESOS}
          onChange={(v) => onSet({ proceso: v.join(',') || undefined })}
        />
        <FilterChip
          label="Etapa final"
          options={ETAPAS.map((e) => ({ id: e, label: e }))}
          value={splitList(search.etapa) as (typeof ETAPAS)[number][]}
          onChange={(v) => onSet({ etapa: v.join(',') || undefined })}
        />
        <FilterChip
          label="Pasó por revisión"
          single
          options={[
            { id: 'si', label: 'Sí' },
            { id: 'no', label: 'No' },
          ]}
          value={search.revision ? [search.revision] : []}
          onChange={(v) => onSet({ revision: (v[0] as 'si' | 'no' | undefined) ?? undefined })}
        />
        <FilterChip
          label="Guion"
          single
          options={versionOptions}
          value={search.version ? [search.version] : []}
          onChange={(v) => onSet({ version: v[0] })}
        />
        {(active > 0 || search.q) && (
          <Button variant="link" size="sm" onClick={clear}>
            Limpiar
          </Button>
        )}
      </div>

      {error ? (
        <div role="alert">
          <Empty
            icon={AlertTriangle}
            title="No pudimos cargar las conversaciones"
            action={
              <Button onClick={onRetry}>
                <RotateCw {...ICON} aria-hidden />
                Reintentar
              </Button>
            }
          >
            {error} Tus filtros se conservan.
          </Empty>
        </div>
      ) : !loading && !data ? (
        <Empty icon={Search} title="Reduce el rango para buscar">
          La búsqueda incluye el texto de los mensajes y funciona en rangos de hasta 30 días.
        </Empty>
      ) : !loading && data && data.items.length === 0 ? (
        <Empty
          icon={Search}
          title="Ninguna conversación coincide"
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              {(active > 0 || search.q) && (
                <Button variant="secondary" onClick={clear}>
                  <X {...ICON} aria-hidden />
                  Limpiar filtros
                </Button>
              )}
              {(search.rango ?? 'hoy') === 'hoy' && (
                <Button variant="link" onClick={() => onSet({ rango: '7d' })}>
                  Ver últimos 7 días
                </Button>
              )}
            </div>
          }
        >
          No hay conversaciones {emptyHint ? `con ${emptyHint} ` : ''}en {RANGE_TEXT[search.rango ?? 'hoy']}. Prueba con un rango más amplio o quita algún
          filtro.
        </Empty>
      ) : (
        <Table className={cn('text-[13px] [&_td]:px-3 [&_th]:px-3', fetching && !loading && 'opacity-70')} aria-busy={loading || undefined}>
          <TableHeader>
            <TableRow>
              {COLS.map((c, i) => (
                <TableHead key={i}>{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading || !data
              ? Array.from({ length: 8 }, (_, i) => (
                  <TableRow key={i}>
                    {[90, 60, 80, 120, 110, 70, 100, 30, 50, 50, 30, 30].map((w, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-3 bg-surface-200" style={{ width: w }} />
                        {j === 0 && <Skeleton className="mt-1.5 h-2.5 w-[70px] bg-surface-200" />}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data.items.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-surface-0"
                    onClick={() => onOpen(r.id)}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget === e.target && onOpen(r.id)}
                    tabIndex={0}
                    aria-label={`Abrir conversación ${r.abayaChatId}`}
                  >
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatTime(r.createdAt)}
                      <span className="mx-1 text-ink-subtle">→</span>
                      {r.closed && r.updatedAt ? formatTime(r.updatedAt) : '—'}
                      <span className="block text-xs leading-4 text-ink-subtle">{formatDate(r.createdAt)}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{r.robotUser}</TableCell>
                    <TableCell>
                      <ChatId id={r.abayaChatId} />
                    </TableCell>
                    <TableCell>
                      {r.customerName ?? (
                        <span className="text-ink-subtle" title={r.contentPurged ? 'Contenido borrado por retención' : 'El cliente no dio su nombre'}>
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typification code={r.status} short />
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] leading-[14px] font-semibold tracking-[.05em] text-ink-muted">{r.stage}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.process ? PROCESO_LABEL[r.process] : '—'}
                      {r.planCode && (
                        <>
                          {' · '}
                          <span className="rounded-sm bg-cat-tyt-soft px-1.5 py-px font-mono text-xs font-semibold text-cat-tyt">{r.planCode}</span>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {r.agentVersion ? `v${r.agentVersion}` : <span className="text-ink-subtle" title="Antes de fijar la versión por conversación">—</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums" title="Entrantes del cliente / salientes del robot">
                      <span className="sr-only">Entrantes </span>↓ {r.inbound} <span className="sr-only">salientes </span>↑ {r.outbound}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {fmtMs(r.firstResponseMs)}
                      <span className="block text-xs leading-4 text-ink-subtle">{r.closed ? fmtMs(r.durationMs) : '—'}</span>
                    </TableCell>
                    <TableCell>
                      <AlertFlags flags={r.flags} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(r.id);
                        }}
                      >
                        Ver
                        <ChevronRight {...ICON} aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <Shield {...ICON} className="size-3.5 shrink-0" aria-hidden />
          Cada apertura queda en Auditoría ·{' '}
          {data?.retentionDays != null
            ? `Se conservan ${data.retentionDays} días · se borran automáticamente`
            : 'Retención: sin plazo definido (pendiente con Claro)'}
        </span>
        <span className="inline-flex items-center gap-2">
          {pageLabel && <span className="tabular-nums">{pageLabel}</span>}
          <PagerButton label="Página anterior" icon={ChevronLeft} disabled={!data?.prevCursor} onClick={() => onSet({ pag: Number(data?.prevCursor) || undefined }, true)} />
          <PagerButton label="Página siguiente" icon={ChevronRight} disabled={!data?.nextCursor} onClick={() => onSet({ pag: Number(data?.nextCursor) || undefined }, true)} />
        </span>
      </div>
    </section>
  );
}

function PagerButton({ label, icon: I, disabled, onClick }: { label: string; icon: LucideIcon; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-[34px] cursor-pointer place-items-center rounded-md border bg-surface-100 text-ink hover:bg-surface-200 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <I {...ICON} className="size-4" aria-hidden />
    </button>
  );
}

/* ───── Rendimiento por robot ───── */
function RobotPerformance({
  data,
  loading,
  error,
  onRetry,
  rangeLabel,
  onOpenRobot,
}: {
  data?: RobotPerformanceResponse;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  rangeLabel: string;
  onOpenRobot: (robot: string, tip?: string) => void;
}) {
  const rows = data?.rows ?? [];
  const share = (n: number | undefined, t: number) => formatPct(t ? ((n ?? 0) / t) * 100 : 0);
  // Mejor y peor solo con 2+ robots; siempre acompañado de texto (Callout y leyenda).
  const multi = rows.length > 1;
  const conv = rows.map((r) => r.conversionPct);
  const p95s = rows.map((r) => r.firstResponseP95Ms).filter((v): v is number => v !== null);
  const worstConv = multi ? Math.min(...conv) : null;
  const bestConv = multi ? Math.max(...conv) : null;
  const worstP95 = multi && p95s.length ? Math.max(...p95s) : null;
  const worst = multi && worstConv !== bestConv ? rows.find((r) => r.conversionPct === worstConv) : undefined;
  const slowest = worst && worst.firstResponseP95Ms !== null && worst.firstResponseP95Ms === worstP95;
  const totals: Record<string, number> = {};
  rows.forEach((r) => TIPIFICACION_ORDER.forEach((k) => (totals[k] = (totals[k] ?? 0) + (r.byTipificacion[k] ?? 0))));
  const mark = (on: boolean, good: boolean) =>
    on ? (good ? 'font-semibold text-success after:ml-0.5 after:text-[10px] after:content-["▲"]' : 'font-semibold text-danger after:ml-0.5 after:text-[10px] after:content-["▼"]') : undefined;

  if (error) {
    return (
      <section className="rounded-lg border bg-surface-100 shadow-card" role="alert">
        <Empty
          icon={AlertTriangle}
          title="No pudimos cargar el rendimiento"
          action={
            <Button onClick={onRetry}>
              <RotateCw {...ICON} aria-hidden />
              Reintentar
            </Button>
          }
        >
          {error}
        </Empty>
      </section>
    );
  }

  return (
    <>
      {worst && (
        <Callout tone="warning">
          <b>
            {worst.robotUser} convierte menos{slowest ? ' y responde más lento' : ''}
          </b>{' '}
          que el resto en {rangeLabel}: {formatPct(worst.conversionPct)} de conversión y 1.ª respuesta p95 de {fmtMs(worst.firstResponseP95Ms)}.{' '}
          <button type="button" className="cursor-pointer font-semibold underline" onClick={() => onOpenRobot(worst.robotUser, 'CLOSED_NO_SALE')}>
            Ver sus conversaciones sin venta
          </button>
        </Callout>
      )}
      <section className="min-w-0 rounded-lg border bg-surface-100 shadow-card">
        {!loading && rows.length === 0 ? (
          <Empty icon={BarChart3} title="Sin conversaciones en el rango">
            Cambia el rango o quita filtros para comparar los robots.
          </Empty>
        ) : (
          <Table className="text-[13px] [&_td]:px-3 [&_th]:px-3" aria-busy={loading || undefined}>
            <TableHeader>
              <TableRow>
                {['Robot', 'Conv.', 'Tipificación', 'Ventas', 'Sin venta', 'Inactividad', 'Revisión', 'Conversión', '1.ª resp. p95', 'Inciertos', 'Regeneradas', ''].map((c, i) => (
                  <TableHead key={i}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 4 }, (_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 12 }, (_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-3 bg-surface-200" style={{ width: j === 2 ? 180 : 50 }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.map((r) => (
                    <TableRow key={r.robotUser}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="grid size-[30px] shrink-0 place-items-center rounded-md bg-surface-200 text-ink-muted">
                            <Monitor {...ICON} className="size-4" aria-hidden />
                          </span>
                          <div>
                            <div className="font-semibold text-ink">{r.robotUser}</div>
                            {r.hostname && <div className="text-xs text-ink-subtle">{r.hostname}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatInt(r.total)}</TableCell>
                      <TableCell className="min-w-[180px]">
                        <TypificationBar counts={r.byTipificacion} thin legend={false} />
                      </TableCell>
                      <TableCell>{formatInt(r.sales)}</TableCell>
                      <TableCell>{share(r.byTipificacion.CLOSED_NO_SALE, r.total)}</TableCell>
                      <TableCell>{share(r.byTipificacion.CLOSED_INACTIVE, r.total)}</TableCell>
                      <TableCell>{formatInt(r.byTipificacion.NEEDS_REVIEW ?? 0)}</TableCell>
                      <TableCell>
                        <span
                          className={mark(multi && worstConv !== bestConv && (r.conversionPct === worstConv || r.conversionPct === bestConv), r.conversionPct === bestConv)}
                          title={multi && r.conversionPct === worstConv ? 'Peor conversión del rango' : multi && r.conversionPct === bestConv ? 'Mejor conversión del rango' : undefined}
                        >
                          {formatPct(r.conversionPct)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={mark(worstP95 !== null && r.firstResponseP95Ms === worstP95, false)}
                          title={worstP95 !== null && r.firstResponseP95Ms === worstP95 ? 'Respuesta más lenta del rango' : undefined}
                        >
                          {fmtMs(r.firstResponseP95Ms)}
                        </span>
                      </TableCell>
                      <TableCell>{formatInt(r.uncertainSends)}</TableCell>
                      <TableCell>{formatInt(r.regenerations)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => onOpenRobot(r.robotUser)}>
                          Ver
                          <ChevronRight {...ICON} aria-hidden />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-[13px] text-ink-muted">
          <span>
            {formatInt(data?.total ?? 0)} conversaciones · {rows.length} {rows.length === 1 ? 'robot' : 'robots'}
          </span>
          <span>Rango: {rangeLabel}</span>
        </div>
      </section>
      <Panel title="Distribución total por tipificación" icon={BarChart3}>
        <TypificationBar counts={totals} />
      </Panel>
      <div className="flex flex-wrap gap-5 text-xs text-ink-muted">
        <span>
          <span className="text-success">▲</span> Mejor valor del rango
        </span>
        <span>
          <span className="text-danger">▼</span> Peor valor del rango (siempre con texto en la alerta)
        </span>
      </div>
    </>
  );
}

/* ───── Estados ───── */
export function TraceNoAccess() {
  return (
    <section className="rounded-lg border bg-surface-100 shadow-card">
      <Empty icon={Lock} title="No tienes acceso a las conversaciones">
        <p className="m-0">
          Las conversaciones muestran mensajes reales y datos del cliente: solo las ve el rol ADMIN.
        </p>
      </Empty>
    </section>
  );
}

function TextSearchRangeNotice() {
  return (
    <Callout tone="info" icon={Info}>
      <b>La búsqueda en el texto de los mensajes funciona en rangos de hasta 30 días.</b> Los mensajes están cifrados: el servidor los descifra
      para buscar. Reduce el rango para buscar texto.
    </Callout>
  );
}
