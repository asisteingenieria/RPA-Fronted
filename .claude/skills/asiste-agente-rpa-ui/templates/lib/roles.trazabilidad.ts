/**
 * Permiso «Ver conversaciones» (Trazabilidad). Copia esto a src/lib/roles.ts junto a
 * publishKnowledgeReason. El servidor es quien decide (403); la UI solo lo refleja.
 */
export interface MeLike { role: "ADMIN" | "OPERADOR"; conversationViewer?: boolean }

/** undefined = puede ver; string = motivo para mostrar en el tooltip de la pestaña deshabilitada. */
export function viewConversationsReason(me: MeLike): string | undefined {
  if (me.role === "ADMIN" && me.conversationViewer) return undefined;
  return "Necesitas el permiso «Ver conversaciones». Lo asigna un ADMIN en Usuarios.";
}

/** Solo un ADMIN asigna o quita la marca; mismas salvaguardas que «Publicar conocimiento». */
export const toggleConversationViewerReason = (me: MeLike): string | undefined =>
  me.role === "ADMIN" ? undefined : "Requiere rol ADMIN";
