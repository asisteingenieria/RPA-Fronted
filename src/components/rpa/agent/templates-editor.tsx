/**
 * D-013: plantillas de la campaña (hoja «Plantillas» del Excel SMCC). Los asesores responden con
 * ellas y el robot también: el modelo elige cuál ({{PLANTILLA:id}}) y el código envía el texto
 * exacto. Se versionan con el agente (Guardar borrador → Publicar).
 */
import { useMemo, useState } from 'react';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import type { AgentIssue, AgentTemplate, ReactivationConfig, TemplateRole } from '@/lib/api';
import { cn } from '@/lib/utils';
import { renderWhatsApp } from '@/lib/text-format';
import { ICON } from '@/components/rpa/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const ROLE_LABEL: Record<TemplateRole, string> = {
  RESPUESTA: 'La elige el agente',
  INTRO_AUTORIZACION: 'Antes de la autorización',
  AUTORIZACION: 'Autorización (legal)',
  SOLICITUD_DATOS: 'Pedir datos tras el «SÍ»',
  DESPEDIDA_NO_VENTA: 'Despedida sin venta',
  REACTIVACION: 'Reactivación',
  REFERENCIA: 'Solo referencia',
  // D-015: plantillas del sistema.
  SOPORTE: 'Soporte (chat de ventas)',
  PREGUNTA_NECESIDAD: '¿En qué te ayudo?',
  ESCALAR: 'Paso a un asesor',
  RESPUESTA_SEGURA: 'Respuesta segura',
  ESPERA: 'Espera',
  TRANSFERENCIA: 'Transferencia',
  NO_AUTORIZA: 'No autoriza',
  ASESOR_TRAS_NO_AUTORIZAR: 'Asesor tras no autorizar',
  CONFIRMAR_AUTORIZACION: 'Confirmar autorización',
  AUTORIZACION_POR_ESCRITO: 'Autorización por escrito',
  NOTA_DE_VOZ_ILEGIBLE: 'Nota de voz ilegible',
  DATOS_FALTANTES: 'Datos que faltan',
  YA_POSPAGO: 'Ya es pospago',
  PIE_IMAGEN: 'Pie de imagen adicional',
  PORTABILIDAD_CONFIRMACION: '¿Recibiste la confirmación?',
  PORTABILIDAD_CONFIRMADA: 'Portabilidad: ya confirmada',
  PORTABILIDAD_VALIDAR: 'Portabilidad: validar',
  PORTABILIDAD_TRANSFERENCIA: 'Portabilidad: transferir',
};

/**
 * D-015: plantillas del sistema. El código las envía en un momento fijo del flujo; se editan pero no
 * se quitan (sin ellas el sistema usaría el texto de la campaña). Sin precios, gigas ni porcentajes.
 */
export const SYSTEM_ROLES: readonly TemplateRole[] = [
  'SOPORTE',
  'PREGUNTA_NECESIDAD',
  'ESCALAR',
  'RESPUESTA_SEGURA',
  'ESPERA',
  'TRANSFERENCIA',
  'NO_AUTORIZA',
  'ASESOR_TRAS_NO_AUTORIZAR',
  'CONFIRMAR_AUTORIZACION',
  'AUTORIZACION_POR_ESCRITO',
  'NOTA_DE_VOZ_ILEGIBLE',
  'DATOS_FALTANTES',
  'YA_POSPAGO',
  'PIE_IMAGEN',
  'PORTABILIDAD_CONFIRMACION',
  'PORTABILIDAD_CONFIRMADA',
  'PORTABILIDAD_VALIDAR',
  'PORTABILIDAD_TRANSFERENCIA',
];
const isSystem = (role: TemplateRole) => SYSTEM_ROLES.includes(role);

const ROLE_HELP: Record<TemplateRole, string> = {
  RESPUESTA: 'El modelo la usa cuando aplica según «Cuándo usarla»; el sistema envía el texto exacto.',
  INTRO_AUTORIZACION: 'Se envía justo antes del texto de autorización, al aceptar un plan.',
  AUTORIZACION: 'Texto legal: lo envía el sistema al aceptar un plan, con {fecha}. Debe haber exactamente una.',
  SOLICITUD_DATOS: 'Tras el «SÍ» se piden los datos; con la respuesta del cliente se da Finalizar y la venta pasa al backoffice.',
  DESPEDIDA_NO_VENTA: 'Cierre de una conversación sin venta.',
  REACTIVACION: 'Si el cliente deja de responder, se envían en orden según los tiempos de abajo.',
  REFERENCIA: 'Guardada para consulta: el robot no la envía (p. ej. lo que hace el backoffice).',
  SOPORTE:
    'La envía el sistema cuando el mensaje no es una compra (servicio al cliente, factura, soporte). El chat sigue abierto. Qué hacer en cada etapa se elige en «Flujo».',
  PREGUNTA_NECESIDAD: 'La envía el sistema cuando el cliente elige una opción del menú que lleva a «preguntar qué necesita».',
  ESCALAR: 'La envía el sistema al pasar la conversación a un asesor humano.',
  RESPUESTA_SEGURA: 'La envía el sistema si la respuesta del modelo no pasa la validación dos veces.',
  ESPERA: 'Si el cliente lleva un rato esperando, el sistema las envía rotando (puede haber varias).',
  TRANSFERENCIA: 'La envía el sistema al pasar la venta autorizada al backoffice. Admite {nombre_cliente}.',
  NO_AUTORIZA: 'La envía el sistema si el cliente responde NO a la autorización (se le ofrece un asesor).',
  ASESOR_TRAS_NO_AUTORIZAR: 'La envía el sistema si, tras no autorizar, el cliente acepta hablar con un asesor.',
  CONFIRMAR_AUTORIZACION: 'La envía el sistema si la respuesta a la autorización es ambigua: solo vale un SÍ o un NO explícito.',
  AUTORIZACION_POR_ESCRITO: 'La envía el sistema si el cliente autoriza en una nota de voz: la autorización solo vale escrita.',
  NOTA_DE_VOZ_ILEGIBLE: 'La envía el sistema si no pudo transcribir una nota de voz.',
  DATOS_FALTANTES:
    'Tras el «SÍ», si aún faltan datos del cliente para pasar la venta (se eligen en «Flujo»). {datos_faltantes} dice cuáles: «tu nombre completo y tu correo electrónico».',
  YA_POSPAGO:
    'La envía el sistema si el cliente eligió cambiarse de operador pero ya tiene plan pospago con el operador propio (se elige en «Flujo»). La conversación vuelve al menú: si elige una opción sigue el flujo; si no, despedida.',
  PIE_IMAGEN:
    'La envía el sistema como texto de cada imagen de planes después de la primera del mismo turno: ySocial no deja enviar una imagen sin texto y cada mensaje lleva una sola imagen. Sin cifras.',
  PORTABILIDAD_CONFIRMACION:
    'La envía el sistema cuando el cliente pregunta en el menú por una portabilidad que ya solicitó. Su sí o su no decide qué sigue (se elige en «Flujo»).',
  PORTABILIDAD_CONFIRMADA:
    'Si el cliente sí recibió la confirmación: se envía esta y después la de «Soporte» con los canales de atención.',
  PORTABILIDAD_VALIDAR:
    'Si el cliente no recibió la confirmación: le pide los datos para validarla. {datos_faltantes} dice cuáles (los de «Flujo → Datos para pasar la venta»).',
  PORTABILIDAD_TRANSFERENCIA:
    'Con los datos, la validación pasa al backoffice con «Finalizar» (no es una venta). Admite {nombre_cliente}.',
};

/** Tono de cada rol (siempre con su nombre al lado). */
const ROLE_TONE: Record<TemplateRole, string> = {
  RESPUESTA: 'bg-primary-soft text-primary-soft-ink',
  INTRO_AUTORIZACION: 'bg-surface-200 text-ink-muted',
  AUTORIZACION: 'bg-warning-soft text-warning',
  SOLICITUD_DATOS: 'bg-surface-200 text-ink-muted',
  DESPEDIDA_NO_VENTA: 'bg-surface-200 text-ink-muted',
  REACTIVACION: 'bg-success-soft text-success',
  REFERENCIA: 'bg-surface-200 text-ink-subtle',
  SOPORTE: 'bg-surface-200 text-ink',
  PREGUNTA_NECESIDAD: 'bg-surface-200 text-ink',
  ESCALAR: 'bg-surface-200 text-ink',
  RESPUESTA_SEGURA: 'bg-surface-200 text-ink',
  ESPERA: 'bg-surface-200 text-ink',
  TRANSFERENCIA: 'bg-surface-200 text-ink',
  NO_AUTORIZA: 'bg-surface-200 text-ink',
  ASESOR_TRAS_NO_AUTORIZAR: 'bg-surface-200 text-ink',
  CONFIRMAR_AUTORIZACION: 'bg-surface-200 text-ink',
  AUTORIZACION_POR_ESCRITO: 'bg-surface-200 text-ink',
  NOTA_DE_VOZ_ILEGIBLE: 'bg-surface-200 text-ink',
  DATOS_FALTANTES: 'bg-surface-200 text-ink',
  YA_POSPAGO: 'bg-surface-200 text-ink',
  PIE_IMAGEN: 'bg-surface-200 text-ink',
  PORTABILIDAD_CONFIRMACION: 'bg-surface-200 text-ink',
  PORTABILIDAD_CONFIRMADA: 'bg-surface-200 text-ink',
  PORTABILIDAD_VALIDAR: 'bg-surface-200 text-ink',
  PORTABILIDAD_TRANSFERENCIA: 'bg-surface-200 text-ink',
};

const ROLES = Object.keys(ROLE_LABEL) as TemplateRole[];
const EMPTY: AgentTemplate = { id: '', group: '', title: '', role: 'RESPUESTA', when: '', text: '' };

export function RoleBadge({ role }: { role: TemplateRole }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', ROLE_TONE[role])}>
      {ROLE_LABEL[role]}
    </span>
  );
}

export function TemplatesEditor({
  templates,
  reactivation,
  onChange,
  onReactivation,
  issues,
  readOnly,
  readOnlyReason,
}: {
  templates: AgentTemplate[];
  reactivation: ReactivationConfig;
  onChange: (t: AgentTemplate[]) => void;
  onReactivation: (r: ReactivationConfig) => void;
  /** Problemas de la revisión del servidor (field = templates). */
  issues: AgentIssue[];
  readOnly: boolean;
  readOnlyReason?: string;
}) {
  const [editing, setEditing] = useState<{ index: number | null; value: AgentTemplate } | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const groups = useMemo(() => {
    const m = new Map<string, { t: AgentTemplate; i: number }[]>();
    templates.forEach((t, i) => {
      const g = t.group || 'Sin sección';
      m.set(g, [...(m.get(g) ?? []), { t, i }]);
    });
    return [...m];
  }, [templates]);

  const general = issues.filter((i) => !i.templateId).map((i) => i.message);
  const byTemplate = (id: string) => issues.filter((i) => i.templateId === id).map((i) => i.message);
  const usedByModel = templates.filter((t) => t.role === 'RESPUESTA').length;

  const saveEdit = () => {
    if (!editing) return;
    const v = { ...editing.value, id: editing.value.id.trim() };
    onChange(editing.index === null ? [...templates, v] : templates.map((t, i) => (i === editing.index ? v : t)));
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-xs leading-4 text-ink-subtle">
        Las del Excel de la campaña. El agente elige la que aplica y el sistema envía el texto exacto ({usedByModel} disponibles para el
        agente). Los cambios se guardan con el borrador y salen al publicar.
      </p>
      {general.map((e) => (
        <span key={e} className="text-xs leading-4 text-danger">
          {e}
        </span>
      ))}

      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {groups.map(([group, items]) => {
          const open = openGroup === group;
          const withErrors = items.some(({ t }) => byTemplate(t.id).length);
          return (
            <li key={group} className="rounded-md border">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-semibold text-ink"
                aria-expanded={open}
                onClick={() => setOpenGroup(open ? null : group)}
              >
                <ChevronDown {...ICON} className={cn('size-3.5 shrink-0 transition-transform', !open && '-rotate-90')} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{group}</span>
                {withErrors && <span className="text-xs font-semibold text-danger">Revisar</span>}
                <span className="ai-num text-xs font-medium text-ink-subtle">{items.length}</span>
              </button>
              {open && (
                <ul className="m-0 flex list-none flex-col border-t p-0">
                  {items.map(({ t, i }) => {
                    const errors = byTemplate(t.id);
                    return (
                      <li key={`${t.id}-${i}`} className="flex flex-col gap-1.5 border-b px-3 py-2.5 last:border-b-0">
                        <div className="flex items-start gap-2">
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="text-[13px] font-medium text-ink">{t.title || '(sin título)'}</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <RoleBadge role={t.role} />
                              <code className="truncate font-mono text-[11px] text-ink-subtle">{t.id}</code>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            aria-label={readOnly ? `Ver ${t.title}` : `Editar ${t.title}`}
                            onClick={() => setEditing({ index: i, value: t })}
                          >
                            <Pencil {...ICON} className="size-3.5" />
                          </Button>
                          {!readOnly && !isSystem(t.role) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 text-ink-subtle hover:text-danger"
                              aria-label={`Quitar ${t.title}`}
                              onClick={() => onChange(templates.filter((_, j) => j !== i))}
                            >
                              <Trash2 {...ICON} className="size-3.5" />
                            </Button>
                          )}
                        </div>
                        <p className="m-0 line-clamp-2 text-xs leading-4 whitespace-pre-wrap text-ink-muted">{t.text}</p>
                        {errors.map((e) => (
                          <span key={e} className="text-xs leading-4 text-danger">
                            {e}
                          </span>
                        ))}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={readOnly}
        title={readOnly ? readOnlyReason : undefined}
        onClick={() => setEditing({ index: null, value: { ...EMPTY, group: openGroup ?? '' } })}
      >
        <Plus {...ICON} className="size-3.5" /> Agregar plantilla
      </Button>

      <div className="flex flex-col gap-2 rounded-md bg-surface-200 px-3 py-2.5">
        <span className="text-[13px] font-semibold text-ink">Reactivación</span>
        <span className="text-xs leading-4 text-ink-muted">
          Si el cliente no responde, el robot envía las plantillas de «Reactivación» en orden. Agotadas, cierra la conversación por inactividad
          (una venta ya autorizada pasa al backoffice).
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="react-minutes" className="text-xs text-ink-muted">
              Minutos sin respuesta
            </Label>
            <Input
              id="react-minutes"
              type="number"
              min={1}
              max={120}
              className="ai-num h-8"
              value={reactivation.minutes}
              readOnly={readOnly}
              onChange={(e) => onReactivation({ ...reactivation, minutes: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="react-max" className="text-xs text-ink-muted">
              Mensajes como máximo
            </Label>
            <Input
              id="react-max"
              type="number"
              min={0}
              max={10}
              className="ai-num h-8"
              value={reactivation.max}
              readOnly={readOnly}
              onChange={(e) => onReactivation({ ...reactivation, max: Number(e.target.value) })}
            />
          </div>
        </div>
        <span className="text-xs leading-4 text-ink-subtle">0 mensajes = sin reactivación.</span>
      </div>

      <span className="text-xs leading-4 text-ink-subtle">
        Variables: <code className="font-mono text-[11px]">{'{nombre_agente}'}</code>, <code className="font-mono text-[11px]">{'{nombre_cliente}'}</code>{' '}
        y <code className="font-mono text-[11px]">{'{fecha}'}</code> (dd/mm/aaaa de Bogotá). Las cifras de una plantilla (precios, GB, %) se
        verifican contra el catálogo antes de enviarla.
      </span>

      <TemplateDialog
        editing={editing}
        readOnly={readOnly}
        onChange={(value) => setEditing((e) => (e ? { ...e, value } : e))}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
      />
    </div>
  );
}

function TemplateDialog({
  editing,
  readOnly,
  onChange,
  onClose,
  onSave,
}: {
  editing: { index: number | null; value: AgentTemplate } | null;
  readOnly: boolean;
  onChange: (v: AgentTemplate) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const v = editing?.value ?? EMPTY;
  const set = <K extends keyof AgentTemplate>(k: K, val: AgentTemplate[K]) => onChange({ ...v, [k]: val });
  const isNew = editing?.index === null;
  const canSave = !!v.id.trim() && !!v.title.trim() && !!v.text.trim();
  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-[640px]">
        <DialogHeader className="px-6 pt-6 pb-4 text-left">
          <DialogTitle className="font-display text-lg font-semibold">
            {readOnly ? v.title : isNew ? 'Agregar plantilla' : 'Editar plantilla'}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-ink-muted">{ROLE_HELP[v.role]}</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-6 pb-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-title" className="text-[13px] font-medium text-ink">
                Título
              </Label>
              <Input id="tpl-title" value={v.title} maxLength={80} readOnly={readOnly} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-group" className="text-[13px] font-medium text-ink">
                Sección
              </Label>
              <Input id="tpl-group" value={v.group} maxLength={60} readOnly={readOnly} onChange={(e) => set('group', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-role" className="text-[13px] font-medium text-ink">
                Qué hace el sistema
              </Label>
              <Select value={v.role} onValueChange={(r) => set('role', r as TemplateRole)} disabled={readOnly}>
                <SelectTrigger id="tpl-role" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-id" className="text-[13px] font-medium text-ink">
                Identificador
              </Label>
              <Input
                id="tpl-id"
                className="font-mono text-[13px]"
                value={v.id}
                maxLength={40}
                readOnly={readOnly}
                placeholder="perfil-operador"
                onChange={(e) => set('id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              />
            </div>
          </div>
          {v.role === 'RESPUESTA' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tpl-when" className="text-[13px] font-medium text-ink">
                Cuándo usarla
              </Label>
              <Input
                id="tpl-when"
                value={v.when}
                maxLength={300}
                readOnly={readOnly}
                placeholder="Ej.: cambio de operador y falta saber con qué operador está"
                onChange={(e) => set('when', e.target.value)}
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tpl-text" className="text-[13px] font-medium text-ink">
              Texto exacto
            </Label>
            <Textarea
              id="tpl-text"
              rows={6}
              value={v.text}
              maxLength={1200}
              readOnly={readOnly}
              onChange={(e) => set('text', e.target.value)}
            />
            <span className="ai-num text-right text-xs text-ink-subtle">{v.text.length} / 1200</span>
          </div>
          {v.text.trim() && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-ink-muted">Así lo ve el cliente</span>
              <div className="rounded-md bg-surface-200 px-3 py-2.5 text-[13px] whitespace-pre-wrap text-ink">{renderWhatsApp(v.text)}</div>
            </div>
          )}
        </div>
        <DialogFooter className="border-t bg-surface-0 px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            {readOnly ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!readOnly && (
            <Button onClick={onSave} disabled={!canSave}>
              {isNew ? 'Agregar' : 'Aplicar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
