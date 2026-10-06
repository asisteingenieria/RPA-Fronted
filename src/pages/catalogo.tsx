import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearch } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, Copy, Download, Pencil, Plus, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { formatCOP, formatDate } from '@/lib/format';
import { useUser } from '@/auth/session';
import { backend } from '@/data/store';
import { useSectionEditor } from '@/hooks/use-editor';
import { mainOfferBullets, planLine } from '@/engine/offer';
import { PROCESS_LABEL, type Plan, type Process } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OriginBadge, Pill } from '@/components/panel/badges';
import { Callout, ChipsInput, ConfirmDialog, EmptyState, Field, PageHeader, Panel } from '@/components/panel/common';
import { PermissionButton } from '@/components/panel/workflow';
import { WhatsAppPreview } from '@/components/panel/whatsapp-preview';
import { UnsavedGuard } from '@/components/panel/unsaved-guard';

const PROCESSES: Process[] = ['PORTABILIDAD', 'MIGRACION', 'LINEA_NUEVA'];
const SERVICES = ['Claro video', 'Claro club', 'Claro drive con 100 GB', 'Claro música versión gratuita'];
const APPS = ['X', 'WhatsApp', 'Facebook', 'Instagram'];

const planSchema = z
  .object({
    code: z.string().trim().min(1, 'Obligatorio').max(8, 'Máximo 8 caracteres').regex(/^[A-Z0-9-]+$/, 'Solo mayúsculas, números y guion'),
    process: z.enum(['PORTABILIDAD', 'MIGRACION', 'LINEA_NUEVA']),
    unlimitedData: z.boolean(),
    dataGb: z.number().int().positive('Debe ser mayor que 0').nullable(),
    shareGb: z.number().int().nonnegative().nullable(),
    includes: z.string().trim(),
    extraServices: z.array(z.string()),
    unlimitedApps: z.array(z.string()),
    calls: z.string().trim().min(1, 'Obligatorio'),
    priceCop: z.number({ error: 'Obligatorio' }).int('Sin decimales').positive('Debe ser mayor que 0'),
    noDiscount: z.boolean(),
    discount: z.string().trim(),
    validFrom: z.string().min(1, 'Obligatorio'),
    validTo: z.string(),
    active: z.boolean(),
  })
  .refine((p) => p.unlimitedData || (p.dataGb ?? 0) > 0, { path: ['dataGb'], message: 'Indica los GB o marca «Ilimitados»' })
  .refine((p) => p.noDiscount || p.discount.length > 0, { path: ['discount'], message: 'Escribe el texto aprobado o marca «Sin descuento»' })
  .refine((p) => !p.validTo || p.validTo >= p.validFrom, { path: ['validTo'], message: 'Debe ser posterior a «desde»' });
type PlanForm = z.infer<typeof planSchema>;

const toForm = (p: Plan): PlanForm => ({ ...p, noDiscount: !p.discount, discount: p.discount ?? '', validTo: p.validTo ?? '' });
const fromForm = (f: PlanForm): Plan => ({
  code: f.code,
  process: f.process,
  unlimitedData: f.unlimitedData,
  dataGb: f.unlimitedData ? null : f.dataGb,
  shareGb: f.shareGb,
  includes: f.includes,
  extraServices: f.extraServices,
  unlimitedApps: f.unlimitedApps,
  calls: f.calls,
  priceCop: f.priceCop,
  discount: f.noDiscount ? null : f.discount,
  validFrom: f.validFrom,
  validTo: f.validTo || null,
  active: f.active,
});
const emptyPlan = (process: Process): Plan => ({
  code: '',
  process,
  unlimitedData: false,
  dataGb: null,
  shareGb: null,
  includes: '',
  extraServices: [...SERVICES],
  unlimitedApps: [],
  calls: 'Minutos y SMS ilimitados Nacional',
  priceCop: 0,
  discount: null,
  validFrom: new Date().toISOString().slice(0, 10),
  validTo: null,
  active: true,
});

function PlanSheet({ plan, isNew, codes, onClose, onSubmit, readOnly }: { plan: Plan; isNew: boolean; codes: string[]; onClose: () => void; onSubmit: (p: Plan) => void; readOnly: boolean }) {
  const form = useForm<PlanForm>({ resolver: zodResolver(planSchema), defaultValues: toForm(plan), mode: 'onChange' });
  const { register, control, watch, handleSubmit, formState } = form;
  const v = watch();
  const preview = useMemo(() => fromForm({ ...v, priceCop: Number.isFinite(v.priceCop) ? v.priceCop : 0 } as PlanForm), [v]);
  const num = (x: string) => (x === '' ? null : Number(x));
  const err = formState.errors;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[560px] overflow-y-auto sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle>{isNew ? 'Nuevo plan' : `Editar plan ${plan.code}`}</SheetTitle>
        </SheetHeader>
        <form
          id="plan-form"
          className="grid gap-4 px-4"
          onSubmit={handleSubmit((f) => {
            if (isNew && codes.includes(f.code)) {
              form.setError('code', { message: 'Ya existe un plan con ese código' });
              return;
            }
            onSubmit(fromForm(f));
          })}
        >
          <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
            <Field label="Código" htmlFor="f-code" error={err.code?.message}>
              <Input id="f-code" {...register('code', { setValueAs: (x: string) => x.toUpperCase() })} disabled={!isNew || readOnly} className="font-mono" placeholder="M5" />
            </Field>
            <Field label="Proceso" error={err.process?.message}>
              <Controller
                control={control}
                name="process"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={readOnly}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROCESSES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {PROCESS_LABEL[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Datos (GB)" htmlFor="f-gb" error={err.dataGb?.message}>
              <div className="flex items-center gap-3">
                <Input id="f-gb" type="number" className="tabular w-28" disabled={v.unlimitedData || readOnly} {...register('dataGb', { setValueAs: num })} />
                <Controller
                  control={control}
                  name="unlimitedData"
                  render={({ field }) => (
                    <span className="flex items-center gap-2">
                      <Checkbox id="f-unl" checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} disabled={readOnly} />
                      <Label htmlFor="f-unl" className="font-normal">
                        Ilimitados
                      </Label>
                    </span>
                  )}
                />
              </div>
            </Field>
            <Field label="GB para compartir" htmlFor="f-share" help="Opcional" error={err.shareGb?.message}>
              <Input id="f-share" type="number" className="tabular w-28" {...register('shareGb', { setValueAs: num })} />
            </Field>
            <Field label="Incluye" htmlFor="f-inc" help="Opcional; si está vacío no se muestra." className="sm:col-span-2">
              <Input id="f-inc" placeholder="Amazon Prime, Win Play…" {...register('includes')} />
            </Field>
            <Field label="Servicios adicionales" className="sm:col-span-2">
              <Controller control={control} name="extraServices" render={({ field }) => <ChipsInput value={field.value} onChange={field.onChange} suggestions={SERVICES} disabled={readOnly} />} />
            </Field>
            <Field label="Apps ilimitadas al agotar datos" help="Opcional" className="sm:col-span-2">
              <Controller control={control} name="unlimitedApps" render={({ field }) => <ChipsInput value={field.value} onChange={field.onChange} suggestions={APPS} disabled={readOnly} />} />
            </Field>
            <Field label="Llamadas y mensajes" htmlFor="f-calls" error={err.calls?.message} className="sm:col-span-2">
              <Input id="f-calls" {...register('calls')} />
            </Field>
            <Field label="Precio mensual (IVA incluido)" htmlFor="f-price" error={err.priceCop?.message} help={Number.isFinite(v.priceCop) && v.priceCop > 0 ? formatCOP(v.priceCop) : 'En pesos, sin puntos'}>
              <Input id="f-price" type="number" inputMode="numeric" className="tabular w-36" {...register('priceCop', { valueAsNumber: true })} />
            </Field>
            <Field label="Descuento" htmlFor="f-disc" error={err.discount?.message}>
              <div className="flex flex-col gap-2">
                <Controller
                  control={control}
                  name="noDiscount"
                  render={({ field }) => (
                    <span className="flex items-center gap-2">
                      <Checkbox id="f-nodisc" checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} disabled={readOnly} />
                      <Label htmlFor="f-nodisc" className="font-normal">
                        Sin descuento
                      </Label>
                    </span>
                  )}
                />
                <Input id="f-disc" placeholder="25% CFM en mes 1 y 2" disabled={v.noDiscount || readOnly} {...register('discount')} />
              </div>
            </Field>
            <Field label="Vigente desde" htmlFor="f-from" error={err.validFrom?.message}>
              <Input id="f-from" type="date" {...register('validFrom')} />
            </Field>
            <Field label="Vigente hasta" htmlFor="f-to" help="Opcional" error={err.validTo?.message}>
              <Input id="f-to" type="date" {...register('validTo')} />
            </Field>
          </fieldset>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Vista previa en WhatsApp</h3>
            <WhatsAppPreview
              className="h-[340px]"
              input={false}
              title="Sofía · Claro"
              messages={[
                { from: 'bot', text: `Perfecto, Laura. Tengo para ti nuestro plan más completo:\n${mainOfferBullets(preview)}\n¿Te gustaría quedarte con este plan?`, time: '15:21' },
                { from: 'bot', text: `Línea en la lista de opciones:\n${planLine(preview, '• *[Datos]* + [GB compartir] para compartir | [Incluye] | *[Precio]* | [Descuento]')}`, time: '15:22' },
              ]}
            />
          </div>
        </form>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {!readOnly && (
            <Button type="submit" form="plan-form">
              {isNew ? 'Agregar al borrador' : 'Aplicar cambios'}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ───────────── Importar catálogo: subir → vista previa con errores → confirmar ───────────── */
function parseCatalog(text: string, name: string): { rows: { plan?: Plan; raw: string; errors: string[] }[] } {
  const parseRow = (o: Record<string, unknown>, raw: string) => {
    const candidate = {
      code: String(o.code ?? o.codigo ?? '').toUpperCase(),
      process: String(o.process ?? o.proceso ?? '').toUpperCase(),
      unlimitedData: o.unlimitedData === true || String(o.datos ?? o.dataGb ?? '').toUpperCase().includes('ILIMIT'),
      dataGb: Number.parseInt(String(o.dataGb ?? o.datos ?? ''), 10) || null,
      shareGb: Number.parseInt(String(o.shareGb ?? o.compartir ?? ''), 10) || null,
      includes: String(o.includes ?? o.incluye ?? ''),
      extraServices: Array.isArray(o.extraServices) ? (o.extraServices as string[]) : String(o.servicios ?? '').split(';').map((s) => s.trim()).filter(Boolean),
      unlimitedApps: Array.isArray(o.unlimitedApps) ? (o.unlimitedApps as string[]) : String(o.apps ?? '').split(';').map((s) => s.trim()).filter(Boolean),
      calls: String(o.calls ?? o.llamadas ?? ''),
      priceCop: Number(String(o.priceCop ?? o.precio ?? '').replace(/[^\d]/g, '')),
      noDiscount: !(o.discount ?? o.descuento),
      discount: String(o.discount ?? o.descuento ?? ''),
      validFrom: String(o.validFrom ?? o.desde ?? new Date().toISOString().slice(0, 10)),
      validTo: String(o.validTo ?? o.hasta ?? ''),
      active: true,
    };
    const r = planSchema.safeParse(candidate);
    return r.success ? { plan: fromForm(r.data), raw, errors: [] } : { raw, errors: r.error.issues.map((i) => `${i.path.join('.') || 'fila'}: ${i.message}`) };
  };
  if (name.endsWith('.json')) {
    const data = JSON.parse(text) as unknown;
    const arr = Array.isArray(data) ? data : (data as { plans?: unknown[] }).plans ?? [];
    return { rows: arr.map((o, i) => parseRow(o as Record<string, unknown>, `Fila ${i + 1}`)) };
  }
  const [head, ...lines] = text.split(/\r?\n/).filter((l) => l.trim());
  const cols = (head ?? '').split(',').map((c) => c.trim());
  return {
    rows: lines.map((l, i) => {
      const vals = l.split(',');
      return parseRow(Object.fromEntries(cols.map((c, j) => [c, vals[j]?.trim() ?? ''])), `Fila ${i + 2}`);
    }),
  };
}

export function CatalogoPage() {
  const search = useSearch({ from: '/catalogo' });
  const ed = useSectionEditor('plans', 'catalogo');
  const { actor } = useUser();
  const [tab, setTab] = useState<Process>('MIGRACION');
  const [asc, setAsc] = useState(false);
  const [editing, setEditing] = useState<{ plan: Plan; isNew: boolean } | null>(null);
  const [deactivate, setDeactivate] = useState<Plan | null>(null);
  const [importing, setImporting] = useState<ReturnType<typeof parseCatalog> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ro = !ed.canEdit;
  const plans = ed.value;

  useEffect(() => {
    if (search.plan) {
      const p = plans.find((x) => x.code === search.plan);
      if (p) {
        setTab(p.process);
        setEditing({ plan: p, isNew: false });
      }
    }
    // Solo al llegar desde la búsqueda global.
  }, [search.plan]);

  const list = plans.filter((p) => p.process === tab).sort((a, b) => (asc ? a.priceCop - b.priceCop : b.priceCop - a.priceCop));
  const topCode = plans.filter((p) => p.process === tab && p.active).sort((a, b) => b.priceCop - a.priceCop)[0]?.code;
  const emptyProcesses = PROCESSES.filter((p) => !plans.some((x) => x.process === p && x.active));
  const save = () => ed.save(plans.map((p) => `plans:${p.code}`), 'Catálogo de planes');
  const upsert = (p: Plan) => {
    ed.update((all) => (all.some((x) => x.code === p.code) ? all.map((x) => (x.code === p.code ? p : x)) : [...all, p]));
    setEditing(null);
    toast.success(`Plan ${p.code} actualizado en el borrador (falta guardar)`);
  };
  const changedField = (p: Plan, field: keyof Plan) => {
    const old = ed.published.find((x) => x.code === p.code);
    return !old || JSON.stringify(old[field]) !== JSON.stringify(p[field]);
  };

  const exportCatalog = () => {
    const blob = new Blob([JSON.stringify({ plans }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'catalogo-borrador.json';
    a.click();
    URL.revokeObjectURL(a.href);
    void backend.logExport(actor, 'Catálogo de planes');
  };

  return (
    <>
      <UnsavedGuard when={ed.isDirty} onSave={save} />
      <PageHeader
        title="Catálogo de planes"
        badges={<OriginBadge kind="exacto" />}
        actions={
          <>
            <PermissionButton variant="outline" allowed={!ro} reason="Requiere rol Editor de contenido" onClick={() => fileRef.current?.click()}>
              <Upload />
              Importar catálogo
            </PermissionButton>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  setImporting(parseCatalog(await f.text(), f.name.toLowerCase()));
                } catch {
                  toast.error('No se pudo leer el archivo. Usa CSV con encabezados o JSON.');
                }
              }}
            />
            <Button variant="ghost" onClick={exportCatalog}>
              <Download />
              Exportar
            </Button>
            <PermissionButton variant="outline" allowed={!ro} reason="Requiere rol Editor de contenido" onClick={() => setEditing({ plan: emptyPlan(tab), isNew: true })}>
              <Plus />
              Nuevo plan
            </PermissionButton>
            <PermissionButton allowed={!ro} reason="Requiere rol Editor de contenido" onClick={save} disabled={!ed.isDirty || ed.saving}>
              <Save />
              Guardar borrador
            </PermissionButton>
          </>
        }
      />
      {emptyProcesses.map((p) => (
        <Callout key={p} tone="warning">
          <strong>{PROCESS_LABEL[p]}:</strong> sin planes activos. Los clientes de esta opción se transfieren directo a un asesor.
        </Callout>
      ))}

      <Panel bodyClassName="p-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Process)} className="px-4 pt-3">
          <TabsList variant="line">
            {PROCESSES.map((p) => {
              const n = plans.filter((x) => x.process === p && x.active).length;
              const dirtyTab = plans.some((x) => x.process === p && ed.changedKeys.has(`plans:${x.code}`)) || JSON.stringify(plans.filter((x) => x.process === p)) !== JSON.stringify(ed.draftValue.filter((x) => x.process === p));
              return (
                <TabsTrigger key={p} value={p} className="gap-2">
                  {PROCESS_LABEL[p]}
                  <Pill tone="neutral">{n}</Pill>
                  {dirtyTab && <span className="size-1.5 rounded-full bg-warning" aria-label="Con cambios" />}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        {list.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Sin planes en este proceso">Los clientes de esta opción se transfieren directo a un asesor.</EmptyState>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Datos</TableHead>
                <TableHead>GB para compartir</TableHead>
                <TableHead>Incluye</TableHead>
                <TableHead className="text-right">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => setAsc((a) => !a)} aria-label="Ordenar por precio">
                    Precio {asc ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
                  </button>
                </TableHead>
                <TableHead>Descuento</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.code} className={p.active ? undefined : 'opacity-60'}>
                  <TableCell>
                    <div className="font-mono text-[12.5px] font-semibold">{p.code}</div>
                    {p.code === topCode && (
                      <Pill tone="success" className="mt-1">
                        <ArrowUp aria-hidden />
                        Se ofrece primero
                      </Pill>
                    )}
                    {!ed.published.some((x) => x.code === p.code) && (
                      <Pill tone="primary" className="mt-1">
                        Nuevo
                      </Pill>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{p.unlimitedData ? 'GB ILIMITADAS' : `${p.dataGb} GB`}</TableCell>
                  <TableCell>{p.shareGb ? `${p.shareGb} GB` : '—'}</TableCell>
                  <TableCell>{p.includes || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="tabular font-semibold">{formatCOP(p.priceCop)}</div>
                    {ed.published.some((x) => x.code === p.code) && changedField(p, 'priceCop') && (
                      <Pill tone="warning" className="mt-1">
                        <span className="size-1.5 rounded-full bg-current" aria-hidden />
                        Modificado
                      </Pill>
                    )}
                  </TableCell>
                  <TableCell className="max-w-44 whitespace-normal">{p.discount ?? 'Sin descuento'}</TableCell>
                  <TableCell className="whitespace-nowrap tabular">
                    {formatDate(p.validFrom + 'T12:00:00')} – {p.validTo ? formatDate(p.validTo + 'T12:00:00') : 'sin fin'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.active}
                      disabled={ro}
                      aria-label={`Plan ${p.code} activo`}
                      onCheckedChange={(on) => (on ? ed.update((all) => all.map((x) => (x.code === p.code ? { ...x, active: true } : x))) : setDeactivate(p))}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ plan: p, isNew: false })}>
                      <Pencil />
                      {ro ? 'Ver' : 'Editar'}
                    </Button>
                    <PermissionButton variant="ghost" size="sm" allowed={!ro} reason="Requiere rol Editor de contenido" onClick={() => setEditing({ plan: { ...p, code: '' }, isNew: true })} aria-label={`Duplicar ${p.code}`}>
                      <Copy />
                    </PermissionButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {editing && <PlanSheet plan={editing.plan} isNew={editing.isNew} codes={plans.map((p) => p.code)} onClose={() => setEditing(null)} onSubmit={upsert} readOnly={ro} />}

      <ConfirmDialog
        open={!!deactivate}
        onOpenChange={(o) => !o && setDeactivate(null)}
        title={`¿Desactivar el plan ${deactivate?.code}?`}
        description="Deja de ofrecerse cuando se publique el borrador. Puedes reactivarlo cuando quieras."
        confirmLabel="Desactivar"
        destructive
        onConfirm={() => {
          if (deactivate) ed.update((all) => all.map((x) => (x.code === deactivate.code ? { ...x, active: false } : x)));
        }}
      />

      <Dialog open={!!importing} onOpenChange={(o) => !o && setImporting(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar catálogo · vista previa</DialogTitle>
            <DialogDescription>Paso 2 de 3: revisa las filas. Las que tienen errores no se importan.</DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-2 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Fila</th>
                  <th className="px-3 py-2 text-left font-medium">Plan</th>
                  <th className="px-3 py-2 text-left font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {importing?.rows.map((r) => (
                  <tr key={r.raw} className="border-t align-top">
                    <td className="px-3 py-2">{r.raw}</td>
                    <td className="px-3 py-2 font-mono">{r.plan ? `${r.plan.code} · ${formatCOP(r.plan.priceCop)}` : '—'}</td>
                    <td className="px-3 py-2">{r.errors.length ? <span className="text-destructive">{r.errors.join(' · ')}</span> : <span className="text-success">Lista</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12.5px] text-muted-foreground">Columnas CSV: code, process, datos, compartir, incluye, servicios (separados por ;), apps, llamadas, precio, descuento, desde, hasta.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImporting(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!importing?.rows.some((r) => r.plan)}
              onClick={() => {
                const ok = importing!.rows.flatMap((r) => (r.plan ? [r.plan] : []));
                ed.update((all) => [...all.filter((x) => !ok.some((n) => n.code === x.code)), ...ok]);
                setImporting(null);
                toast.success(`${ok.length} planes importados al borrador (falta guardar)`);
              }}
            >
              Importar {importing?.rows.filter((r) => r.plan).length ?? 0} planes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
