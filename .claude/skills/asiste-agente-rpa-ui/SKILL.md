---
name: asiste-agente-rpa-ui
description: Diseño e implementación de la interfaz del panel del Agente RPA de ventas de Asiste ING (campaña Claro Móvil por WhatsApp, sobre Abaya). Úsalo SIEMPRE que crees o modifiques pantallas, componentes, estilos, textos o layout del panel en /panel (React 19 + Vite, CSS propio con tokens).
---

# Panel del Agente RPA — cómo implementar la interfaz

El diseño ya está definido. Tu trabajo es llevarlo al código del panel **sin cambiar lógica de negocio,
endpoints, máquina de estados ni permisos del servidor**: solo presentación, layout y componentes de UI.

**Contexto de marca:** el robot y el panel son de **Asiste ING**. Claro es el cliente: aparece solo como la
campaña (chip `CLARO MÓVIL`) y dentro del contenido del agente. No uses el logo ni el rojo de Claro.

## Antes de escribir código

1. Lee `reference/design-rules.md` completo (reglas visuales, de contenido y no negociables).
2. Lee `reference/spec-reestructuracion.md` (inventario de funciones, matriz de roles, endpoints).
3. Para cada pantalla, mira su captura en `reference/screens/<pantalla>.claro.png` y `.oscuro.png`.
   Si necesitas medidas exactas, abre `reference/maquetas/Pantalla<X>.html` (usa `bundle.js` y `bundle.css`
   de la misma carpeta; es solo referencia, no lo copies al proyecto).
4. Revisa el código actual del panel (páginas, hooks, llamadas a `/admin/*`) y **presenta un plan** antes
   de editar: qué archivos creas o modificas y qué endpoint alimenta cada bloque.

## Stack (no lo cambies)

React 19 + Vite + TypeScript, **sin librería de componentes**, CSS propio con tokens. Íconos `lucide-react`
con `strokeWidth={1.75}`. Fuentes Outfit y Plus Jakarta Sans **empaquetadas localmente** (`@fontsource/*`):
el panel no puede cargar CDN, fuentes externas ni scripts de terceros.
Si el proyecto no tiene `lucide-react` o `@fontsource/*`, pide permiso antes de instalarlos.

## Instalación de la base (una vez)

- `templates/styles/tokens.css` y `templates/styles/components.css` → carpeta de estilos del panel; impórtalos
  en el punto de entrada (tokens primero). Reemplazan la paleta actual (`#f4f5f7`, `#1f5fbf`…).
- `templates/lib/*` → `src/lib/` (formatos, revisión del guion, roles).
- `templates/components/*` → `src/components/rpa/` (ajusta rutas de import si difieren).
- Logos de `reference/logos/` → assets del panel: `asiste-mark-white.png` (TopNav), `asiste-mark.png` (login y chat de prueba).
- Tema: claro por defecto, oscuro con `data-theme="dark"` en `<html>`; sin atributo sigue al sistema operativo
  (como hoy). Ofrece "Tema" en el menú del avatar.
- Si el monorepo ya tiene componentes de Asiste (TopNav, Kpi, Badge, Chip, Table, Modal de Recursos Humanos
  o Asistencia), **reutilízalos** y no dupliques los de `templates/`.

## Reglas no negociables

1. **Sin datos personales ni contenido de mensajes reales.** Solo estados, conteos, ids y tiempos. Única excepción: el chat de simulación.
2. **Precios, planes y textos legales no se editan en el guion.** El catálogo es solo lectura; en el guion se insertan marcadores `{{OFERTA:CÓDIGO}}` en el cursor.
3. **El flujo no es configurable visualmente.** Nada de editores de nodos; `StageTrack` solo muestra.
4. **Publicar siempre pasa por la evaluación.** No existe "publicar sin probar". Mientras evalúa, refresca cada 5 s; si falla, `EvalReport` rojo.
5. **Apagado de emergencia siempre visible** en el TopNav, a un clic con confirmación en línea, para ambos roles; **reanudar solo ADMIN**.
6. **Confirmación** en: apagado, deshabilitar robot, desactivar usuario, restablecer contraseña, actualizar todos.
7. **Secretos de un solo uso** (contraseña temporal, código de instalación) con `OneTimeSecret`; nunca se vuelven a mostrar.
8. **Permisos reflejados:** lo que el rol no permite se ve **deshabilitado con motivo** (`reason`), no se oculta. Excepción: las pestañas Usuarios y Auditoría no se renderizan para OPERADOR. Salvaguardas de usuarios con `userGuard()`.
9. **Sin scroll horizontal de la página**, claro/oscuro, AA, foco visible (`--focus-ring`), navegación por teclado.
10. **No inventes datos.** Si una pantalla necesita un dato que el backend no entrega, muestra un placeholder (`—`) y anótalo en una lista de **"datos faltantes"** para revisarla con el usuario.

## Estructura de navegación

`AppLayout` = `TopNav` navy (60 px) + banda roja si el robot está detenido + `<main class="ai-content">`.
TopNav: marca Asiste · selector de módulo · **En vivo · Robots · Agente | Usuarios · Auditoría** (grupo tras el
separador solo ADMIN) · píldora "Robot operando"/"ROBOT DETENIDO" · Apagado de emergencia · reloj · alertas ·
avatar (nombre, rol, Tema, Cambiar contraseña, Cerrar sesión). Se elimina el "Salir (usuario · ROL)" suelto
y las pestañas actuales "Operación · Robots · Agente · Usuarios · Cambiar contraseña".
Por debajo de 1280 px las pestañas quedan solo con ícono y tooltip; por debajo de 768 px, menú hamburguesa.

| Pantalla | Captura | Datos (endpoints de la spec) |
|---|---|---|
| Acceso + cambio obligatorio de contraseña | `login` | `/admin/auth/*` |
| En vivo (inicio de ambos roles) | `envivo` | `/admin/overview`, `/admin/review`, `/admin/kill-switch`, `/admin/sessions/:robot/reset` |
| Robots (+ agregar, instalar, credenciales, detalle) | `robots` | `/admin/robots*` |
| Agente → Configuración (estilo Retell) | `agente` | `/admin/agent` overview, review, draft, publish |
| Agente → Probar agente | `probaragente` | `/admin/agent/test` |
| Agente → Historial (+ evaluación) | `historial` | `/admin/agent/versions`, `/admin/agent/restore` |
| Usuarios | `usuarios` | `/admin/users*` |
| Auditoría (sin captura: tabla `ai-table` con filtros, patrón de Errores recientes) | — | `/admin/audit` |
| Cambiar contraseña (desde el menú del avatar, mismo patrón que el login) | `login` | `/admin/auth/*` |

## Pantalla Agente → Configuración (la más importante)

Estructura de Retell para **editar el prompt completo**:
1. `AgentBar`: nombre, `CampaignChip`, `VersionStatus`, contexto ("Borrador v15 · basado en v14…"), "Cambios sin guardar", **Descartar · Guardar · Publicar con evaluación**.
2. `Tabs sub`: Configuración · Probar agente · Historial · Evaluaciones.
3. Grid `.ai-agent-grid` de 3 columnas (`1fr 340px 360px`):
   - **Col. 1:** `PromptEditor` con `ModelSettings` como `toolbar` (modelo de la lista permitida o "por defecto del servidor"; temperatura 0–0,3 con aviso si el modelo no la usa; idioma fijo). El guion en Markdown por etapas `## MENU`, `## PERFIL`, `## OFERTA`, `## OBJECIONES`, `## AUTORIZACION`; máx. 30 000 caracteres; contador de tokens; **revisión en vivo** con enlace a la línea; no se guarda con errores.
   - **Col. 2:** `SectionStack` con `Section`: Ajustes del agente (nombre, empresa, descripción) · Mensaje de bienvenida (saludo editable con `lintBienvenida`, menú A–D fijo con candado) · Catálogo (`CatalogReadOnly`, "Insertar" llama a `editorRef.insert`) · Reglas del sistema (no editables, plegado) · Funciones del motor (en código).
   - **Col. 3:** Panel "Probar agente" con `Segmented` "Lo que hay en el editor" (solo ADMIN) / "Versión publicada" y `WhatsAppPreview`.
4. Avisos cuando no se puede publicar (proveedor simulado o sin API key) → `Callout tone="warning"` y `cannotPublish` en `AgentBar`.
5. OPERADOR: todo en solo lectura (`readOnly`), botones deshabilitados con motivo; prueba solo la publicada.

## Tokens: solo `var(--token)`

Nada de hexadecimales en componentes. Marca: `--primary` (acciones, selección), `--sidebar-bg` (TopNav),
`--brand-cyan` solo acento (subrayado activo, foco, barras, contador de alerta; nunca fondo de botón ni texto).
Estados con texto: `--success` (operando, en línea, publicado), `--warning` (reconectando, evaluando, envío
incierto), `--danger` (detenido, caído, rechazado, error del guion), `--primary-soft`/`--primary-soft-ink` (info,
pausado). `--danger-solid` solo para el botón de apagado y confirmaciones destructivas. Origen de respuestas en
la prueba: `cat-tyt` plantilla, `cat-tecnologia` modelo, `warning` regenerado/segura, `danger` error. Valores en
`reference/tokens.json`.

Tipografía: `--font-display` (Outfit) para `h1` 26/32, cifras de KPI, títulos de panel y modal; `--font-sans`
(Plus Jakarta Sans) para todo lo demás; `--font-mono` solo en el editor del guion, marcadores, ids y secretos.
Toda hora, duración o cifra con `tabular-nums` (`.ai-num`).

## Contenido y formatos

Español de Colombia, trato de **tú**, botones en infinitivo. Formatos con `src/lib/format.ts`: `07:58` o
`3:42 p. m.`, `6 h 42 m`, `1,8 s`, `06/10/2026` o `Jue 24 sep 2026`, `$ 99.900`, `15,5 %`, "hace 12 s". Hora de
Bogotá. Códigos del sistema (ACTIVE, DOWN, UNCERTAIN, MENU…) en mayúsculas junto a su nombre en español.
Personas en Nombre Propio (`properName`).

## Estados obligatorios en cada vista

Carga con skeletons con la forma del contenido (no spinners a pantalla completa) · error con "Reintentar" ·
vacío con `Empty` explicando qué hacer · acciones con `loading` (deshabilitado mientras envía, sin doble clic)
y toast de confirmación ("Borrador guardado", "Robot detenido", "Evaluación iniciada").
Refrescos: En vivo cada 10 s (se pausa con la pestaña oculta); Historial cada 5 s mientras evalúa.

## Al terminar cada pantalla

Compárala a 1440 px con su captura en claro y oscuro, revisa a 1366 px sin scroll horizontal, y verifica:
permisos reflejados · confirmaciones · estados de carga/vacío/error · formatos · cero hexadecimales fuera de
`tokens.css` · ningún estado solo por color · lista de datos faltantes actualizada.

## Archivos de este skill

| Archivo | Para qué |
|---|---|
| `INSTRUCCIONES.md` | Prompt de arranque, fases y criterios de aceptación |
| `reference/design-rules.md` | Reglas del sistema de diseño |
| `reference/spec-reestructuracion.md` | Funciones, roles, pantallas y endpoints (fuente de verdad funcional) |
| `reference/components.md` | Qué componente usar para cada cosa |
| `reference/tokens.json` | Valores exactos (claro/oscuro), tipografía, espacios, radios, sombras |
| `reference/screens/*.png` | 7 pantallas × 2 temas |
| `reference/maquetas/` | HTML de las maquetas + `bundle.js`/`bundle.css` (solo consulta) |
| `reference/logos/` | Logos de Asiste ING |
| `templates/` | Código listo para copiar: estilos, utilidades y componentes |
