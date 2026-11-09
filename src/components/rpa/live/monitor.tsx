/**
 * Monitor en vivo (RobotRPA D-032, solo ADMIN): qué hace cada robot en este momento, sus chats con
 * los mensajes en tiempo real y «Ver pantalla» (el navegador del robot, solo mirar). Muestra
 * mensajes reales y datos de clientes, como Trazabilidad: el servidor audita cada apertura del
 * tablero, de un chat y de la pantalla (con su duración).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Eye,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Mic,
  Monitor,
  MonitorPlay,
  Pause,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtAgo, formatTime } from '@/lib/format';
import { PROCESO_LABEL } from '@/lib/tipificaciones';
import { CONV_LABEL, sentimentText } from '@/lib/labels';
import type { LiveBoard, LiveChat, LiveChatCard, LiveRobot, RobotActivityKind } from '@/lib/api';
import { useLiveStream, useScreenStream, type LiveState } from '@/hooks/use-live';
import { useNow } from '@/hooks/queries';
import { ActionButton, Callout, Count, Empty, ICON, LiveIndicator, Panel, SkeletonRows } from '../common';
import { RobotState, Status } from '../status';
import { TraceChat } from '../trazabilidad/trace-chat';
import { ChatId } from '../trazabilidad/parts';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ACTIVITY_LABEL: Record<RobotActivityKind, string> = {
  IDLE: 'Libre, esperando mensajes',
  SEND: 'Escribiendo y enviando',
  OPEN_CHAT: 'Abriendo un chat',
  TRANSFER: 'Transfiriendo al backoffice',
  CLOSE: 'Cerrando un chat',
  READ_INBOX: 'Revisando la bandeja',
  AGENT_STATE: 'Cambiando su estado en Avaya',
  MAINTENANCE: 'Mantenimiento del navegador',
};

/** El cliente lleva esto esperando respuesta: se resalta. */
const WAIT_WARN_MS = 60_000;

const streamText = (s: LiveState, paused: boolean) =>
  paused ? 'En pausa (pestaña oculta)' : s === 'open' ? 'En vivo' : s === 'closed' ? 'Desconectado' : 'Conectando…';

/** Panel del monitor para la página En vivo. */
export function LiveMonitor({ locked }: { locked?: string }) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [screenOf, setScreenOf] = useState<string | null>(null);
  const live = useLiveStream(!locked, chatId);
  const now = useNow(1000);

  if (locked) {
    return (
      <Panel title="Monitor en vivo" icon={MonitorPlay}>
        <Empty icon={Lock} title="Solo para ADMIN">
          {locked} Aquí se ven los chats de cada robot en tiempo real y su pantalla.
        </Empty>
      </Panel>
    );
  }

  const b = live.board;
  const openChats = b?.robots.reduce((n, r) => n + r.chats.filter((c) => !c.closed).length, 0) ?? 0;

  return (
    <>
      <Panel
        title="Monitor en vivo"
        icon={MonitorPlay}
        badge={b ? <Count active>{openChats}</Count> : undefined}
        actions={
          <>
            <LiveIndicator text={streamText(live.state, live.paused)} />
            {live.state === 'closed' && !live.paused && (
              <ActionButton variant="secondary" size="sm" icon={RefreshCw} onClick={live.retry}>
                Reconectar
              </ActionButton>
            )}
          </>
        }
        flush
      >
        <p className="m-0 border-b px-5 py-2.5 text-xs text-ink-subtle">
          Solo mirar: desde aquí no se escribe ni se hace clic en Avaya. Para intervenir, pausa el robot en Robots. Cada vista queda en Auditoría.
        </p>
        {!b ? (
          live.state === 'closed' && !live.paused ? (
            <div className="p-5">
              <Callout tone="warning">No se pudo abrir el monitor. Si tu sesión venció, vuelve a entrar.</Callout>
            </div>
          ) : (
            <SkeletonRows rows={3} cols={3} />
          )
        ) : b.robots.length === 0 ? (
          <Empty icon={Monitor} title="Sin robots registrados">
            Agrega un robot en Robots para verlo aquí.
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-4 p-5 max-lg:grid-cols-1 min-[1700px]:grid-cols-3">
            {b.robots.map((r) => (
              <RobotCard key={r.robotUser} robot={r} now={now} onOpenChat={setChatId} onScreen={() => setScreenOf(r.robotUser)} />
            ))}
          </div>
        )}
      </Panel>

      <LiveChatSheet chatId={chatId} chat={live.chat} board={b} state={live.state} paused={live.paused} onClose={() => setChatId(null)} />
      <ScreenDialog robotUser={screenOf} board={b} onClose={() => setScreenOf(null)} />
    </>
  );
}

function RobotCard({
  robot: r,
  now,
  onOpenChat,
  onScreen,
}: {
  robot: LiveRobot;
  now: number;
  onOpenChat: (id: string) => void;
  onScreen: () => void;
}) {
  const open = r.chats.filter((c) => !c.closed);
  const closed = r.chats.filter((c) => c.closed);
  const offline = r.status === 'APAGADO' || r.status === 'SIN_SENAL' || r.status === 'DESHABILITADO';
  return (
    <article className="flex min-w-0 flex-col rounded-md border bg-surface-0" aria-label={`Robot ${r.robotUser}`}>
      <header className="flex flex-wrap items-center gap-2.5 border-b px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-200 text-ink-muted">
          <Monitor {...ICON} className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block truncate font-display text-[15px] leading-5 font-semibold text-ink">{r.robotUser}</b>
          <small className="block truncate text-xs text-ink-subtle">{r.host ?? 'equipo sin registrar'}</small>
        </div>
        <RobotState status={r.status} />
        {r.paused && <Status tone="info" label="Pausado" icon={Pause} />}
        <ActionButton
          variant="secondary"
          size="sm"
          icon={Eye}
          onClick={onScreen}
          reason={offline ? 'El robot no está en línea: no hay pantalla que mostrar' : undefined}
        >
          Ver pantalla
        </ActionButton>
      </header>

      <Activity robot={r} now={now} />

      {open.length === 0 && closed.length === 0 ? (
        <p className="m-0 px-4 py-6 text-center text-[13px] text-ink-muted">Sin chats asignados.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {[...open, ...closed].map((c) => (
            <ChatRow key={c.id} chat={c} now={now} working={r.activity?.abayaChatId === c.abayaChatId && r.activity.action !== 'IDLE'} onOpen={() => onOpenChat(c.id)} />
          ))}
        </ul>
      )}
    </article>
  );
}

function Activity({ robot: r, now }: { robot: LiveRobot; now: number }) {
  // La actividad vence en el servidor a los 60 s sin noticias del robot: null = no hay datos.
  const fresh = r.activity;
  if (!fresh) {
    return (
      <div className="flex items-center gap-2 border-b px-4 py-2 text-xs text-ink-subtle">
        <WifiOff {...ICON} className="size-3.5" aria-hidden />
        Sin datos de actividad (robot apagado, sin conexión o con una versión anterior)
      </div>
    );
  }
  const busy = fresh.action !== 'IDLE';
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-2 text-xs', busy ? 'text-primary-soft-ink' : 'text-ink-muted')} role="status">
      <span className={cn('ai-dot', busy && 'ai-dot--pulse')} aria-hidden />
      <b className="font-semibold">{ACTIVITY_LABEL[fresh.action]}</b>
      {fresh.abayaChatId && (
        <span>
          · chat <span className="font-mono tabular-nums">{fresh.abayaChatId}</span>
        </span>
      )}
      <span className="tabular-nums text-ink-subtle">· {busy ? `desde ${fmtAgo(fresh.since, now).replace('hace ', '')}` : fmtAgo(fresh.since, now)}</span>
      <span className="ml-auto text-ink-subtle">{code(fresh.action)}</span>
      {fresh.queued > 1 && <span className="tabular-nums text-ink-subtle">· {fresh.queued - 1} en fila</span>}
    </div>
  );
}

const code = (c: string) => <span className="font-mono text-[10.5px] tracking-[.04em]">{c}</span>;

function ChatRow({ chat: c, now, working, onOpen }: { chat: LiveChatCard; now: number; working: boolean; onOpen: () => void }) {
  const m = c.lastMessage;
  const waitMs = m ? now - Date.parse(m.at) : 0;
  const clientWaits = c.turn === 'ROBOT' && !c.closed;
  return (
    <li className="border-b last:border-b-0">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 text-left outline-none hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-ring',
          c.closed && 'opacity-70',
        )}
        aria-label={`Ver en vivo el chat ${c.abayaChatId}`}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <b className="truncate font-semibold text-ink">{c.customerName ?? `Chat ${c.abayaChatId}`}</b>
          <span className="font-mono text-[11px] text-ink-subtle tabular-nums">{c.abayaChatId}</span>
          {c.process && <span className="text-xs text-ink-muted">{PROCESO_LABEL[c.process]}</span>}
        </span>
        <span className="flex items-center gap-1.5 justify-self-end">
          {c.closed ? (
            <Status tone="neutral" label={`${CONV_LABEL[c.status] ?? c.status} · ${c.status}`} dot={false} />
          ) : (
            <span className="inline-flex h-[22px] items-center rounded-sm bg-surface-200 px-2 font-mono text-[10.5px] font-semibold tracking-[.05em] text-ink-muted">{c.stage}</span>
          )}
          <ArrowUpRight {...ICON} className="size-4 text-ink-subtle" aria-hidden />
        </span>

        <span className="col-span-2 flex min-w-0 items-start gap-1.5 text-[13px] leading-[18px] text-ink-muted">
          {m ? (
            <>
              <b className="shrink-0 font-semibold text-ink">{m.from === 'bot' ? 'Robot:' : 'Cliente:'}</b>
              {m.image && <ImageIcon {...ICON} className="mt-0.5 size-3.5 shrink-0" aria-label="con imagen de planes" />}
              {m.audio && <Mic {...ICON} className="mt-0.5 size-3.5 shrink-0" aria-label="nota de voz" />}
              <span className="line-clamp-2 min-w-0 break-words">{m.text || (m.audio ? 'Nota de voz' : '—')}</span>
            </>
          ) : (
            <span className="text-ink-subtle">Sin mensajes todavía</span>
          )}
        </span>

        <span className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
          {working && (
            <span className="inline-flex items-center gap-1 font-semibold text-primary-soft-ink">
              <span className="ai-typing" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              el robot está actuando aquí
            </span>
          )}
          {!c.closed && m && (
            <span className={cn('inline-flex items-center gap-1', clientWaits && waitMs > WAIT_WARN_MS ? 'font-semibold text-warning' : 'text-ink-subtle')}>
              <Clock {...ICON} className="size-3.5" aria-hidden />
              {clientWaits ? `Cliente espera respuesta · ${fmtAgo(m.at, now).replace('hace ', '')}` : `Esperando al cliente · ${fmtAgo(m.at, now)}`}
            </span>
          )}
          {c.closed && <span className="text-ink-subtle">Cerrado {fmtAgo(c.updatedAt, now)}</span>}
          {c.pendingSends > 0 && <span className="text-ink-muted">{c.pendingSends} por enviar</span>}
          {c.uncertainSends > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-warning">
              <AlertTriangle {...ICON} className="size-3.5" aria-hidden />
              {c.uncertainSends} envío{c.uncertainSends === 1 ? '' : 's'} incierto{c.uncertainSends === 1 ? '' : 's'}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function LiveChatSheet({
  chatId,
  chat,
  board,
  state,
  paused,
  onClose,
}: {
  chatId: string | null;
  chat: LiveChat | null;
  board: LiveBoard | null;
  state: LiveState;
  paused: boolean;
  onClose: () => void;
}) {
  const card = board?.robots.flatMap((r) => r.chats).find((c) => c.id === chatId);
  const c = chat && chat.id === chatId ? chat : null;
  return (
    <Sheet open={!!chatId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-hidden p-0 sm:max-w-[620px]">
        <SheetHeader className="flex-row flex-wrap items-center gap-3 border-b bg-surface-100 px-5 py-4 pr-12">
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate font-display text-lg leading-6 font-semibold">
              {c?.customerName ?? card?.customerName ?? (card ? `Chat ${card.abayaChatId}` : 'Chat en vivo')}
            </SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-x-2 text-xs text-ink-subtle">
              {c ? (
                <>
                  <span>{c.robotUser}</span>·<ChatId id={c.abayaChatId} />
                  {c.process && <>· {PROCESO_LABEL[c.process]}</>}
                </>
              ) : (
                'Cargando…'
              )}
            </SheetDescription>
          </div>
          <LiveIndicator text={streamText(state, paused)} />
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {!c ? (
            state === 'closed' && !paused ? (
              <Callout tone="warning">No se pudo abrir este chat: puede que ya no exista o que tu sesión haya vencido.</Callout>
            ) : (
              <SkeletonRows rows={6} cols={1} />
            )
          ) : (
            <>
              <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
                <Fact label="Estado">
                  {c.closed ? `${CONV_LABEL[c.status] ?? c.status} · ` : 'En curso · '}
                  {code(c.status)}
                </Fact>
                <Fact label="Etapa">{code(c.stage)}</Fact>
                <Fact label="Operador">{c.currentOperator ?? '—'}</Fact>
                <Fact label="Uso">{c.declaredUse ?? '—'}</Fact>
                <Fact label="Sentimiento">{sentimentText(c.sentiment, c.sentimentWorst) ?? '—'}</Fact>
                <Fact label="Inicio">{formatTime(c.createdAt)}</Fact>
              </dl>
              <TraceChat
                messages={c.messages}
                events={[]}
                title={c.customerName ?? `Chat ${c.abayaChatId}`}
                subtitle={`${c.robotUser} · ${c.messages.length} mensajes`}
                height={560}
                empty={c.contentPurged ? 'El contenido se borró por retención.' : 'Sin mensajes todavía.'}
                badge={<LiveIndicator text="En vivo" />}
              />
              <Link
                to="/trazabilidad/$id"
                params={{ id: c.id }}
                search={{}}
                className="inline-flex items-center gap-1 self-start text-[13px] font-semibold text-primary-soft-ink hover:underline"
              >
                Ver el detalle completo en Trazabilidad
                <ArrowUpRight {...ICON} className="size-3.5" aria-hidden />
              </Link>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="m-0 min-w-0 truncate text-ink">{children}</dd>
    </>
  );
}

/** Una imagen más vieja que esto se marca como congelada. */
const FRAME_STALE_MS = 12_000;
/** Sin primera imagen en este tiempo, se explica por qué puede ser. */
const FIRST_FRAME_HINT_MS = 10_000;

function ScreenDialog({ robotUser, board, onClose }: { robotUser: string | null; board: LiveBoard | null; onClose: () => void }) {
  const screen = useScreenStream(robotUser);
  const now = useNow(1000);
  const [openedAt, setOpenedAt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (robotUser) setOpenedAt(Date.now());
  }, [robotUser]);
  const robot = board?.robots.find((r) => r.robotUser === robotUser);
  const f = screen.frame;
  const age = f ? now - Date.parse(f.at) : null;
  const frozen = age !== null && age > FRAME_STALE_MS;

  return (
    <Dialog open={!!robotUser} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-3 overflow-y-auto sm:max-w-[min(1240px,calc(100%-2rem))]">
        <DialogHeader className="flex-row flex-wrap items-center gap-3 pr-8">
          <span className="grid size-9 place-items-center rounded-md bg-surface-200 text-ink-muted">
            <MonitorPlay {...ICON} className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="font-display text-lg leading-6 font-semibold">Pantalla de {robotUser}</DialogTitle>
            <DialogDescription className="text-xs text-ink-subtle">
              {robot?.host ?? 'equipo'} · el navegador del robot en Avaya · solo mirar
            </DialogDescription>
          </div>
          {robot && <RobotState status={robot.status} />}
          <LiveIndicator
            text={
              screen.paused
                ? 'En pausa (pestaña oculta)'
                : f
                  ? `${frozen ? 'Sin cambios' : 'En vivo'} · imagen ${fmtAgo(f.at, now)}`
                  : streamText(screen.state, screen.paused)
            }
          />
          <ActionButton
            variant="secondary"
            size="sm"
            icon={Maximize2}
            disabled={!f}
            onClick={() => void box.current?.requestFullscreen?.().catch(() => undefined)}
          >
            Pantalla completa
          </ActionButton>
        </DialogHeader>

        <div ref={box} className="relative grid aspect-video w-full place-items-center overflow-hidden rounded-md border bg-navy">
          {f ? (
            <img
              src={`data:image/jpeg;base64,${f.jpeg}`}
              width={f.width}
              height={f.height}
              alt={`Pantalla del robot ${robotUser} a las ${formatTime(f.at, true)}`}
              className={cn('size-full object-contain', frozen && 'opacity-80')}
              draggable={false}
            />
          ) : screen.state === 'closed' && !screen.paused ? (
            <p className="m-0 max-w-[420px] px-6 text-center text-[13px] text-on-navy">No se pudo abrir la pantalla. Revisa que el robot exista y que tu sesión siga activa.</p>
          ) : (
            <p className="m-0 max-w-[460px] px-6 text-center text-[13px] text-on-navy">
              {openedAt && now - openedAt > FIRST_FRAME_HINT_MS
                ? 'El robot no ha enviado imagen. Puede estar apagado, sin conexión, con Avaya cerrado o con una versión anterior a la pantalla en vivo.'
                : 'Pidiendo la pantalla al robot…'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-subtle">
          <span className="inline-flex items-center gap-1">
            <Lock {...ICON} className="size-3.5" aria-hidden />
            Solo mirar: no se puede hacer clic ni escribir aquí. Para intervenir, pausa el robot.
          </span>
          <span>El robot transmite solo mientras esta ventana está abierta; las imágenes no se guardan. Queda en Auditoría.</span>
          {f && (
            <span className="ml-auto tabular-nums">
              {f.width} × {f.height}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
