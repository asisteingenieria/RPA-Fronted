/**
 * Agente → Consumo: tokens de los modelos por uso, modelo y día, y costo ESTIMADO con la tarifa
 * configurada en el servidor (MODEL_PRICES_USD). Solo cifras, sin contenido: la ven ambos roles.
 * La factura oficial es la del proveedor (la API key no da acceso al estado de cuenta).
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Coins, Cpu, Info, MessagesSquare, ShoppingBag } from 'lucide-react';
import { api, type Range, type UsageSummary, type UsageUse } from '@/lib/api';
import { formatDate, formatInt } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Callout, Empty, ErrorState, Kpi, Panel, Segmented, SkeletonRows } from '@/components/rpa/common';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const USE_LABEL: Record<UsageUse, string> = {
  CHAT: 'Conversaciones',
  VOICE: 'Notas de voz',
  IMAGE_READ: 'Lectura de imágenes',
  EMBEDDING: 'Búsqueda en Brains',
  EVAL: 'Evaluaciones',
  TEST: 'Probar agente',
};
const USE_HELP: Record<UsageUse, string> = {
  CHAT: 'Respuestas del agente a clientes reales',
  VOICE: 'Transcripción de notas de voz de clientes',
  IMAGE_READ: 'Lectura de los planes en las imágenes del Brain',
  EMBEDDING: 'Embeddings de documentos y consultas (aproximado)',
  EVAL: 'Suite de evaluación del agente y de los Brains',
  TEST: 'Turnos y notas de voz de la simulación del panel',
};
/** Color de cada uso en las barras (siempre con su nombre al lado: nunca solo color). */
const USE_BAR: Record<UsageUse, string> = {
  CHAT: 'bg-primary',
  VOICE: 'bg-cat-tyt',
  IMAGE_READ: 'bg-cat-movil',
  EMBEDDING: 'bg-cat-tecnologia',
  EVAL: 'bg-warning',
  TEST: 'bg-cyan',
};
const USES = Object.keys(USE_LABEL) as UsageUse[];

const RANGES: { id: Range; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
];

const USD = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });
const fmtUsd = (v: number | null) => (v === null ? '—' : USD.format(v));
/** 1.234.567 → «1,2 M»; menos de 10.000, el número completo. */
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  if (n >= 10_000) return `${(n / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} k`;
  return formatInt(n);
}

export function UsageTab() {
  const [range, setRange] = useState<Range>('7d');
  const q = useQuery({ queryKey: ['usage', range], queryFn: () => api.usage(range), refetchInterval: 60_000 });
  const d = q.data;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 max-w-[720px] text-[13px] text-ink-muted">
          Tokens que gastan los modelos en cada uso del agente. El costo es un <b>estimado</b> con la tarifa configurada en el servidor; la cifra oficial es la
          factura del proveedor.
        </p>
        <Segmented label="Rango" value={range} onChange={setRange} items={RANGES} />
      </div>

      {q.isLoading ? (
        <SkeletonRows rows={6} cols={4} />
      ) : q.isError || !d ? (
        <ErrorState message="No se pudo cargar el consumo." onRetry={() => void q.refetch()} retrying={q.isFetching} />
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
            <Kpi
              label="Tokens"
              icon={Cpu}
              value={fmtTokens(d.totals.inputTokens + d.totals.outputTokens)}
              foot={`${fmtTokens(d.totals.inputTokens)} de entrada · ${fmtTokens(d.totals.outputTokens)} de salida`}
            />
            <Kpi label="Llamadas a los modelos" icon={BarChart3} value={formatInt(d.totals.calls)} />
            <Kpi
              label="Costo estimado"
              icon={Coins}
              value={fmtUsd(d.totals.costUsd)}
              foot={
                !d.prices.configured
                  ? 'Sin tarifa configurada (MODEL_PRICES_USD)'
                  : d.totals.costUsd === null
                    ? 'Hay modelos sin tarifa: ver la tabla por modelo'
                    : 'Con la tarifa del servidor'
              }
            />
            <Kpi
              label="Tokens por venta"
              icon={ShoppingBag}
              value={d.sales.avgTokens === null ? '—' : fmtTokens(d.sales.avgTokens)}
              foot={`${formatInt(d.sales.count)} ventas · ${d.conversations.avgTokens === null ? '—' : fmtTokens(d.conversations.avgTokens)} por conversación`}
            />
          </div>

          {!d.totals.calls ? (
            <Panel>
              <Empty icon={BarChart3} title="Sin consumo en este rango">
                Aquí aparecen los tokens cuando el agente conversa, transcribe notas de voz, lee imágenes, busca en los Brains o se evalúa.
              </Empty>
            </Panel>
          ) : (
            <>
              <Panel title="Tokens por día" icon={BarChart3}>
                <DailyBars data={d} />
              </Panel>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Panel title="Por uso" icon={MessagesSquare} flush>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Uso</TableHead>
                        <TableHead className="text-right">Llamadas</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Costo est.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {USES.map((u) => d.byKind.find((k) => k.kind === u))
                        .filter((k) => !!k)
                        .map((k) => (
                          <TableRow key={k.kind}>
                            <TableCell className="whitespace-normal">
                              <div className="flex items-center gap-2">
                                <span className={cn('size-2.5 shrink-0 rounded-full', USE_BAR[k.kind])} aria-hidden />
                                <span className="font-semibold">{USE_LABEL[k.kind]}</span>
                              </div>
                              <div className="text-xs text-ink-subtle">
                                {USE_HELP[k.kind]}
                                {k.estimated && ' · tokens aproximados'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatInt(k.calls)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtTokens(k.inputTokens + k.outputTokens)}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtUsd(k.costUsd)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </Panel>
                <Panel title="Por modelo" icon={Cpu} flush>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Modelo</TableHead>
                        <TableHead className="text-right">Entrada</TableHead>
                        <TableHead className="text-right">Salida</TableHead>
                        <TableHead className="text-right">Costo est.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.byModel.map((m) => (
                        <TableRow key={`${m.provider}:${m.model}`}>
                          <TableCell className="whitespace-normal">
                            <div className="font-mono text-[13px]">{m.model}</div>
                            <div className="text-xs text-ink-subtle">
                              {m.provider} · {formatInt(m.calls)} llamadas{!m.priced && ' · sin tarifa'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmtTokens(m.inputTokens)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtTokens(m.outputTokens)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtUsd(m.costUsd)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Panel>
              </div>
            </>
          )}

          <Callout tone="info" icon={Info}>
            Son cifras que registra el sistema en cada llamada. Las conversaciones se cuentan desde el inicio; notas de voz, imágenes, búsqueda, evaluaciones y
            pruebas, desde el 08/10/2026. El saldo, la factura y los límites de la cuenta se ven en Google AI Studio o en la facturación de Google Cloud.
          </Callout>
        </>
      )}
    </div>
  );
}

/** Barras apiladas por día (un color por uso, con leyenda). */
function DailyBars({ data }: { data: UsageSummary }) {
  const days = [...new Set(data.byDay.map((x) => x.day))].sort();
  const used = USES.filter((u) => data.byDay.some((x) => x.kind === u));
  const totals = days.map((day) => data.byDay.filter((x) => x.day === day).reduce((n, x) => n + x.tokens, 0));
  const max = Math.max(1, ...totals);
  return (
    <div className="flex flex-col gap-4">
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs text-ink-muted">
        {used.map((u) => (
          <li key={u} className="flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-full', USE_BAR[u])} aria-hidden />
            {USE_LABEL[u]}
          </li>
        ))}
      </ul>
      <div className="flex h-48 items-end gap-2 overflow-x-auto pb-1" role="list" aria-label="Tokens por día">
        {days.map((day, i) => (
          <div key={day} role="listitem" className="flex h-full min-w-[34px] flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[11px] text-ink-subtle tabular-nums">{fmtTokens(totals[i]!)}</span>
            <div
              className="flex w-full max-w-[44px] flex-col-reverse overflow-hidden rounded-sm"
              style={{ height: `${Math.max(2, (totals[i]! / max) * 100)}%` }}
              title={`${formatDate(`${day}T12:00:00`)}: ${formatInt(totals[i]!)} tokens`}
            >
              {used.map((u) => {
                const t = data.byDay.find((x) => x.day === day && x.kind === u)?.tokens ?? 0;
                return t ? <div key={u} className={USE_BAR[u]} style={{ height: `${(t / totals[i]!) * 100}%` }} /> : null;
              })}
            </div>
            <span className="text-[11px] whitespace-nowrap text-ink-muted tabular-nums">{day.slice(8, 10)}/{day.slice(5, 7)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
