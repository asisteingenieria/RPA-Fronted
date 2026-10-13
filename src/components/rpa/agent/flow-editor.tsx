/**
 * D-015: flujo de la conversación (versionado con el agente). Son listas cerradas: deciden qué camino
 * toma el código en cada caso (menú, datos por proceso, fuera de alcance, orden de las imágenes);
 * lo que el agente DICE va en el guion y en las plantillas. El consentimiento, los textos legales y
 * las cifras siguen protegidos en el código (reglas de la sección 7).
 */
import type {
  AgentFlow,
  AgentTemplate,
  FlowProcess,
  ImageOrder,
  MenuAction,
  OutOfScopeAction,
  OutOfScopeStage,
  ProfileField,
  SaleDataField,
  SharedImageMode,
} from '@/lib/api';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BULLET = { A: '🅐', B: '🅑', C: '🅒', D: '🅓' } as const;

const ACTION_LABEL: Record<MenuAction, string> = {
  PORTABILIDAD: 'Portabilidad',
  MIGRACION: 'Migración',
  LINEA_NUEVA: 'Línea nueva',
  PREGUNTAR_NECESIDAD: 'Preguntar qué necesita',
};
const PROCESSES: FlowProcess[] = ['PORTABILIDAD', 'MIGRACION', 'LINEA_NUEVA'];
const FIELD_LABEL: Record<ProfileField, string> = {
  currentOperator: 'Operador actual',
  usage: 'Uso del plan',
};
const STAGE_LABEL: Record<OutOfScopeStage, string> = {
  MENU: 'En el menú',
  PERFIL: 'Al perfilar',
  OFERTA: 'En la oferta',
  OBJECIONES: 'En objeciones',
};
const OOS_LABEL: Record<OutOfScopeAction, string> = {
  SOPORTE: 'Plantilla de soporte y sigue',
  ESCALAR: 'Pasar a un asesor',
};
const ORDER_LABEL: Record<ImageOrder, string> = {
  PROPIAS_PRIMERO: 'Primero las de esta opción; las compartidas después',
  PRECIO: 'Primero la del plan más caro (propia o compartida)',
  CARGA: 'En el orden en que se cargaron en el Brain',
};
const SHARED_LABEL: Record<SharedImageMode, string> = {
  SI_PIDE_PLATAFORMA: 'Solo si pide algo que incluyen (p. ej. Prime Video)',
  CON_LAS_DEMAS: 'Con las demás imágenes de la oferta',
};
const SALE_DATA: Record<SaleDataField, string> = {
  DOCUMENTO: 'Documento de identidad',
  NOMBRE: 'Nombre completo',
  CORREO: 'Correo electrónico',
  CELULAR: 'Número celular',
};
const NONE = '__ninguna__';

/** Opciones del menú tal como las recibe el cliente. */
export function menuOptionsText(flow: AgentFlow): string {
  return flow.menu.map((o) => `${BULLET[o.letter]} ${o.text}`).join('\n');
}

export function FlowEditor({
  flow,
  templates,
  onChange,
  errors,
  readOnly,
  maxMenuText,
}: {
  flow: AgentFlow;
  /** Plantillas del agente: la primera pregunta de cada proceso es una de RESPUESTA. */
  templates: AgentTemplate[];
  onChange: (f: AgentFlow) => void;
  /** Problemas de la revisión del servidor (field = flow). */
  errors: string[];
  readOnly: boolean;
  maxMenuText: number;
}) {
  const responses = templates.filter((t) => t.role === 'RESPUESTA');
  const setProcess = (p: FlowProcess, v: AgentFlow['processes'][FlowProcess]) =>
    onChange({ ...flow, processes: { ...flow.processes, [p]: v } });

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-xs leading-4 text-ink-subtle">
        Qué camino toma la conversación. Lo que el agente dice va en el guion y en las plantillas; qué cuenta como servicio al cliente,
        también (en el guion). Se guarda con el borrador y sale al publicar.
      </p>
      {errors.map((e) => (
        <span key={e} className="text-xs leading-4 text-danger">
          {e}
        </span>
      ))}

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">Menú</legend>
        {flow.menu.map((o, i) => (
          <div key={o.letter} className="grid grid-cols-[20px_minmax(0,1fr)] items-center gap-x-2 gap-y-1">
            <span aria-hidden className="text-base leading-none">
              {BULLET[o.letter]}
            </span>
            <Input
              aria-label={`Texto de la opción ${o.letter}`}
              className="h-8"
              value={o.text}
              maxLength={maxMenuText}
              readOnly={readOnly}
              onChange={(e) => onChange({ ...flow, menu: flow.menu.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
            />
            <span />
            <Select
              value={o.action}
              disabled={readOnly}
              onValueChange={(a) =>
                onChange({ ...flow, menu: flow.menu.map((x, j) => (j === i ? { ...x, action: a as MenuAction } : x)) })
              }
            >
              <SelectTrigger aria-label={`A qué lleva la opción ${o.letter}`} className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACTION_LABEL) as MenuAction[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTION_LABEL[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <span className="text-xs leading-4 text-ink-subtle">
          «Preguntar qué necesita»: el sistema envía la plantilla «¿En qué te ayudo?»; si es una compra sigue la venta, si no, la de soporte.
          Línea nueva también se abre si el cliente la pide explícitamente.
        </span>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">Por proceso</legend>
        {PROCESSES.map((p) => {
          const cfg = flow.processes[p];
          return (
            <div key={p} className="flex flex-col gap-2 rounded-md border px-3 py-2.5">
              <span className="text-[13px] font-medium text-ink">{ACTION_LABEL[p]}</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {(Object.keys(FIELD_LABEL) as ProfileField[]).map((f) => {
                  const id = `asks-${p}-${f}`;
                  return (
                    <div key={f} className="flex items-center gap-1.5">
                      <Checkbox
                        id={id}
                        checked={cfg.asks.includes(f)}
                        disabled={readOnly}
                        onCheckedChange={(c) =>
                          setProcess(p, {
                            ...cfg,
                            // Mismo orden siempre: operador y luego uso.
                            asks: (Object.keys(FIELD_LABEL) as ProfileField[]).filter((x) =>
                              x === f ? c === true : cfg.asks.includes(x),
                            ),
                          })
                        }
                      />
                      <Label htmlFor={id} className="text-xs text-ink-muted">
                        {FIELD_LABEL[f]}
                      </Label>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-ink-muted">Primera pregunta (plantilla)</Label>
                <Select
                  value={cfg.firstTemplate ?? NONE}
                  disabled={readOnly}
                  onValueChange={(v) => setProcess(p, { ...cfg, firstTemplate: v === NONE ? null : v })}
                >
                  <SelectTrigger aria-label={`Primera pregunta de ${ACTION_LABEL[p]}`} className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Ninguna (pregunta el nombre)</SelectItem>
                    {responses.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title} · {t.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-ink-muted">Orden de las imágenes de planes</Label>
                <Select value={cfg.imageOrder} disabled={readOnly} onValueChange={(o) => setProcess(p, { ...cfg, imageOrder: o as ImageOrder })}>
                  <SelectTrigger aria-label={`Orden de las imágenes de ${ACTION_LABEL[p]}`} className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ORDER_LABEL) as ImageOrder[]).map((o) => (
                      <SelectItem key={o} value={o}>
                        {ORDER_LABEL[o]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-ink-muted">Imágenes compartidas con otros procesos</Label>
                <Select
                  value={cfg.sharedImages}
                  disabled={readOnly}
                  onValueChange={(v) => setProcess(p, { ...cfg, sharedImages: v as SharedImageMode })}
                >
                  <SelectTrigger aria-label={`Imágenes compartidas en ${ACTION_LABEL[p]}`} className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SHARED_LABEL) as SharedImageMode[]).map((o) => (
                      <SelectItem key={o} value={o}>
                        {SHARED_LABEL[o]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
        <span className="text-xs leading-4 text-ink-subtle">Los datos marcados se piden antes de ofrecer. El nombre llega con los datos tras autorizar.</span>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">Si el mensaje no es de venta</legend>
        {(Object.keys(STAGE_LABEL) as OutOfScopeStage[]).map((s) => (
          <div key={s} className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-2">
            <span className="text-xs text-ink-muted">{STAGE_LABEL[s]}</span>
            <Select
              value={flow.outOfScope[s]}
              disabled={readOnly}
              onValueChange={(a) => onChange({ ...flow, outOfScope: { ...flow.outOfScope, [s]: a as OutOfScopeAction } })}
            >
              <SelectTrigger aria-label={`Fuera de alcance: ${STAGE_LABEL[s]}`} className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(OOS_LABEL) as OutOfScopeAction[]).map((a) => (
                  <SelectItem key={a} value={a}>
                    {OOS_LABEL[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <span className="text-xs leading-4 text-ink-subtle">
          Qué cuenta como «no es de venta» (roaming, factura, soporte…) se describe en el guion. Las plantillas «Soporte» y «Paso a un asesor»
          se editan en Plantillas.
        </span>
      </fieldset>

      <span className="text-xs leading-4 text-ink-subtle">
        Qué imágenes van con cada proceso (y cuáles son compartidas) se elige al cargarlas en el Brain.
      </span>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">Datos para pasar la venta</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {(Object.keys(SALE_DATA) as SaleDataField[]).map((f) => {
            const id = `sale-data-${f}`;
            const on = (flow.saleData ?? []).includes(f);
            return (
              <div key={f} className="flex items-center gap-1.5">
                <Checkbox
                  id={id}
                  checked={on}
                  disabled={readOnly}
                  onCheckedChange={(c) =>
                    onChange({
                      ...flow,
                      // Mismo orden siempre: documento, nombre, correo, celular.
                      saleData: (Object.keys(SALE_DATA) as SaleDataField[]).filter((x) =>
                        x === f ? c === true : (flow.saleData ?? []).includes(x),
                      ),
                    })
                  }
                />
                <Label htmlFor={id} className="text-xs text-ink-muted">
                  {SALE_DATA[f]}
                </Label>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Label htmlFor="sale-data-wait" className="text-xs text-ink-muted">
            Esperar a que termine de escribir
          </Label>
          <Input
            id="sale-data-wait"
            type="number"
            min={10}
            max={90}
            className="h-8 w-20 tabular-nums"
            value={flow.saleDataWaitSeconds ?? 45}
            readOnly={readOnly}
            onChange={(e) => onChange({ ...flow, saleDataWaitSeconds: Number(e.target.value) })}
          />
          <span className="text-xs text-ink-muted">segundos</span>
        </div>
        <span className="text-xs leading-4 text-ink-subtle">
          Después del «SÍ» el robot pide estos datos. Mientras el cliente los va mandando (pueden llegar en varios mensajes) no responde; cuando
          deja de escribir ese tiempo, revisa: si están todos pasa la venta al backoffice y, si falta alguno, le recuerda solo ese con la
          plantilla «Datos que faltan». Si escribe algo que no es un dato, le responde de una vez. Tras 3 mensajes seguidos sin datos nuevos,
          la venta pasa igual y el resumen dice qué faltó.
        </span>
      </fieldset>
    </div>
  );
}
