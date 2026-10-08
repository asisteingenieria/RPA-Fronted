/**
 * Matriz de permisos del panel (spec-reestructuracion.md, sección 4). El servidor los aplica; la UI
 * solo los REFLEJA: lo que el rol no permite se ve deshabilitado con su motivo (salvo las pestañas
 * Usuarios y Auditoría, que no se muestran a OPERADOR).
 */
export type Role = 'ADMIN' | 'OPERADOR';

export type Action =
  | 'apagar'
  | 'reanudar'
  | 'habilitarReintento'
  | 'verAuditoria'
  | 'gestionarRobots'
  | 'editarAgente'
  | 'probarEditor'
  | 'gestionarUsuarios'
  /** v1.9: crear Brains y cargar o quitar fuentes. */
  | 'gestionarConocimiento';

const ADMIN_ONLY: Action[] = [
  'reanudar',
  'habilitarReintento',
  'verAuditoria',
  'gestionarRobots',
  'editarAgente',
  'probarEditor',
  'gestionarUsuarios',
  'gestionarConocimiento',
];

export const can = (role: Role, action: Action) => role === 'ADMIN' || !ADMIN_ONLY.includes(action);

/** Motivo del tooltip cuando el rol no alcanza. */
export const REASON: Record<Action, string> = {
  apagar: '',
  reanudar: 'Solo un ADMIN puede reanudar el robot',
  habilitarReintento: 'Requiere rol ADMIN',
  verAuditoria: 'Requiere rol ADMIN',
  gestionarRobots: 'Requiere rol ADMIN',
  editarAgente: 'Requiere rol ADMIN',
  probarEditor: 'Solo un ADMIN puede probar lo que hay en el editor',
  gestionarUsuarios: 'Requiere rol ADMIN',
  gestionarConocimiento: 'Requiere rol ADMIN',
};

/** `undefined` si puede; si no, el motivo para deshabilitar el control. */
export const reasonFor = (role: Role, action: Action) => (can(role, action) ? undefined : REASON[action]);

/**
 * Permiso «Publicar conocimiento» (v1.9): publicar, revertir y conectar Brains. Es ADMIN + la
 * marca que asigna otro ADMIN en Usuarios.
 */
export function publishKnowledgeReason(me: { role: Role; knowledgePublisher?: boolean }): string | undefined {
  if (me.role !== 'ADMIN') return 'Requiere rol ADMIN';
  if (!me.knowledgePublisher) return 'Requiere el permiso «Publicar conocimiento» (un ADMIN lo asigna en Usuarios)';
  return undefined;
}

/**
 * Trazabilidad (D-002): la ve todo ADMIN (el ADMIN ve todo). El OPERADOR ve la pestaña
 * deshabilitada con el motivo; el servidor responde 403.
 */
export function viewConversationsReason(me: { role: Role }): string | undefined {
  return me.role === 'ADMIN' ? undefined : 'Requiere rol ADMIN: las conversaciones muestran mensajes reales y datos de clientes.';
}

/** Salvaguardas de Usuarios: nadie se desactiva ni se quita el rol, y siempre queda un ADMIN activo. */
export function userGuard(opts: { isSelf: boolean; isLastActiveAdmin: boolean }): {
  canDeactivate: boolean;
  canChangeRole: boolean;
  reason?: string;
} {
  if (opts.isSelf) {
    return { canDeactivate: false, canChangeRole: false, reason: 'No puedes desactivarte ni quitarte el rol a ti mismo' };
  }
  if (opts.isLastActiveAdmin) {
    return { canDeactivate: false, canChangeRole: false, reason: 'Debe quedar al menos un ADMIN activo' };
  }
  return { canDeactivate: true, canChangeRole: true };
}
