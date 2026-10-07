# interfazRPA — Panel del Agente RPA (Asiste ING · campaña Claro Móvil)

Consola interna para vigilar, controlar y configurar el robot de ventas que opera Abaya (proyecto
`RobotRPA`). Diseño: kit **asiste-agente-rpa-ui** en `.claude/skills/asiste-agente-rpa-ui/`
(reglas, tokens, capturas de referencia y la spec funcional `reference/spec-reestructuracion.md`).

## Arrancar

```bash
pnpm install
pnpm dev          # http://localhost:5180 (reenvía /admin a ADMIN_API_URL, por defecto http://localhost:3000)
pnpm test         # utilidades (formatos, revisión del guion, permisos)
pnpm build        # typecheck + build de producción en dist/
```

Necesita `apps/api` de RobotRPA corriendo. El ingreso usa los usuarios del panel del servidor
(cookie httpOnly, 8 h máximo, 30 min de inactividad). Primer ADMIN:
`pnpm --filter @abaya/api create-admin -- <usuario>` en RobotRPA. Variables en `.env.example`.

## Pantallas

| Ruta | Pantalla | Datos |
|---|---|---|
| `/en-vivo` | Semáforo, KPIs del día, "Requiere atención", sesiones, errores (refresco 10 s) | `/admin/overview`, `/admin/review`, `/admin/robots`, `/admin/sessions/:robot/reset` |
| `/robots` | Resumen, paquete firmado, tabla con acciones, agregar/instalar, credenciales, detalle (`?robot=`) | `/admin/robots*` |
| `/agente/configuracion` | Guion en Markdown con revisión en vivo, ajustes, bienvenida, catálogo (insertar marcador), prueba | `/admin/agent`, `/review`, `/draft`, `/draft/publish` |
| `/agente/probar` | Chat de simulación con el motor real | `/admin/agent/test` |
| `/agente/historial` · `/agente/evaluaciones` | Versiones, restaurar, reporte de la suite | `/admin/agent/versions`, `/restore` |
| `/usuarios` · `/auditoria` | Solo ADMIN | `/admin/users*`, `/admin/audit` |
| `/cuenta/contrasena` | Cambio de contraseña (menú del avatar) | `/admin/auth/password` |

Roles: **ADMIN** (todo) y **OPERADOR** (consulta, prueba la versión publicada y apagado de
emergencia). Los permisos los aplica el servidor; la UI los refleja.

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/pages/` | Pantallas |
| `src/layout/app-shell.tsx` | TopNav navy, banda de robot detenido, menú del avatar |
| `src/components/rpa/` | Primitivas del kit, estados, apagado de emergencia, piezas del agente (editor, WhatsApp) |
| `src/components/ui/` | shadcn/ui ajustado a los tokens del kit |
| `src/lib/` | Cliente de la API, formatos colombianos, revisión del guion, roles, etiquetas |
| `src/hooks/` | Consultas (React Query) y la simulación del agente |
