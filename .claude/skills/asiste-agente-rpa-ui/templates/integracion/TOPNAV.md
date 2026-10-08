# Integración — pestaña en el TopNav, rutas y CSS

## 1. TopNav (`src/layout/app-shell.tsx` o `components/rpa/layout.tsx`)

```tsx
import { MessagesSquare, Lock } from "lucide-react";
import { viewConversationsReason } from "../lib/roles";

export type Section = "en-vivo" | "robots" | "agente" | "trazabilidad" | "usuarios" | "auditoria";
const NAV = [
  { id: "en-vivo", label: "En vivo", icon: Activity },
  { id: "robots", label: "Robots", icon: Bot },
  { id: "agente", label: "Agente", icon: MessageSquareText },
  { id: "trazabilidad", label: "Trazabilidad", icon: MessagesSquare, trace: true }, // ← NUEVA, antes del separador
  { id: "usuarios", label: "Usuarios", icon: Users, admin: true },
  { id: "auditoria", label: "Auditoría", icon: ScrollText, admin: true },
];

// TopNavProps: agrega
traceLocked?: string; // = viewConversationsReason(me); undefined = puede entrar

// En el map de enlaces:
const locked = n.trace && p.traceLocked;
<a href={`#/${n.id}`}
   className={cx("ai-topnav-link", p.active === n.id && "is-active", locked && "is-locked")}
   aria-current={p.active === n.id ? "page" : undefined}
   aria-disabled={locked ? "true" : undefined}
   title={locked || undefined}
   onClick={(e) => { e.preventDefault(); if (!locked) p.onNavigate(n.id); }}>
  <n.icon {...ICON} />{n.label}{locked && <Lock {...ICON} size={12} />}
  …
</a>
```

- La pestaña **se renderiza para todos los roles** (regla 8: deshabilitada con motivo, no oculta).
- Debajo de 1280 px: solo ícono + tooltip, como las demás.
- `trazabilidad.css` ya trae el ajuste de espaciado del TopNav para que quepan 6 pestañas a 1440 px y oculta el
  reloj entre 1280 y 1420 px. Verifica a 1440 y 1366 px que no haya scroll horizontal.

## 2. Rutas (`src/router.tsx`)

- `/trazabilidad` → página de lista. `?tab=rendimiento` abre Rendimiento por robot. Los filtros van en la URL.
- `/trazabilidad/:id` → detalle. Las flechas usan `nav.prevId` / `nav.nextId` que devuelve el servidor
  (conservando la query del filtro).
- Sin permiso (`viewConversationsReason(me)` ≠ undefined) → renderiza `TraceNoAccess`, no redirige.
- Un 403 del servidor → mismo `TraceNoAccess` (el permiso pudo cambiar mientras navegaba).

## 3. CSS

En el punto de entrada, después de `components.css`:
```ts
import "./styles/tokens.css";
import "./styles/components.css";
import "./styles/trazabilidad.css";
```

## 4. Refrescos

- Lista: sin refresco automático (es histórico). Botón implícito: cambiar filtro o rango.
- Detalle de una conversación **en curso** (`closed = false`): refrescar cada 10 s con la pestaña visible.
