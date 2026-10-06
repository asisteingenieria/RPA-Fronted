import {
  Activity, FlaskConical, GitBranch, House, Megaphone, MessageSquare, Package, Shield, SlidersHorizontal, SquareCheck,
  type LucideIcon,
} from "lucide-react";
import type { Origin } from "./badges";

/** Estructura de la barra lateral (sección 4.1 del documento de diseño). Usar con el Sidebar de shadcn. */
export type Role = "operador" | "editor" | "aprobador" | "legal" | "administrador";

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon?: LucideIcon;
  /** Solo subítems de Conversación: punto de color con el origen del texto. */
  origin?: Origin;
  children?: NavItem[];
}

export const NAV: NavItem[] = [
  { id: "inicio", label: "Inicio", to: "/", icon: House },
  {
    id: "conversacion", label: "Conversación", to: "/conversacion", icon: MessageSquare,
    children: [
      { id: "personalidad", label: "Personalidad", to: "/conversacion/personalidad", origin: "ia" },
      { id: "pasos", label: "Instrucciones por paso", to: "/conversacion/pasos", origin: "ia" },
      { id: "textos", label: "Textos fijos", to: "/conversacion/textos-fijos", origin: "exacto" },
      { id: "objeciones", label: "Objeciones", to: "/conversacion/objeciones", origin: "ia" },
      { id: "legal", label: "Texto legal", to: "/conversacion/texto-legal", origin: "legal" },
    ],
  },
  { id: "catalogo", label: "Catálogo de planes", to: "/catalogo", icon: Package },
  { id: "campanas", label: "Campañas", to: "/campanas", icon: Megaphone },
  { id: "simulador", label: "Probar conversación", to: "/simulador", icon: FlaskConical },
  { id: "versiones", label: "Versiones y publicación", to: "/versiones", icon: GitBranch },
  { id: "evaluaciones", label: "Evaluaciones", to: "/evaluaciones", icon: SquareCheck },
  { id: "monitoreo", label: "Monitoreo", to: "/monitoreo", icon: Activity },
  { id: "auditoria", label: "Auditoría", to: "/auditoria", icon: Shield },
  { id: "configuracion", label: "Configuración", to: "/configuracion", icon: SlidersHorizontal },
];

/** Clase del punto de origen en la barra lateral. */
export const ORIGIN_DOT: Record<Origin, string> = { ia: "bg-ai", exacto: "bg-exact", legal: "bg-legal" };

/** Permisos que la UI REFLEJA (el servidor los aplica). Texto del tooltip cuando faltan. */
export const PERMISSIONS = {
  editarBorrador: { roles: ["editor", "aprobador", "administrador"], reason: "Requiere rol Editor de contenido" },
  aprobar: { roles: ["aprobador"], reason: "Requiere rol Aprobador" },
  publicar: { roles: ["aprobador"], reason: "Requiere rol Aprobador" },
  editarLegal: { roles: ["legal"], reason: "Solo el rol Legal puede editar el texto de autorización" },
  configurar: { roles: ["administrador"], reason: "Requiere rol Administrador" },
  apagarRobot: { roles: ["operador", "editor", "aprobador", "legal", "administrador"], reason: "" },
} as const satisfies Record<string, { roles: Role[]; reason: string }>;

export function can(userRoles: Role[], action: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[action].roles.some((r) => userRoles.includes(r as Role));
}
