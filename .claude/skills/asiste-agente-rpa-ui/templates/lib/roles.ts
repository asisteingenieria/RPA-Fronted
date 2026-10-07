/**
 * Matriz de permisos del panel (sección 4 de spec-reestructuracion.md).
 * El servidor aplica los permisos; la UI solo los REFLEJA: lo que no se puede hacer se ve
 * deshabilitado con el motivo, no se oculta (salvo las pestañas Usuarios y Auditoría).
 */
export type Role = "ADMIN" | "OPERADOR";

export type Action =
  | "verOperacion" | "apagar" | "reanudar" | "habilitarReintento" | "verAuditoria" | "verRobots"
  | "gestionarRobots" | "verAgente" | "editarAgente" | "probarEditor" | "probarPublicada"
  | "gestionarUsuarios" | "cambiarPropiaContrasena";

const ADMIN_ONLY: Action[] = ["reanudar", "habilitarReintento", "verAuditoria", "gestionarRobots", "editarAgente", "probarEditor", "gestionarUsuarios"];

export const can = (role: Role, action: Action) => role === "ADMIN" || !ADMIN_ONLY.includes(action);

/** Texto del tooltip cuando el rol no alcanza. */
export const REASON: Partial<Record<Action, string>> = {
  reanudar: "Solo un ADMIN puede reanudar el robot",
  habilitarReintento: "Requiere rol ADMIN",
  gestionarRobots: "Requiere rol ADMIN",
  editarAgente: "Requiere rol ADMIN",
  probarEditor: "Solo un ADMIN puede probar lo que hay en el editor",
  gestionarUsuarios: "Requiere rol ADMIN",
};

/** Salvaguardas de Usuarios que la UI debe reflejar. */
export function userGuard(opts: { isSelf: boolean; isLastActiveAdmin: boolean }): { canDeactivate: boolean; canChangeRole: boolean; reason?: string } {
  if (opts.isSelf) return { canDeactivate: false, canChangeRole: false, reason: "No puedes desactivarte ni quitarte el rol a ti mismo" };
  if (opts.isLastActiveAdmin) return { canDeactivate: false, canChangeRole: false, reason: "Debe quedar al menos un ADMIN activo" };
  return { canDeactivate: true, canChangeRole: true };
}
