import { useMemo, useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import { Download, Eye, Lock } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime, formatTime } from '@/lib/format';
import { useUser } from '@/auth/session';
import { backend } from '@/data/store';
import { useContent } from '@/hooks/use-data';
import type { ConversationResult, ConversationRow } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pill, type Tone } from '@/components/panel/badges';
import { ConfirmDialog, EmptyState, PageHeader, Panel } from '@/components/panel/common';
import { Funnel } from '@/components/panel/visuals';
import { WhatsAppPreview } from '@/components/panel/whatsapp-preview';

const RESULT: Record<ConversationResult, { label: string; tone: Tone }> = {
  venta: { label: 'Venta transferida', tone: 'success' },
  'sin-venta': { label: 'Sin venta', tone: 'neutral' },
  'en-curso': { label: 'En curso', tone: 'primary' },
  revision: { label: 'En revisión', tone: 'warning' },
};
const axis = { fill: 'var(--muted-foreground)', fontSize: 12 };
const tip = { background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 };

export function MonitoreoPage() {
  const search = useSearch({ from: '/monitoreo' });
  const { db } = useContent();
  const { actor } = useUser();
  const [result, setResult] = useState<'todos' | ConversationResult>('todos');
  const [option, setOption] = useState('todas');
  const [date, setDate] = useState('');
  const [open, setOpen] = useState<ConversationRow | null>(() => db.conversations.find((c) => c.id === search.chat) ?? null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [askReveal, setAskReveal] = useState(false);

  const rows = db.conversations.filter((c) => (result === 'todos' || c.result === result) && (option === 'todas' || c.option === option) && (!date || c.startedAt.slice(0, 10) === date));

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of db.conversations) if (c.result === 'venta') m.set(formatDate(c.startedAt).slice(0, 5), (m.get(formatDate(c.startedAt).slice(0, 5)) ?? 0) + 1);
    return [...m.entries()].reverse().map(([day, ventas]) => ({ day, ventas }));
  }, [db.conversations]);
  const byOption = (['A', 'B', 'C', 'D'] as const).map((o) => ({ name: o, value: db.conversations.filter((c) => c.option === o).length }));
  const steps = ['Menú', 'Perfilamiento', 'Oferta', 'Autorización', 'Transferencia'];
  const funnel = steps.map((s, i) => ({ label: s, value: db.conversations.filter((c) => steps.indexOf(c.step) >= i || c.result === 'venta').length }));
  const reasons = [
    { name: 'No interesado', value: 9 },
    { name: 'Precio', value: 6 },
    { name: 'No autorizó', value: 3 },
    { name: 'Inactividad', value: 4 },
  ];

  const exportCsv = () => {
    const head = 'chat,inicio,paso,opcion,plan,resultado,duracion_min';
    const lines = rows.map((c) => [c.chatId, c.startedAt, c.step, c.option ?? '', c.plan ?? '', RESULT[c.result].label, c.durationMin].join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'conversaciones.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    void backend.logExport(actor, 'Conversaciones (CSV sin datos personales)');
  };

  return (
    <>
      <PageHeader
        title="Monitoreo"
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download />
            Exportar CSV
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Ventas por día">
          <div className="h-[200px]">
            <ResponsiveContainer>
              <BarChart data={byDay} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={axis} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
                <RTooltip contentStyle={tip} cursor={{ fill: 'var(--ps-surface-2)' }} />
                <Bar dataKey="ventas" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Embudo por paso">
          <Funnel steps={funnel} />
        </Panel>
        <Panel title="Opción del menú y motivos sin venta">
          <div className="grid grid-cols-2 gap-2">
            <div className="h-[180px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byOption} dataKey="value" nameKey="name" innerRadius={38} outerRadius={64} paddingAngle={2}>
                    {byOption.map((_, i) => (
                      <Cell key={i} fill={`var(--chart-${i + 1})`} />
                    ))}
                  </Pie>
                  <RTooltip contentStyle={tip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex flex-col justify-center gap-1.5 text-[13px]">
              {reasons.map((r) => (
                <li key={r.name} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{r.name}</span>
                  <span className="tabular">{r.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-wrap items-end gap-3 border-b p-4">
          <Select value={result} onValueChange={(v) => setResult(v as typeof result)}>
            <SelectTrigger className="w-48" aria-label="Resultado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los resultados</SelectItem>
              {(Object.keys(RESULT) as ConversationResult[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {RESULT[r].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={option} onValueChange={setOption}>
            <SelectTrigger className="w-40" aria-label="Opción">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las opciones</SelectItem>
              {['A', 'B', 'C', 'D'].map((o) => (
                <SelectItem key={o} value={o}>
                  Opción {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" aria-label="Fecha" />
          <span className="ml-auto text-[13px] text-muted-foreground">{rows.length} conversaciones</span>
        </div>
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Sin conversaciones con estos filtros" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chat</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Paso</TableHead>
                <TableHead>Opción</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead className="text-right">Duración</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setOpen(c)}>
                  <TableCell className="font-mono text-[12.5px]">{c.chatId}</TableCell>
                  <TableCell className="tabular">{formatDateTime(c.startedAt)}</TableCell>
                  <TableCell>{c.step}</TableCell>
                  <TableCell>{c.option ?? '—'}</TableCell>
                  <TableCell className="font-mono text-[12.5px]">{c.plan ?? '—'}</TableCell>
                  <TableCell>
                    <Pill tone={RESULT[c.result].tone}>{RESULT[c.result].label}</Pill>
                  </TableCell>
                  <TableCell className="tabular text-right">{c.durationMin} min</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-[560px] overflow-y-auto sm:max-w-[560px]">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{open.chatId}</SheetTitle>
                <SheetDescription>
                  {formatDateTime(open.startedAt)} · {RESULT[open.result].label}
                  {open.campaign && ` · ${open.campaign}`}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Acciones del robot</h3>
                  <ol className="flex flex-col gap-2 border-l pl-4">
                    {open.timeline.map((t) => (
                      <li key={t.at + t.action} className="relative text-[13px]">
                        <span className={cn('absolute -left-[21px] top-1.5 size-2 rounded-full', t.ok ? 'bg-success' : 'bg-destructive')} aria-hidden />
                        <span className="tabular text-muted-foreground">{formatTime(t.at)}</span> · {t.action}
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Contenido de los mensajes</h3>
                  {revealed.has(open.id) ? (
                    <WhatsAppPreview className="h-[360px]" input={false} messages={open.messages.map((m) => ({ ...m, time: formatTime(m.at) }))} />
                  ) : (
                    <div className="grid place-items-center gap-2 rounded-md border border-dashed px-6 py-10 text-center">
                      <Lock className="size-5 text-ink-faint" aria-hidden />
                      <p className="text-[13px] text-muted-foreground">Oculto por defecto: contiene datos personales.</p>
                      <Button variant="outline" size="sm" onClick={() => setAskReveal(true)}>
                        <Eye />
                        Mostrar contenido
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={askReveal}
        onOpenChange={setAskReveal}
        title="Mostrar el contenido de la conversación"
        description="Contiene datos personales del cliente (Ley 1581). El motivo queda registrado en la auditoría."
        confirmLabel="Mostrar contenido"
        requireText
        textLabel="Motivo"
        textPlaceholder="Ej.: reclamo del cliente, revisión de calidad"
        onConfirm={async (reason) => {
          if (!open) return;
          await backend.revealConversation(actor, open.id, reason);
          setRevealed((s) => new Set(s).add(open.id));
        }}
      />
    </>
  );
}
