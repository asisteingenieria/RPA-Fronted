/**
 * Trazabilidad → detalle de una conversación (D-002; kit: reference/trazabilidad/screens/trazabilidad-detalle).
 * Página completa (no drawer). Al abrirla, el servidor escribe CONVERSATION_VIEWED en Auditoría.
 * Datos: /admin/conversations/:id (con los filtros de la lista para anterior/siguiente).
 */
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  Link2,
  Package,
  RotateCcw,
  Send,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/auth/session';
import { ApiError, api, download, errorMessage, urls, type ConversationDetail } from '@/lib/api';
import { fmtMs, formatCOP, formatInt, fmtWhen, formatTime } from '@/lib/format';
import { actionLabel } from '@/lib/labels';
import { viewConversationsReason } from '@/lib/roles';
import { LLM_RESULT, PROCESO_LABEL } from '@/lib/tipificaciones';
import { toFilters, type TraceSearch } from '@/lib/trace-search';
import { cn } from '@/lib/utils';
import { ActionButton, Callout, CampaignChip, ErrorState, ICON, Panel } from '@/components/rpa/common';
import { ActionResult } from '@/components/rpa/status';
import { ChatId, StageTrail, Typification } from '@/components/rpa/trazabilidad/parts';
import { TraceChat } from '@/components/rpa/trazabilidad/trace-chat';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TraceNoAccess } from './trazabilidad';

/** Refresco del detalle de una conversación que sigue abierta (pausado con la pestaña oculta). */
const OPEN_REFRESH_MS = 10_000;

export function TrazabilidadDetallePage() {
  const me = useUser();
  const { id } = useParams({ strict: false }) as { id: string };
  const search = useSearch({ strict: false }) as TraceSearch;
  const navigate = useNavigate();
  const locked = viewConversationsReason(me);

  const q = useQuery({
    queryKey: ['conversation', id, search],
    queryFn: () => api.conversation(id, toFilters(search, false)),
    enabled: !locked,
    refetchInterval: (query) => (query.state.data && !query.state.data.closed ? OPEN_REFRESH_MS : false),
  });
  const [downloading, setDownloading] = useState(false);
  const d = q.data;
  const go = (target: string | null | undefined) =>
    target && void navigate({ to: '/trazabilidad/$id', params: { id: target }, search: (prev: TraceSearch) => prev });

  const downloadTranscript = async () => {
    if (!d) return;
    setDownloading(true);
    try {
      await download(urls.transcript(d.id), `transcripcion-${d.abayaChatId}.txt`);
      toast.success('Transcripción descargada', { description: 'Quedó registrada en Auditoría.' });
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo descargar la transcripción.'));
    } finally {
      setDownloading(false);
    }
  };

  if (locked || (q.error instanceof ApiError && q.error.status === 403)) return <TraceNoAccess />;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Ruta" className="flex items-center gap-1.5 text-[13px]">
          <ChevronLeft {...ICON} className="size-3.5 text-ink-subtle" aria-hidden />
          <Link to="/trazabilidad" search={search} className="font-semibold text-primary-soft-ink hover:underline">
            Trazabilidad
          </Link>
          <span className="text-ink-subtle">/</span>
          <b className="font-semibold text-ink">{d?.abayaChatId ?? id}</b>
        </nav>
        <div className="flex flex-wrap items-center gap-2.5">
          {d?.nav && (
            <span className="text-xs text-ink-muted tabular-nums">
              {formatInt(d.nav.index)} de {formatInt(d.nav.total)} en el filtro
            </span>
          )}
          <NavButton label="Conversación anterior" icon={ChevronLeft} disabled={!d?.nav?.prevId} onClick={() => go(d?.nav?.prevId)} />
          <NavButton label="Conversación siguiente" icon={ChevronRight} disabled={!d?.nav?.nextId} onClick={() => go(d?.nav?.nextId)} />
          <ActionButton
            variant="secondary"
            icon={Download}
            loading={downloading}
            reason={d?.contentPurged ? 'El contenido se borró por retención' : undefined}
            onClick={() => void downloadTranscript()}
            title="Queda en Auditoría"
          >
            Descargar transcripción
          </ActionButton>
        </div>
      </div>

      {q.isError ? (
        <section className="rounded-lg border bg-surface-100 shadow-card">
          <ErrorState
            message={q.error instanceof ApiError && q.error.status === 404 ? 'Esta conversación no existe.' : errorMessage(q.error, 'No pudimos cargar la conversación.')}
            onRetry={q.error instanceof ApiError && q.error.status === 404 ? undefined : () => void q.refetch()}
            retrying={q.isFetching}
          />
        </section>
      ) : !d ? (
        <DetailSkeleton />
      ) : (
        <Detail d={d} />
      )}
    </>
  );
}

function NavButton({ label, icon: I, disabled, onClick }: { label: string; icon: typeof ChevronLeft; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-[38px] cursor-pointer place-items-center rounded-md border bg-surface-100 text-ink hover:bg-surface-200 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <I {...ICON} className="size-4" aria-hidden />
    </button>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const Missing = ({ title, text = '—' }: { title: string; text?: string }) => (
  <span className="text-ink-subtle" title={title}>
    {text}
  </span>
);

function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="m-0 grid grid-cols-[150px_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[13px] leading-[18px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-muted">{k}</dt>
          <dd className="m-0 min-w-0 font-medium break-words text-ink">{v ?? <span className="text-ink-subtle">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

const Code = ({ children }: { children: ReactNode }) => (
  <span className="rounded-sm bg-cat-tyt-soft px-1.5 py-px font-mono text-xs font-semibold text-cat-tyt">{children}</span>
);

function Detail({ d }: { d: ConversationDetail }) {
  const regenerations = d.llmCalls.filter((c) => c.result === 'REGENERATED' || c.result === 'SAFE_REPLY').length;
  // Un envío incierto aparece como acción del robot y como mensaje: se cuenta una vez.
  const uncertain = Math.max(
    d.rpaActions.filter((a) => a.result === 'UNCERTAIN').length,
    d.messages.filter((m) => m.delivery?.status === 'UNCERTAIN').length,
  );
  const facts: [string, string][] = [
    ['Robot', d.robotUser],
    ['Guion', d.agentVersion ? `v${d.agentVersion}` : '—'],
    ['Inicio', fmtWhen(d.createdAt)],
    ['Fin', d.closed && d.updatedAt ? fmtWhen(d.updatedAt) : 'En curso'],
    ['Duración', d.closed ? fmtMs(d.durationMs) : '—'],
    ['1.ª respuesta', fmtMs(d.firstResponseMs)],
    ['Mensajes', `↓ ${d.inbound} entrantes · ↑ ${d.outbound} salientes`],
  ];

  return (
    <>
      <Callout tone="info" icon={Shield}>
        Abriste la conversación {d.abayaChatId}. Queda registrado en Auditoría (CONVERSATION_VIEWED) con tu usuario y la hora.
      </Callout>

      <section className="rounded-lg border bg-surface-100 shadow-card">
        <div className="grid items-start gap-x-6 gap-y-4 px-6 py-5 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 font-display text-[22px] leading-7 font-semibold text-ink">{d.customerName ?? 'Cliente sin nombre'}</h1>
              <ChatId id={d.abayaChatId} />
              <Typification code={d.status} showCode />
              <CampaignChip />
            </div>
            <dl className="m-0 flex flex-wrap gap-x-9 gap-y-4">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs leading-4 font-medium text-ink-subtle">{k}</dt>
                  <dd className="m-0 mt-1 font-semibold text-ink tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <div>
              <div className="mb-2 text-[11px] leading-[14px] font-semibold tracking-[.06em] text-ink-subtle uppercase">Recorrido</div>
              <StageTrail path={d.stagePath} {...(d.closed ? { exit: d.status } : {})} />
              <p className="mt-2 mb-0 text-xs text-ink-subtle">
                Aproximado: se arma con las etapas de las llamadas al modelo y la etapa final (el historial de etapas no se guarda).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">
              <RotateCcw {...ICON} aria-hidden />
              {plural(regenerations, 'regeneración', 'regeneraciones')}
            </Badge>
            <Badge variant={uncertain ? 'warning' : 'neutral'}>
              <Send {...ICON} aria-hidden />
              {plural(uncertain, 'envío incierto', 'envíos inciertos')}
            </Badge>
          </div>
        </div>
      </section>

      {d.contentPurged && (
        <Callout tone="warning" icon={Trash2}>
          El contenido de esta conversación se borró por la política de retención{d.contentPurgedAt ? ` el ${fmtWhen(d.contentPurgedAt)}` : ''}. Se conservan
          la tipificación, la venta y los tiempos.
        </Callout>
      )}

      <div className="grid items-start gap-5 min-[1180px]:grid-cols-[minmax(0,1fr)_400px]">
        <TraceChat
          messages={d.messages}
          events={d.events}
          title={`${d.customerName ?? 'Cliente'} · ${d.abayaChatId}`}
          subtitle={`Conversación real · solo lectura · ${d.robotUser}`}
          empty={d.contentPurged ? 'Mensajes borrados por retención.' : 'Esta conversación todavía no tiene mensajes.'}
        />
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Cliente" icon={Users}>
            <KV
              rows={[
                ['Nombre', d.profile.name],
                ['Teléfono', <Missing key="tel" title="El robot no guarda el teléfono (solo un hash). Dato faltante." text="— no se guarda" />],
                ['Operador actual', d.profile.currentOperator],
                ['Uso declarado', d.profile.declaredUse],
                ['Proceso', d.profile.process ? PROCESO_LABEL[d.profile.process] : null],
              ]}
            />
          </Panel>
          {d.sale && (
            <Panel
              title="Venta"
              icon={CheckCircle2}
              badge={
                <Badge variant="success">
                  <span className="ai-dot" aria-hidden />
                  {d.sale.transferredAt ? 'Transferida' : 'Aceptada'}
                </Badge>
              }
            >
              <KV
                rows={[
                  ['Plan aceptado', <Code key="p">{d.sale.planCode}</Code>],
                  ['Transferencia', d.sale.transferredAt ? fmtWhen(d.sale.transferredAt) : null],
                  [
                    'Nota interna',
                    d.sale.internalNoteOk ? (
                      <Badge key="n" variant="success">
                        <Check {...ICON} aria-hidden />
                        OK
                      </Badge>
                    ) : (
                      <Badge key="n" variant="warning">
                        Sin confirmar
                      </Badge>
                    ),
                  ],
                  ['Después', <Missing key="d" title="Lo que pasa en el backoffice vive en Abaya. Dato faltante." text="— vive en Abaya (backoffice)" />],
                ]}
              />
              {d.sale.backofficeSummary && (
                <div className="mt-4">
                  <div className="mb-1.5 text-[11px] leading-[14px] font-semibold tracking-[.06em] text-ink-subtle uppercase">Resumen para el backoffice</div>
                  <p className="m-0 rounded-sm bg-surface-200 px-3 py-2 text-[13px] whitespace-pre-wrap text-ink">{d.sale.backofficeSummary}</p>
                </div>
              )}
            </Panel>
          )}
          {d.consent && (
            <Panel
              title="Consentimiento"
              icon={Shield}
              badge={
                d.consent.chainVerified ? (
                  <Badge variant="success">
                    <Shield {...ICON} aria-hidden />
                    Registro verificado
                  </Badge>
                ) : (
                  <Badge variant="danger" title="El hash guardado no coincide con la respuesta descifrada (o el contenido se borró).">
                    No verifica
                  </Badge>
                )
              }
            >
              <KV
                rows={[
                  ['Respuesta exacta', d.consent.answer ? <Code key="a">{d.consent.answer}</Code> : null],
                  ['Hora', fmtWhen(d.consent.at)],
                  ['Plantilla legal', `texto legal ${d.consent.legalTemplateVersion}`],
                  ['Hash', <span key="h" className="font-mono text-xs break-all">{d.consent.hash}</span>],
                ]}
              />
            </Panel>
          )}
          <Panel title="Catálogo usado" icon={Package} flush actions={<span className="text-xs text-ink-muted">{d.brainVersion ? `Brain ${d.brainVersion}` : '—'}</span>}>
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Precio mostrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.knowledgeUsage.length ? (
                  d.knowledgeUsage.map((k, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatTime(k.at)}</TableCell>
                      <TableCell>
                        <Code>{k.planCode}</Code>
                      </TableCell>
                      <TableCell>{k.priceShown != null ? formatCOP(k.priceShown) : '—'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="py-5 text-center text-ink-muted">
                      No se mostró ningún precio.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Panel>
        </div>
      </div>

      <div className="grid items-start gap-5 min-[1180px]:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Motor · llamadas al modelo por etapa" icon={Cpu} flush actions={<span className="text-xs text-ink-muted">Por etapa</span>}>
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Latencia</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.llmCalls.length ? (
                  d.llmCalls.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <span className="text-[11px] font-semibold tracking-[.05em] text-ink-muted">{c.stage}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.model}</TableCell>
                      <TableCell>{fmtMs(c.latencyMs)}</TableCell>
                      <TableCell>{formatInt(c.tokens)}</TableCell>
                      <TableCell>
                        <span className={cn('rounded-sm px-2 py-0.5 text-xs font-semibold', LLM_RESULT[c.result].cls)}>{LLM_RESULT[c.result].label}</span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-5 text-center text-ink-muted">
                      Sin llamadas al modelo: todas las respuestas salieron de plantillas del sistema.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Panel>
          <Callout tone="info">
            El origen exacto de cada respuesta (plantilla, modelo o regenerada) se muestra por etapa: hoy LlmCall no guarda el id del mensaje. Dato
            faltante.
          </Callout>
        </div>
        <Panel title="Acciones del robot en Abaya" icon={Bot} flush actions={<span className="text-xs text-ink-muted">RpaActionLog · {plural(d.rpaActions.length, 'acción', 'acciones')}</span>}>
          <Table className="text-[13px]">
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.rpaActions.length ? (
                d.rpaActions.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{formatTime(a.at, true)}</TableCell>
                    <TableCell>{actionLabel(a.action)}</TableCell>
                    <TableCell>
                      <ActionResult result={a.result} />
                    </TableCell>
                    <TableCell>{fmtMs(a.durationMs)}</TableCell>
                    <TableCell className="text-right">
                      {a.traceRef && (
                        <a
                          href={urls.trace(d.robotUser, a.traceRef)}
                          download
                          className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary-soft-ink hover:underline"
                          title="Descarga la traza del error (queda en Auditoría)"
                        >
                          <Link2 {...ICON} className="size-3.5" aria-hidden />
                          Ver traza
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-5 text-center text-ink-muted">
                    Sin acciones registradas para este chat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando la conversación">
      <Skeleton className="h-[170px] rounded-lg bg-surface-200" />
      <div className="grid gap-5 min-[1180px]:grid-cols-[minmax(0,1fr)_400px]">
        <Skeleton className="h-[600px] rounded-lg bg-surface-200" />
        <div className="flex flex-col gap-5">
          <Skeleton className="h-[200px] rounded-lg bg-surface-200" />
          <Skeleton className="h-[180px] rounded-lg bg-surface-200" />
          <Skeleton className="h-[160px] rounded-lg bg-surface-200" />
        </div>
      </div>
    </div>
  );
}
