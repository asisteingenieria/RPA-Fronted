/**
 * Robots (kit: reference/screens/robots.*.png). Un robot = un usuario de Abaya = un equipo.
 * Datos: /admin/robots*, descarga del instalador y de trazas. Gestión solo ADMIN (OPERADOR ve los
 * controles deshabilitados con el motivo).
 */
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Download,
  Eye,
  KeyRound,
  Monitor,
  MoreHorizontal,
  Package,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Upload,
  WifiOff,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  api,
  errorMessage,
  urls,
  type EnrollmentCode,
  type Range,
  type RobotCredentials,
  type RobotListItem,
  type RobotStatus,
} from '@/lib/api';
import { fmtAgo, fmtDateTime, fmtMs, fmtPct, fmtTime, formatBytes, formatDate, formatInt } from '@/lib/format';
import { actionLabel, CONV_LABEL, RANGE_LABEL, UPDATE_LABEL } from '@/lib/labels';
import { reasonFor } from '@/lib/roles';
import { useUser } from '@/auth/session';
import { keys, LIVE_MS, useNow, useRobots } from '@/hooks/queries';
import {
  ActionButton,
  Callout,
  ConfirmDialog,
  Empty,
  ErrorState,
  ICON,
  IconAction,
  Kpi,
  OneTimeSecret,
  PageHead,
  Panel,
  Segmented,
  SkeletonRows,
} from '@/components/rpa/common';
import { ActionResult, ROBOT_STATUS, RobotState, SessionState, Status } from '@/components/rpa/status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Meta de operación: 95 % de las respuestas en menos de 15 s (sección 2.7 del plan). */
const SLOW_MS = 15_000;
const RANGES: { id: Range; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
];
/** URL que el instalador del equipo debe usar para llegar a la pasarela de robots. */
const SERVER_URL = (import.meta.env.VITE_ROBOT_SERVER_URL as string | undefined) || window.location.origin;

export interface RobotsSearch {
  robot?: string;
  rango?: Range;
}

function useRobotAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['robots'] });
      void qc.invalidateQueries({ queryKey: ['robot'] });
    },
  });
}

/* ───────────── Página ───────────── */
export function RobotsPage() {
  const me = useUser();
  const now = useNow(5000);
  const search = useSearch({ from: '/shell/robots' });
  const navigate = useNavigate({ from: '/robots' });
  const range: Range = search.rango ?? 'hoy';
  const robots = useRobots(range);
  const act = useRobotAction();
  const manage = reasonFor(me.role, 'gestionarRobots');

  const [q, setQ] = useState('');
  const [statuses, setStatuses] = useState<RobotStatus[]>([]);
  const [adding, setAdding] = useState(false);
  const [install, setInstall] = useState<EnrollmentCode | null>(null);
  const [credsFor, setCredsFor] = useState<string | null>(null);
  const [disableFor, setDisableFor] = useState<string | null>(null);
  const [updateAll, setUpdateAll] = useState(false);

  const setSearch = (s: Partial<RobotsSearch>) => void navigate({ search: (p: RobotsSearch) => ({ ...p, ...s }) });

  const run = (fn: () => Promise<unknown>, ok: string | ((r: unknown) => string), fail: string) =>
    act.mutateAsync(fn).then(
      (r) => {
        toast.success(typeof ok === 'string' ? ok : ok(r));
        return r;
      },
      (err: unknown) => {
        toast.error(errorMessage(err, fail));
        throw err;
      },
    );

  const list = robots.data;
  const all = list?.robots ?? [];
  const online = all.filter((r) => r.status === 'EN_LINEA');
  const problems = all.filter((r) => r.status === 'CAIDO' || r.status === 'SIN_SENAL');
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter(
      (r) =>
        (!needle || r.robotUser.toLowerCase().includes(needle) || (r.host ?? '').toLowerCase().includes(needle)) &&
        (statuses.length === 0 || statuses.includes(r.status)),
    );
  }, [all, q, statuses]);
  const published = list?.published ?? null;
  const pkgOk = published?.signatureValid ? published.version : null;

  return (
    <>
      <PageHead
        title="Robots"
        sub={list ? `${all.length} robots · ${online.length} en línea · ${problems.length} con problemas` : 'Cargando robots…'}
        actions={
          <>
            <Segmented label="Rango" value={range} onChange={(r) => setSearch({ rango: r })} items={RANGES} />
            <Button variant="secondary" asChild>
              <a href={urls.robotPackage} download>
                <Download {...ICON} aria-hidden />
                Descargar instalador
              </a>
            </Button>
            <ActionButton icon={Plus} reason={manage} onClick={() => setAdding(true)}>
              Agregar robot
            </ActionButton>
          </>
        }
      />

      {install && (
        <InstallCard code={install} onClose={() => setInstall(null)} />
      )}

      {/* Franja de resumen */}
      <section className="grid grid-cols-4 rounded-lg border bg-surface-100 shadow-card max-lg:grid-cols-2 max-sm:grid-cols-1 [&>div]:flex [&>div]:min-w-0 [&>div]:items-center [&>div]:gap-3.5 [&>div]:px-5 [&>div]:py-3.5 [&>div+div]:border-l max-lg:[&>div:nth-child(3)]:border-l-0 max-lg:[&>div:nth-child(n+3)]:border-t max-sm:[&>div+div]:border-l-0 max-sm:[&>div+div]:border-t">
        <div>
          <span className="grid size-9 place-items-center rounded-md bg-success-soft text-success">
            <Bot {...ICON} className="size-[18px]" aria-hidden />
          </span>
          <div>
            <div className="text-[13px] font-medium text-ink-muted">En línea</div>
            <div className="font-display text-[22px] leading-[26px] font-semibold tabular-nums">{list ? online.length : '—'}</div>
          </div>
        </div>
        <div>
          <span className="grid size-9 place-items-center rounded-md bg-danger-soft text-danger">
            <WifiOff {...ICON} className="size-[18px]" aria-hidden />
          </span>
          <div>
            <div className="text-[13px] font-medium text-ink-muted">Con problemas</div>
            <div className="font-display text-[22px] leading-[26px] font-semibold tabular-nums">{list ? problems.length : '—'}</div>
          </div>
        </div>
        <div>
          <span className="grid size-9 place-items-center rounded-md bg-primary-soft text-primary-soft-ink">
            <Package {...ICON} className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-ink-muted">Paquete publicado</div>
            {published ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-[22px] leading-[26px] font-semibold">v{published.version}</span>
                {published.signatureValid ? (
                  <Status tone="success" label="Firma válida" dot={false} title="Verificada con la clave pública de los robots" />
                ) : (
                  <Status tone="danger" label="Firma inválida" dot={false} title="No se ofrecerá a los robots" />
                )}
              </div>
            ) : (
              <div className="text-sm text-ink-subtle">{list ? 'Sin paquete publicado' : '—'}</div>
            )}
          </div>
        </div>
        <div className="flex-col !items-start !gap-1.5">
          <span className="text-[13px] text-ink-muted tabular-nums">
            {published ? `${formatBytes(published.size)} · ${formatDate(published.builtAt)}` : '—'}
          </span>
          <ActionButton
            variant="secondary"
            size="sm"
            icon={Upload}
            reason={manage ?? (!pkgOk ? 'No hay un paquete con firma válida' : undefined)}
            onClick={() => setUpdateAll(true)}
          >
            Actualizar todos
          </ActionButton>
        </div>
      </section>

      <section className="min-w-0 rounded-lg border bg-surface-100 shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <label className="flex h-[38px] min-w-[240px] flex-1 items-center gap-2 rounded-md border bg-surface-100 px-3 text-[13px] text-ink-subtle focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary-soft">
            <Search {...ICON} className="size-4" aria-hidden />
            <span className="sr-only">Buscar robot o equipo</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar robot o equipo…"
              className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-subtle"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="Limpiar búsqueda" className="cursor-pointer text-ink-subtle hover:text-ink">
                <X {...ICON} className="size-4" />
              </button>
            )}
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex h-[38px] cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border-strong px-3 text-[13px] font-medium text-ink-muted',
                  statuses.length && 'border-solid border-primary bg-primary-soft text-primary-soft-ink',
                )}
              >
                <Plus {...ICON} className="size-4" aria-hidden />
                Estado{statuses.length ? ` · ${statuses.length}` : ''}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por estado</DropdownMenuLabel>
              {(Object.keys(ROBOT_STATUS) as RobotStatus[]).map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statuses.includes(s)}
                  onCheckedChange={(on) => setStatuses((x) => (on ? [...x, s] : x.filter((y) => y !== s)))}
                  onSelect={(e) => e.preventDefault()}
                >
                  {ROBOT_STATUS[s][1]}
                </DropdownMenuCheckboxItem>
              ))}
              {statuses.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setStatuses([])}>Quitar filtro</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {robots.isLoading ? (
          <SkeletonRows rows={4} cols={8} />
        ) : robots.isError ? (
          <ErrorState message="No se pudo cargar la lista de robots." onRetry={() => void robots.refetch()} retrying={robots.isFetching} />
        ) : all.length === 0 ? (
          <Empty
            icon={Bot}
            title="No hay robots registrados"
            action={
              <ActionButton icon={Plus} reason={manage} onClick={() => setAdding(true)}>
                Agregar robot
              </ActionButton>
            }
          >
            Agrega el usuario robot de Abaya y genera un código para instalarlo en su equipo.
          </Empty>
        ) : (
          <Table className="[&_td]:px-2.5 [&_td:first-child]:pl-4 [&_th]:px-2.5 [&_th:first-child]:pl-4">
            <TableHeader>
              <TableRow>
                <TableHead>Robot</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última señal</TableHead>
                <TableHead>Versión</TableHead>
                <TableHead title="Chats en su bandeja / tope por robot">Chats</TableHead>
                <TableHead title="Desde que el cliente escribe hasta que Abaya confirma la respuesta (95 % de las respuestas)">Resp. p95</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Conversión</TableHead>
                <TableHead title="Errores / envíos inciertos">Errores / inciertos</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-ink-muted">
                    Ningún robot coincide con la búsqueda o el filtro.
                  </TableCell>
                </TableRow>
              ) : (
                shown.map((r) => (
                  <RobotRow
                    key={r.robotUser}
                    r={r}
                    now={now}
                    maxChats={list!.maxChatsPerRobot}
                    pkg={pkgOk}
                    manage={manage}
                    onOpen={() => setSearch({ robot: r.robotUser })}
                    onPause={() =>
                      void run(() => api.pauseRobot(r.robotUser, !r.paused), r.paused ? `${r.robotUser} reanudado` : `${r.robotUser} pausado`, 'No se pudo cambiar la pausa.').catch(() => undefined)
                    }
                    onCredentials={() => setCredsFor(r.robotUser)}
                    onCode={() =>
                      void run(() => api.enrollmentCode(r.robotUser), 'Código de instalación generado', 'No se pudo generar el código.')
                        .then((c) => setInstall(c as EnrollmentCode))
                        .catch(() => undefined)
                    }
                    onUpdate={() =>
                      void run(
                        () => (r.update?.requested ? api.cancelUpdate(r.robotUser) : api.updateRobot(r.robotUser)),
                        r.update?.requested ? 'Actualización cancelada' : `${r.robotUser} se actualizará cuando termine sus chats`,
                        'No se pudo cambiar la actualización.',
                      ).catch(() => undefined)
                    }
                    onEnable={() =>
                      r.enabled
                        ? setDisableFor(r.robotUser)
                        : void run(() => api.enableRobot(r.robotUser, true), `${r.robotUser} habilitado`, 'No se pudo habilitar.').catch(() => undefined)
                    }
                  />
                ))
              )}
            </TableBody>
          </Table>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-[13px] text-ink-muted">
          <span>Capacidad: {list?.maxChatsPerRobot ?? '—'} chats simultáneos por robot</span>
          <span>
            Rango: {RANGE_LABEL[range].toLowerCase()} · se actualiza cada {LIVE_MS / 1000} s
          </span>
        </div>
      </section>

      <AddRobotDialog
        open={adding}
        onOpenChange={setAdding}
        onCreated={(c) => {
          setAdding(false);
          setInstall(c);
        }}
      />
      <CredentialsDialog robotUser={credsFor} onClose={() => setCredsFor(null)} />
      <ConfirmDialog
        open={!!disableFor}
        onOpenChange={(o) => !o && setDisableFor(null)}
        danger
        title={`¿Deshabilitar ${disableFor ?? ''}?`}
        description="Se revoca la instalación del equipo: el robot en marcha se apaga en su siguiente presencia y no podrá volver a arrancar hasta generar un código nuevo."
        confirmLabel="Sí, deshabilitar"
        onConfirm={() => run(() => api.enableRobot(disableFor!, false), (r) => (r as { note?: string }).note ?? `${disableFor} deshabilitado`, 'No se pudo deshabilitar.')}
      />
      <ConfirmDialog
        open={updateAll}
        onOpenChange={setUpdateAll}
        title={`¿Actualizar todos los robots a v${published?.version ?? ''}?`}
        description="Cada robot espera a tener la bandeja vacía y sin acciones pendientes, descarga el paquete firmado y reinicia. Si la versión nueva no arranca, vuelve sola a la anterior."
        confirmLabel="Sí, actualizar todos"
        onConfirm={() =>
          run(api.updateAll, (r) => {
            const x = r as { version: string; robots: number };
            return `${x.robots} robot(s) se actualizarán a v${x.version} cuando terminen sus chats`;
          }, 'No se pudo pedir la actualización.')
        }
      />
      <RobotDetailSheet robotUser={search.robot ?? null} range={range} onRange={(r) => setSearch({ rango: r })} onClose={() => setSearch({ robot: undefined })} />
    </>
  );
}

/* ───────────── Fila ───────────── */
function RobotRow({
  r,
  now,
  maxChats,
  pkg,
  manage,
  onOpen,
  onPause,
  onCredentials,
  onCode,
  onUpdate,
  onEnable,
}: {
  r: RobotListItem;
  now: number;
  maxChats: number;
  pkg: string | null;
  manage?: string;
  onOpen: () => void;
  onPause: () => void;
  onCredentials: () => void;
  onCode: () => void;
  onUpdate: () => void;
  onEnable: () => void;
}) {
  const m = r.metrics;
  const upd = r.update && UPDATE_LABEL[r.update.status];
  const duplicate = r.lastRejectedAt && now - new Date(r.lastRejectedAt).getTime() < 24 * 3_600_000;
  const canUpdate = r.update?.requested || (!!pkg && !!r.version && r.version !== pkg);
  const off = !r.enabled ? 'El robot está deshabilitado' : undefined;
  return (
    <>
      <TableRow>
        <TableCell>
          <button type="button" onClick={onOpen} className="flex cursor-pointer items-center gap-2.5 text-left">
            <span className="grid size-[30px] shrink-0 place-items-center rounded-sm bg-surface-200 text-ink-muted">
              <Monitor {...ICON} className="size-4" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold text-ink hover:underline">{r.robotUser}</span>
              <span className="block text-xs leading-4 text-ink-subtle">{r.host ?? 'sin instalar'}</span>
            </span>
          </button>
        </TableCell>
        <TableCell>
          <div className="flex flex-col items-start gap-1">
            <RobotState status={r.status} />
            {r.paused && r.status !== 'DESHABILITADO' && <Status tone="info" label="Pausado" icon={Pause} />}
          </div>
        </TableCell>
        <TableCell>{fmtAgo(r.lastSeenAt, now)}</TableCell>
        <TableCell>
          {r.version ? `v${r.version}` : '—'}
          {upd && (
            <span className={cn('block text-xs leading-4', upd.tone === 'danger' ? 'text-danger' : upd.tone === 'success' ? 'text-success' : 'text-ink-subtle')} title={r.update?.message ?? undefined}>
              {upd.label}
              {r.update?.version && r.update.status !== 'APPLIED' ? ` v${r.update.version}` : ''}
            </span>
          )}
        </TableCell>
        <TableCell>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-1.5 w-[56px] overflow-hidden rounded-full bg-surface-200" aria-hidden>
              <span
                className={cn('block h-full rounded-full', r.openChats > maxChats ? 'bg-danger' : 'bg-primary')}
                style={{ width: `${Math.min(100, (r.openChats / maxChats) * 100)}%` }}
              />
            </span>
            <span className={cn(r.openChats > maxChats && 'font-semibold text-danger')}>
              {r.openChats} / {maxChats}
            </span>
          </span>
        </TableCell>
        <TableCell
          className={cn((m.responseP95Ms ?? 0) > SLOW_MS && 'font-semibold text-danger')}
          title={m.responses ? `${m.responses} respuestas · p50 ${fmtMs(m.responseP50Ms)}` : undefined}
        >
          {fmtMs(m.responseP95Ms)}
        </TableCell>
        <TableCell className="text-right">{formatInt(m.conversations)}</TableCell>
        <TableCell className="text-right">{formatInt(m.sales)}</TableCell>
        <TableCell className="text-right">{fmtPct(m.conversionPct)}</TableCell>
        <TableCell className={cn(m.errors + m.uncertain > 0 && 'font-semibold text-danger')}>
          {m.errors} / {m.uncertain}
        </TableCell>
        <TableCell>
          <div className="inline-flex gap-0.5">
            <IconAction icon={r.paused ? Play : Pause} label={r.paused ? 'Reanudar robot' : 'Pausar robot'} reason={manage ?? off} onClick={onPause} />
            <IconAction icon={KeyRound} label="Credenciales de Abaya" reason={manage} onClick={onCredentials} />
            <IconAction icon={Eye} label="Ver detalle" onClick={onOpen} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Más acciones de ${r.robotUser}`}
                  className="inline-grid size-8 cursor-pointer place-items-center rounded-sm text-ink-muted hover:bg-primary-soft hover:text-primary-soft-ink"
                >
                  <MoreHorizontal {...ICON} className="size-4" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {manage && <DropdownMenuLabel className="text-xs font-medium text-ink-subtle">{manage}</DropdownMenuLabel>}
                <DropdownMenuItem disabled={!!manage || !!off || !canUpdate} onSelect={onUpdate}>
                  <RefreshCw {...ICON} aria-hidden />
                  {r.update?.requested ? 'Cancelar actualización' : canUpdate ? `Actualizar a v${pkg}` : 'Al día con el paquete'}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!!manage || !!off || !r.hasCredentials} onSelect={onCode}>
                  <Download {...ICON} aria-hidden />
                  {r.installed ? 'Nuevo código (reinstalar)' : 'Código de instalación'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={!!manage} variant={r.enabled ? 'destructive' : 'default'} onSelect={onEnable}>
                  {r.enabled ? <ShieldAlert {...ICON} aria-hidden /> : <ShieldCheck {...ICON} aria-hidden />}
                  {r.enabled ? 'Deshabilitar' : 'Habilitar'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>
      {duplicate && (
        <TableRow className="hover:!bg-warning-soft">
          <TableCell colSpan={11} className="bg-warning-soft whitespace-normal text-warning">
            Se intentó abrir este mismo robot en <strong>{r.lastRejectedHost}</strong> ({fmtTime(r.lastRejectedAt)}) mientras estaba en línea en{' '}
            {r.host ?? 'otro equipo'}. Se rechazó: un usuario de Abaya solo puede correr en un equipo a la vez.
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/* ───────────── Instalar en un equipo (código de un solo uso) ───────────── */
function InstallCard({ code, onClose }: { code: EnrollmentCode; onClose: () => void }) {
  return (
    <Panel title={`Instalar ${code.robotUser} en un equipo`} icon={Download} actions={<Button variant="ghost" onClick={onClose}>Listo, ocultar</Button>}>
      <div className="flex flex-col gap-4">
        <OneTimeSecret
          title="Código de instalación"
          value={code.enrollmentCode}
          help={`Sirve una sola vez y vence ${fmtDateTime(code.expiresAt)}. No contiene la contraseña de Abaya.`}
        />
        <ol className="m-0 flex list-decimal flex-col gap-2.5 pl-5 text-[13.5px] text-ink">
          <li>
            En el equipo del robot descarga el instalador (
            <a href={urls.robotPackage} download className="font-semibold text-primary-soft-ink hover:underline">
              abaya-robot-windows.zip
            </a>
            ) y descomprímelo.
          </li>
          <li>
            Ejecuta <code className="rounded-sm bg-surface-200 px-1.5 font-mono text-xs">instalar.cmd</code>. Te pedirá el servidor{' '}
            <code className="rounded-sm bg-surface-200 px-1.5 font-mono text-xs">{SERVER_URL}</code> y el código de arriba.
          </li>
          <li>El robot arranca solo y aparece aquí como «En línea» con el nombre del equipo.</li>
        </ol>
      </div>
    </Panel>
  );
}

/* ───────────── Formularios de credenciales ───────────── */
function FormField({ id, label, help, children }: { id: string; label: string; help?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
      </Label>
      {children}
      {help && <span className="text-xs leading-4 text-ink-subtle">{help}</span>}
    </div>
  );
}

function CredentialFields({
  editing,
  user,
  setUser,
  password,
  setPassword,
  mfa,
  setMfa,
  secret,
  setSecret,
}: {
  editing: boolean;
  user: string;
  setUser: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  mfa: 'none' | 'totp';
  setMfa: (v: 'none' | 'totp') => void;
  secret: string;
  setSecret: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-4 max-sm:grid-cols-1">
      <FormField id="robot-user" label="Usuario de Abaya" help={editing ? undefined : 'Usuario dedicado y nominal, p. ej. robot-ventas-01'}>
        <Input id="robot-user" value={user} onChange={(e) => setUser(e.target.value)} disabled={editing} autoComplete="off" required placeholder="robot-ventas-01" />
      </FormField>
      <FormField id="robot-pass" label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña de Abaya'}>
        <Input id="robot-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required={!editing} />
      </FormField>
      <FormField id="robot-mfa" label="MFA">
        <Select value={mfa} onValueChange={(v) => setMfa(v as 'none' | 'totp')}>
          <SelectTrigger id="robot-mfa" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin MFA</SelectItem>
            <SelectItem value="totp">Código TOTP</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      {mfa === 'totp' && (
        <FormField id="robot-totp" label="Secreto TOTP (base32)">
          <Input id="robot-totp" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" required />
        </FormField>
      )}
    </div>
  );
}

function AddRobotDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (c: EnrollmentCode) => void }) {
  const qc = useQueryClient();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [mfa, setMfa] = useState<'none' | 'totp'>('none');
  const [secret, setSecret] = useState('');
  const create = useMutation({
    mutationFn: () => api.createRobot(user.trim(), { abayaPassword: password, mfaMode: mfa, ...(mfa === 'totp' ? { totpSecret: secret } : {}) }),
    onSuccess: (c) => {
      toast.success(`${c.robotUser} creado`);
      void qc.invalidateQueries({ queryKey: ['robots'] });
      setUser('');
      setPassword('');
      setSecret('');
      setMfa('none');
      onCreated(c);
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudo crear el robot.')),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!create.isPending) create.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="gap-0 p-0 sm:max-w-[640px]">
        <form onSubmit={submit}>
          <DialogHeader className="px-6 pt-6 pb-4 text-left">
            <DialogTitle className="font-display text-lg font-semibold">Agregar robot</DialogTitle>
            <DialogDescription className="text-[13px] text-ink-muted">
              Credenciales del usuario robot en Abaya. Se guardan cifradas en el servidor y nunca se vuelven a mostrar.
            </DialogDescription>
            <ol className="mt-3 flex gap-2 text-xs font-medium text-ink-subtle" aria-label="Pasos">
              <li className="flex flex-1 flex-col gap-2 font-semibold text-ink before:h-1 before:rounded before:bg-primary">1. Datos de Abaya</li>
              <li className="flex flex-1 flex-col gap-2 before:h-1 before:rounded before:bg-surface-200">2. Instalar en el equipo</li>
            </ol>
          </DialogHeader>
          <div className="px-6 pb-6">
            <CredentialFields
              editing={false}
              {...{ user, setUser, password, setPassword, mfa, setMfa, secret, setSecret }}
            />
          </div>
          <DialogFooter className="border-t bg-surface-0 px-6 py-4">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={create.isPending}>
              Cancelar
            </Button>
            <ActionButton type="submit" loading={create.isPending} disabled={!user.trim() || !password || (mfa === 'totp' && !secret)}>
              Crear y generar código
            </ActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CredentialsDialog({ robotUser, onClose }: { robotUser: string | null; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [mfa, setMfa] = useState<'none' | 'totp'>('none');
  const [secret, setSecret] = useState('');
  const save = useMutation({
    mutationFn: () => {
      const creds: RobotCredentials = {};
      if (password) creds.abayaPassword = password;
      creds.mfaMode = mfa;
      if (mfa === 'totp') creds.totpSecret = secret;
      return api.robotCredentials(robotUser!, creds);
    },
    onSuccess: (r) => {
      toast.success(r.note || 'Credenciales actualizadas');
      setPassword('');
      setSecret('');
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err, 'No se pudieron guardar las credenciales.')),
  });
  return (
    <Dialog open={!!robotUser} onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-[560px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!save.isPending) save.mutate();
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4 text-left">
            <DialogTitle className="font-display text-lg font-semibold">Credenciales de {robotUser}</DialogTitle>
            <DialogDescription className="text-[13px] text-ink-muted">
              Las actuales nunca se muestran. Deja la contraseña vacía para conservarla; el equipo recibe lo nuevo en su siguiente arranque.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <CredentialFields editing user={robotUser ?? ''} setUser={() => undefined} {...{ password, setPassword, mfa, setMfa, secret, setSecret }} />
          </div>
          <DialogFooter className="border-t bg-surface-0 px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={save.isPending}>
              Cancelar
            </Button>
            <ActionButton type="submit" loading={save.isPending} disabled={mfa === 'totp' && !secret}>
              Guardar credenciales
            </ActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────── Detalle del robot (drawer) ───────────── */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="m-0 font-semibold break-words text-ink">{children}</dd>
    </>
  );
}

function RobotDetailSheet({ robotUser, range, onRange, onClose }: { robotUser: string | null; range: Range; onRange: (r: Range) => void; onClose: () => void }) {
  const me = useUser();
  const now = useNow(5000);
  const admin = me.role === 'ADMIN';
  const detail = useQuery({
    queryKey: keys.robot(robotUser ?? '', range),
    queryFn: () => api.robot(robotUser!, range),
    enabled: !!robotUser,
    refetchInterval: LIVE_MS,
  });
  const traces = useQuery({
    queryKey: keys.traces(robotUser ?? ''),
    queryFn: () => api.robotTraces(robotUser!),
    enabled: !!robotUser && admin,
  });
  const d = detail.data;
  const r = d?.robot;

  return (
    <Sheet open={!!robotUser} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-[760px]">
        <SheetHeader className="sticky top-0 z-10 flex-row flex-wrap items-center gap-3 border-b bg-surface-100 px-5 py-4 pr-12">
          <span className="grid size-9 place-items-center rounded-md bg-surface-200 text-ink-muted">
            <Monitor {...ICON} className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <SheetTitle className="font-display text-lg leading-6 font-semibold">{robotUser}</SheetTitle>
            <SheetDescription className="text-xs text-ink-subtle">{r ? (r.host ?? 'sin instalar') : 'Cargando…'}</SheetDescription>
          </div>
          {r && <RobotState status={r.status} />}
          {r?.paused && <Status tone="info" label="Pausado" icon={Pause} />}
          <Segmented label="Rango" value={range} onChange={onRange} items={RANGES.map((x) => ({ ...x, label: x.id === 'hoy' ? 'Hoy' : x.id === '7d' ? '7 días' : '30 días' }))} />
        </SheetHeader>

        <div className="flex flex-col gap-5 p-5">
          {detail.isLoading ? (
            <SkeletonRows rows={6} cols={3} />
          ) : detail.isError || !d || !r ? (
            <ErrorState message="No se pudo cargar el robot." onRetry={() => void detail.refetch()} retrying={detail.isFetching} />
          ) : (
            <>
              <Panel title="Ficha">
                <dl className="m-0 grid grid-cols-[160px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px] max-sm:grid-cols-1">
                  <Fact label="Equipo">{r.host ?? '—'}</Fact>
                  <Fact label="Versión">{r.version ? `v${r.version}` : '—'}</Fact>
                  <Fact label="Encendido desde">{r.status === 'APAGADO' ? '—' : fmtDateTime(r.startedAt)}</Fact>
                  <Fact label="Última señal">{fmtAgo(r.lastSeenAt, now)}</Fact>
                  <Fact label="Apagado">{fmtDateTime(r.stoppedAt)}</Fact>
                  <Fact label="Instalado">{r.installed ? fmtDateTime(r.enrolledAt) : 'No (modo .env o pendiente)'}</Fact>
                  <Fact label="MFA">{r.mfaMode === 'totp' ? 'TOTP' : 'Sin MFA'}</Fact>
                  <Fact label="Sesión en Abaya">
                    {d.session ? (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <SessionState status={d.session.status} />
                        <span className="font-medium text-ink-muted">
                          login {fmtDateTime(d.session.lastLoginAt)} · {d.session.consecutiveFails} fallos seguidos
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </Fact>
                  <Fact label="Arranque duplicado">
                    {r.lastRejectedAt ? `${r.lastRejectedHost ?? 'otro equipo'} · ${fmtDateTime(r.lastRejectedAt)} (rechazado)` : 'Ninguno'}
                  </Fact>
                </dl>
              </Panel>

              <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
                <Kpi
                  label="Chats abiertos"
                  value={`${d.openChats} / ${d.maxChatsPerRobot}`}
                  tone={d.openChats > d.maxChatsPerRobot ? 'danger' : undefined}
                  bar={(d.openChats / d.maxChatsPerRobot) * 100}
                />
                <Kpi
                  label="Respuesta p95"
                  value={fmtMs(d.response.p95Ms)}
                  tone={(d.response.p95Ms ?? 0) > SLOW_MS ? 'danger' : undefined}
                  foot={`p50 ${fmtMs(d.response.p50Ms)} · máx. ${fmtMs(d.response.maxMs)} · ${formatInt(d.response.samples)} muestras`}
                />
                <Kpi
                  label="Conversión"
                  value={fmtPct(d.metrics.conversionPct)}
                  foot={`${formatInt(d.metrics.sales)} ventas · ${formatInt(d.metrics.transferred)} transferidas · ${formatInt(d.metrics.conversations)} conversaciones`}
                />
              </div>

              <Panel title="Conversaciones por resultado" flush>
                <Table>
                  <TableBody>
                    {Object.entries(d.metrics.byStatus).length === 0 ? (
                      <TableRow>
                        <TableCell className="py-6 text-center text-ink-muted">Sin conversaciones en el rango.</TableCell>
                      </TableRow>
                    ) : (
                      Object.entries(d.metrics.byStatus).map(([k, v]) => (
                        <TableRow key={k}>
                          <TableCell>
                            {CONV_LABEL[k] ?? k} <span className="text-xs text-ink-subtle">· {k}</span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatInt(v)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Panel>

              <Panel title={`Rendimiento por acción · ${RANGE_LABEL[range].toLowerCase()}`} flush>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Acción</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">OK</TableHead>
                      <TableHead className="text-right">Errores</TableHead>
                      <TableHead className="text-right">Inciertas</TableHead>
                      <TableHead className="text-right">Bloqueadas</TableHead>
                      <TableHead className="text-right">p50</TableHead>
                      <TableHead className="text-right">p95</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.actions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-6 text-center text-ink-muted">
                          Sin acciones en el rango.
                        </TableCell>
                      </TableRow>
                    ) : (
                      d.actions.map((a) => (
                        <TableRow key={a.action}>
                          <TableCell>{actionLabel(a.action)}</TableCell>
                          <TableCell className="text-right">{formatInt(a.total)}</TableCell>
                          <TableCell className="text-right">{formatInt(a.ok)}</TableCell>
                          <TableCell className={cn('text-right', a.errors > 0 && 'font-semibold text-danger')}>{a.errors}</TableCell>
                          <TableCell className={cn('text-right', a.uncertain > 0 && 'font-semibold text-warning')}>{a.uncertain}</TableCell>
                          <TableCell className="text-right">{a.blocked}</TableCell>
                          <TableCell className="text-right">{fmtMs(a.p50)}</TableCell>
                          <TableCell className="text-right">{fmtMs(a.p95)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Panel>

              <Panel title="Trazas de error · últimos 7 días" flush>
                {!admin ? (
                  <div className="p-5">
                    <Callout tone="info">Requiere rol ADMIN: las trazas contienen pantallas de Abaya con datos de clientes.</Callout>
                  </div>
                ) : traces.isLoading ? (
                  <SkeletonRows rows={2} cols={3} />
                ) : (
                  <>
                    <p className="m-0 px-5 pt-4 text-xs text-ink-subtle">
                      Grabación técnica de cada acción fallida o incierta. Cada descarga queda en la auditoría. Se abre con{' '}
                      <code className="font-mono">npx playwright show-trace archivo.zip</code>.
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Referencia</TableHead>
                          <TableHead className="text-right">Tamaño</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(traces.data ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-6 text-center text-ink-muted">
                              Sin trazas: no hubo acciones fallidas o inciertas.
                            </TableCell>
                          </TableRow>
                        ) : (
                          traces.data!.map((t) => (
                            <TableRow key={t.ref}>
                              <TableCell>{fmtDateTime(t.at)}</TableCell>
                              <TableCell className="font-mono text-xs">{t.ref}</TableCell>
                              <TableCell className="text-right">{formatBytes(t.bytes)}</TableCell>
                              <TableCell className="text-right">
                                <a href={urls.trace(robotUser!, t.ref)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary-soft-ink hover:underline">
                                  <Download {...ICON} className="size-3.5" aria-hidden />
                                  Descargar
                                </a>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </>
                )}
              </Panel>

              <Panel title="Historial de acciones · últimas 100" flush>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Chat</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead className="text-right">Duración</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.recentActions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-ink-muted">
                          Sin acciones registradas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      d.recentActions.map((a, i) => (
                        <TableRow key={`${a.createdAt}-${i}`}>
                          <TableCell>{fmtDateTime(a.createdAt)}</TableCell>
                          <TableCell>{actionLabel(a.action)}</TableCell>
                          <TableCell>{a.abayaChatId ?? '—'}</TableCell>
                          <TableCell>
                            <ActionResult result={a.result} />
                          </TableCell>
                          <TableCell className="text-right">{fmtMs(a.durationMs)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Panel>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
