## Interfaz del panel (Agente RPA · Asiste ING)

- Toda tarea de UI del panel (pantallas, componentes, estilos, textos de interfaz) usa el skill **asiste-agente-rpa-ui** (`.claude/skills/asiste-agente-rpa-ui/SKILL.md`). Léelo antes de tocar el frontend.
- Stack de este repo: React 19 + Vite + Tailwind v4 + shadcn/ui + TanStack Router y Query. Los tokens del kit viven en `src/styles/globals.css` (utilidades `bg-surface-200`, `text-ink-muted`, `bg-navy`, `font-display`…) y las piezas especiales en `src/styles/kit.css`. Nada de colores, radios ni sombras sueltos en componentes.
- El panel es de **Asiste ING**; Claro Móvil es la campaña (chip `CLARO MÓVIL`). No uses el logo ni el rojo de Claro.
- Datos reales de `apps/api` de RobotRPA (`/admin/*`, cliente en `src/lib/api.ts`). En UI no se cambian endpoints, máquina de estados, reglas de negocio ni permisos del servidor. Si falta un dato, placeholder (`—`) + lista de "datos faltantes"; nunca inventarlo.
- Publicar siempre con evaluación. Apagado de emergencia siempre visible; reanudar solo ADMIN. Lo que un rol no puede hacer se ve deshabilitado con motivo (salvo Usuarios y Auditoría). Sin contenido de mensajes reales salvo en la simulación.
