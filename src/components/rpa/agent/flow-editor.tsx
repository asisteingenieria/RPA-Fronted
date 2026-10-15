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
  OperatorRouting,
  OutOfScopeAction,
  OutOfScopeStage,
  OwnPostpaidAction,
  PlatformRequestMode,
  PortabilityInquiryMode,
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
  SI_USO_LABORAL: 'Solo si el uso es laboral (y entonces van primero)',
};
/** D-024: lo de la campaña si el servidor aún no lo envía. */
const DEFAULT_WORK_WORDS = ['trabajo', 'trabajar', 'laboral', 'oficina', 'negocio', 'empresa'];
const SALE_DATA: Record<SaleDataField, string> = {
  DOCUMENTO: 'Documento de identidad',
  NOMBRE: 'Nombre completo',
  CORREO: 'Correo electrónico',
  CELULAR: 'Número celular',
};
const NONE = '__ninguna__';
/** D-021: lo de la campaña si el servidor aún no lo envía. */
const DEFAULT_ROUTING: OperatorRouting = {
  ownNames: ['Claro'],
  ownPrepaidTo: 'MIGRACION',
  ownPostpaid: 'YA_POSPAGO',
  otherOperatorTo: 'PORTABILIDAD',
};
const PLATFORM_LABEL: Record<PlatformRequestMode, string> = {
  OFRECER_DIRECTO: 'Ofrecer directo la circular de esa plataforma, sin perfilar',
  PERFILAR: 'Perfilar igual y ofrecer como siempre',
};
const PORTABILITY_LABEL: Record<PortabilityInquiryMode, string> = {
  VALIDAR: 'Preguntar si recibió la confirmación (sí: soporte; no: datos y backoffice)',
  SOPORTE: 'Plantilla de soporte directo',
};
const POSTPAID_LABEL: Record<OwnPostpaidAction, string> = {
  YA_POSPAGO: 'Plantilla «Ya es pospago» y vuelve al menú',
  SEGUIR: 'No revisar (sigue en portabilidad)',
};

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
  const routing = flow.operatorRouting ?? DEFAULT_ROUTING;
  const setRouting = (r: Partial<OperatorRouting>) => onChange({ ...flow, operatorRouting: { ...routing, ...r } });
  /** Proceso al que va (o «no cambia»), sin el proceso de origen. */
  const routeSelect = (
    label: string,
    value: FlowProcess | null,
    exclude: FlowProcess,
    set: (v: FlowProcess | null) => void,
  ) => (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-ink-muted">{label}</Label>
      <Select value={value ?? NONE} disabled={readOnly} onValueChange={(v) => set(v === NONE ? null : (v as FlowProcess))}>
        <SelectTrigger aria-label={label} className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROCESSES.filter((p) => p !== exclude).map((p) => (
            <SelectItem key={p} value={p}>
              Pasar a {ACTION_LABEL[p]}
            </SelectItem>
          ))}
          <SelectItem value={NONE}>No cambiar</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

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
        <div className="flex flex-col gap-1">
          <Label htmlFor="work-usage" className="text-xs text-ink-muted">
            Uso laboral: palabras que lo indican
          </Label>
          <Input
            id="work-usage"
            className="h-8"
            placeholder="trabajo, laboral, negocio"
            value={(flow.workUsageWords ?? DEFAULT_WORK_WORDS).join(', ')}
            readOnly={readOnly}
            // Separadas por coma; el servidor quita espacios y vacíos.
            onChange={(e) => onChange({ ...flow, workUsageWords: e.target.value.split(',').map((n) => n.trimStart()) })}
          />
          <span className="text-xs leading-4 text-ink-subtle">
            Con «Solo si el uso es laboral»: si en el uso que cuenta el cliente aparece una de estas palabras (no negada), la primera oferta es la
            imagen compartida y, si no la acepta, las de su opción de la más cara a la más barata. Si no, los planes compartidos no se ofrecen.
          </span>
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">Según el operador del cliente</legend>
        <div className="flex flex-col gap-1">
          <Label htmlFor="own-operator" className="text-xs text-ink-muted">
            Operador propio
          </Label>
          <Input
            id="own-operator"
            className="h-8"
            placeholder="Claro"
            value={routing.ownNames.join(', ')}
            readOnly={readOnly}
            // Separados por coma; el servidor quita espacios y vacíos. Vacío = no se corrige el proceso.
            onChange={(e) => setRouting({ ownNames: e.target.value.split(',').map((n) => n.trimStart()) })}
          />
        </div>
        {routeSelect('Eligió cambiarse de operador y es prepago del operador propio', routing.ownPrepaidTo, 'PORTABILIDAD', (v) =>
          setRouting({ ownPrepaidTo: v }),
        )}
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-ink-muted">Eligió cambiarse de operador y ya es pospago del operador propio</Label>
          <Select
            value={routing.ownPostpaid}
            disabled={readOnly}
            onValueChange={(v) => setRouting({ ownPostpaid: v as OwnPostpaidAction })}
          >
            <SelectTrigger aria-label="Cliente pospago del operador propio" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(POSTPAID_LABEL) as OwnPostpaidAction[]).map((a) => (
                <SelectItem key={a} value={a}>
                  {POSTPAID_LABEL[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {routeSelect('Eligió pasarse de recargas a pospago y es de otro operador', routing.otherOperatorTo, 'MIGRACION', (v) =>
          setRouting({ otherOperatorTo: v }),
        )}
        <span className="text-xs leading-4 text-ink-subtle">
          Si eligió cambiarse de operador y su operador es el propio, antes de ofrecer el agente pregunta si ya es pospago. El cambio de proceso lo
          hace el sistema en ese mismo turno: ofrece los planes, imágenes y descuentos del proceso correcto. El texto «Ya es pospago» se edita en
          Plantillas.
        </span>
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

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">Si pregunta por una portabilidad que ya solicitó</legend>
        <Select
          value={flow.portabilityInquiry ?? 'VALIDAR'}
          disabled={readOnly}
          onValueChange={(v) => onChange({ ...flow, portabilityInquiry: v as PortabilityInquiryMode })}
        >
          <SelectTrigger aria-label="Si pregunta por una portabilidad que ya solicitó" className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PORTABILITY_LABEL) as PortabilityInquiryMode[]).map((m) => (
              <SelectItem key={m} value={m}>
                {PORTABILITY_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs leading-4 text-ink-subtle">
          En el menú, «solicité una portabilidad y no sé si quedó». Si sí recibió la confirmación: «no puedo verificarla» y los canales de
          soporte. Si no: se le piden los datos de «Datos para pasar la venta» y pasa al backoffice con «Finalizar» como validación (no es una
          venta). Los textos son las plantillas «Portabilidad: …».
        </span>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">Si pide una plataforma de video</legend>
        <Select
          value={flow.platformRequest ?? 'OFRECER_DIRECTO'}
          disabled={readOnly}
          onValueChange={(v) => onChange({ ...flow, platformRequest: v as PlatformRequestMode })}
        >
          <SelectTrigger aria-label="Si pide una plataforma de video" className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PLATFORM_LABEL) as PlatformRequestMode[]).map((m) => (
              <SelectItem key={m} value={m}>
                {PLATFORM_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs leading-4 text-ink-subtle">
          Si antes de la oferta el cliente pide WIN, Disney+ o Netflix (las que tienen circular de apps de video en el Brain), en cuanto elige su
          proceso se le envía la imagen de esa plataforma. Qué decir si no la acepta va en el guion. Prime Video sigue la oferta normal.
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
