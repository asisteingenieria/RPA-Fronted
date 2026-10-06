import { useState } from 'react';
import { Check, Play, Plus, X } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDateTime, formatPct } from '@/lib/format';
import { useUser } from '@/auth/session';
import { backend } from '@/data/store';
import { useAction, useContent } from '@/hooks/use-data';
import { EVAL_TARGET, evalPassed } from '@/engine/evals';
import type { EvalCase, EvalCaseResult } from '@/data/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Pill } from '@/components/panel/badges';
import { Callout, ConfirmDialog, EmptyState, Field, PageHeader, Panel } from '@/components/panel/common';
import { PermissionButton } from '@/components/panel/workflow';
import { WhatsAppPreview } from '@/components/panel/whatsapp-preview';

const PROVIDERS = ['Proveedor A · modelo fijado', 'Proveedor B · modelo fijado', 'Línea base sin red'];
const CATEGORIES: EvalCase['category'][] = ['Flujo feliz', 'Objeción', 'Manipulación', 'Fuera de alcance', 'Autorización'];

export function EvaluacionesPage() {
  const { db } = useContent();
  const { actor, can, reason } = useUser();
  const [provider, setProvider] = useState(PROVIDERS[0]!);
  const [runId, setRunId] = useState<string | undefined>();
  const [detail, setDetail] = useState<EvalCaseResult | null>(null);
  const [view, setView] = useState<'resultados' | 'casos'>('resultados');
  const [adding, setAdding] = useState(false);
  const [draftCase, setDraftCase] = useState({ name: '', category: 'Flujo feliz' as EvalCase['category'], messages: '', finalStage: 'Transferencia' });
  const runEval = useAction((p: string) => backend.runAdhocEvaluation(actor, p), 'Evaluación del borrador terminada');

  const runs = db.evalRuns;
  const run = runs.find((r) => r.id === runId) ?? runs.at(-1);
  const history = runs.map((r) => ({ name: r.versionNumber ? `v${r.versionNumber}` : 'Borrador', pct: Math.round(r.passRate * 1000) / 10 }));

  return (
    <>
      <PageHeader
        title="Evaluaciones"
        actions={
          <>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-[230px]" aria-label="Proveedor de IA">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PermissionButton allowed={can('editarBorrador') || can('aprobar')} reason="Requiere rol Editor o Aprobador" onClick={() => runEval.run(provider)} disabled={runEval.isPending}>
              <Play />
              {runEval.isPending ? 'Corriendo…' : 'Correr evaluación del borrador'}
            </PermissionButton>
          </>
        }
      />

      {run ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-[12.5px] font-medium text-muted-foreground">Casos aprobados</div>
              <div className={cn('tabular text-[28px] font-semibold', run.passRate < EVAL_TARGET && 'text-destructive')}>{formatPct(run.passRate * 100)}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className={cn('h-full rounded-full', run.passRate >= EVAL_TARGET ? 'bg-success' : 'bg-destructive')} style={{ width: `${run.passRate * 100}%` }} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Meta ≥ {formatPct(EVAL_TARGET * 100, 0)}</div>
            </div>
            <div className={cn('rounded-lg border bg-card p-4 shadow-sm', run.invented > 0 && 'border-destructive bg-danger-soft')}>
              <div className="text-[12.5px] font-medium text-muted-foreground">Datos inventados</div>
              <div className={cn('tabular text-[28px] font-semibold', run.invented > 0 ? 'text-destructive' : 'text-success')}>{run.invented}</div>
              <div className="text-xs text-muted-foreground">{run.invented > 0 ? 'Bloquea la publicación' : 'Meta: 0'}</div>
            </div>
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="text-[12.5px] font-medium text-muted-foreground">Corrida</div>
              <div className="mt-1 text-sm font-medium">
                {run.versionNumber ? `Contenido v${run.versionNumber}` : 'Borrador'} · {evalPassed(run) ? <span className="text-success">aprobada</span> : <span className="text-destructive">fallida</span>}
              </div>
              <div className="text-[13px] text-muted-foreground">{run.provider}</div>
              <div className="text-[13px] text-muted-foreground">
                {formatDateTime(run.startedAt)} · {Math.round(run.durationMs / 1000)} s
              </div>
              <Select value={run.id} onValueChange={setRunId}>
                <SelectTrigger size="sm" className="mt-2 w-full" aria-label="Ver otra corrida">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {runs
                    .slice()
                    .reverse()
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.versionNumber ? `v${r.versionNumber}` : 'Borrador'} · {formatDateTime(r.startedAt)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
            <Panel
              bodyClassName="p-0"
              title={
                <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
                  <TabsList>
                    <TabsTrigger value="resultados">Resultados ({run.results.length})</TabsTrigger>
                    <TabsTrigger value="casos">Casos guardados ({db.evalCases.length})</TabsTrigger>
                  </TabsList>
                </Tabs>
              }
              actions={
                view === 'casos' && (
                  <PermissionButton size="sm" variant="outline" allowed={can('editarBorrador')} reason={reason('editarBorrador')} onClick={() => setAdding(true)}>
                    <Plus />
                    Agregar caso
                  </PermissionButton>
                )
              }
            >
              {view === 'resultados' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Caso</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {run.results.map((r) => (
                      <TableRow key={r.caseId} className="cursor-pointer" onClick={() => setDetail(r)}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.category}</TableCell>
                        <TableCell>
                          {r.passed ? (
                            <Pill tone="success">
                              <Check aria-hidden /> Aprobado
                            </Pill>
                          ) : (
                            <Pill tone="danger">
                              <X aria-hidden /> Falló{r.failedTurn ? ` · turno ${r.failedTurn}` : ''}
                            </Pill>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[360px] truncate text-muted-foreground">{r.reason ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Caso</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Mensajes</TableHead>
                      <TableHead>Se espera</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {db.evalCases.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">
                          {k.name} {k.fromSimulator && <Pill tone="primary">Simulador</Pill>}
                        </TableCell>
                        <TableCell>{k.category}</TableCell>
                        <TableCell className="tabular">{k.messages.length}</TableCell>
                        <TableCell>{k.expect.finalStage ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
            <Panel title="Historial de corridas" description="% de casos aprobados por corrida">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                    <YAxis domain={[50, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} formatter={(v) => [`${v} %`, 'Aprobados']} />
                    <ReferenceLine y={95} stroke="var(--ps-success)" strokeDasharray="4 4" label={{ value: 'Meta 95 %', fill: 'var(--muted-foreground)', fontSize: 11, position: 'insideTopRight' }} />
                    <Line type="monotone" dataKey="pct" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </>
      ) : (
        <EmptyState title="Aún no hay corridas">Corre la evaluación para ver los resultados.</EmptyState>
      )}

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-[520px] overflow-y-auto sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle>{detail?.name}</SheetTitle>
            <SheetDescription>{detail?.category}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4 pb-4">
            {detail && !detail.passed && <Callout tone="danger">{detail.reason}</Callout>}
            {detail && detail.passed && <Callout tone="success">El caso pasó todos los chequeos.</Callout>}
            {detail && detail.transcript.length > 0 && <WhatsAppPreview className="h-[560px]" input={false} messages={detail.transcript.map((m) => ({ ...m, time: '—' }))} />}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={adding}
        onOpenChange={setAdding}
        title="Agregar caso de prueba"
        confirmLabel="Agregar caso"
        onConfirm={async () => {
          const messages = draftCase.messages.split('\n').map((m) => m.trim()).filter(Boolean);
          if (!draftCase.name.trim() || !messages.length) {
            toast.error('Escribe el nombre y al menos un mensaje');
            throw new Error('incompleto');
          }
          await backend.addEvalCase(actor, { id: `caso-${Date.now()}`, name: draftCase.name.trim(), category: draftCase.category, messages, expect: { finalStage: draftCase.finalStage } });
          setDraftCase({ name: '', category: 'Flujo feliz', messages: '', finalStage: 'Transferencia' });
          toast.success('Caso agregado');
        }}
      >
        <div className="grid gap-3">
          <Field label="Nombre" htmlFor="k-name">
            <Input id="k-name" value={draftCase.name} onChange={(e) => setDraftCase({ ...draftCase, name: e.target.value })} />
          </Field>
          <Field label="Categoría">
            <Select value={draftCase.category} onValueChange={(v) => setDraftCase({ ...draftCase, category: v as EvalCase['category'] })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Mensajes del cliente" help="Uno por línea, en orden." htmlFor="k-msgs">
            <Textarea id="k-msgs" rows={5} value={draftCase.messages} onChange={(e) => setDraftCase({ ...draftCase, messages: e.target.value })} placeholder={'hola\nb\nLaura\ntrabajo'} />
          </Field>
          <Field label="Paso final esperado">
            <Select value={draftCase.finalStage} onValueChange={(v) => setDraftCase({ ...draftCase, finalStage: v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Menú', 'Perfilamiento', 'Oferta', 'Autorización', 'Transferencia', 'No autoriza', 'Soporte', 'Despedida', 'Cerrado'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </ConfirmDialog>
    </>
  );
}
