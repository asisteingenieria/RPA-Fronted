# Spec — Pestaña «Trazabilidad» (Agente RPA · Asiste ING)

> **Cambio aprobado (07/10/2026):** no hay permiso «Ver conversaciones». La Trazabilidad la ve **todo ADMIN** (un solo administrador configura el robot); el OPERADOR la ve deshabilitada con el motivo «Requiere rol ADMIN». Donde este documento diga «Ver conversaciones» / `conversationViewer`, léase «rol ADMIN». Se mantiene la auditoría de aperturas y exportaciones.

Ver cada conversación del robot con el cliente **completa y sin enmascarar**, con su tipificación y el
rendimiento por robot. Este documento es el plan funcional aprobado (antes llamado «Conversaciones»)
con el nombre definitivo **Trazabilidad**. Repos: `RobotRPA` (backend) e `interfazRPA` (front).

| Qué | Valor |
|---|---|
| Nombre en el TopNav | **Trazabilidad**, ícono `MessagesSquare`, entre **Agente** y el separador |
| Rutas del front | `/trazabilidad` (subpestañas `?tab=conversaciones` · `?tab=rendimiento`) y `/trazabilidad/:id` |
| Endpoints (sin cambio de nombre) | `/admin/conversations`, `/admin/conversations/:id`, `/admin/conversations/stats`, `/admin/conversations/export` |
| Permiso | «Ver conversaciones» (`AdminUser.conversationViewer`) |
| Auditoría | `CONVERSATION_VIEWED`, `CONVERSATIONS_EXPORTED` |
| Pantallas de referencia | `screens/trazabilidad-{lista,detalle,robots,estados}.{claro,oscuro}.png` · maquetas en `maquetas/` |

---

## 0. Antes de empezar (bloqueante)

- **Autorización de Claro por escrito** (correo o acta) para mostrar el contenido de las conversaciones.
  Citarla en `RobotRPA/docs/DECISIONS.md` (respaldo ante una auditoría por la Ley 1581).
- **Actualizar las reglas del proyecto**, que hoy dicen *«Sin contenido de mensajes reales salvo en la
  simulación»*: `interfazRPA/CLAUDE.md`, el skill (`SKILL.md`, `reference/design-rules.md`; este paquete ya trae
  ambos actualizados) y `reference/spec-reestructuracion.md` (sección 2 y regla 7.1).
- Si la autorización no está, **no se hace la pestaña**: se detiene y se avisa.

---

## 1. Funcionalidades

### A. Lista (subpestaña Conversaciones) — `trazabilidad-lista.*.png`

- **Encabezado:** título «Trazabilidad», subtítulo, `Segmented` de rango (Hoy · 7 días · 30 días · Personalizado) y
  «Exportar CSV». Subpestañas `Tabs sub`: Conversaciones (con el total del filtro) · Rendimiento por robot.
- **Filtros** (`ai-toolbar`): búsqueda por id del chat de Abaya, nombre del cliente o **texto de los mensajes**
  (solo en rangos ≤ 30 días); chips Robot · Tipificación · Proceso (Portabilidad · Migración · Línea nueva) ·
  Etapa final · «Pasó por revisión». Chip activo = `ai-filter is-on` con su conteo. «Limpiar».
  Los filtros viven en la URL (query string) para que el detalle pueda volver y navegar anterior/siguiente.
- **KPIs del filtro:** `ai-kpi-strip` 2×2 (Conversaciones · Ventas y % de conversión · 1.ª respuesta p50 / p95 ·
  Duración media) + panel «Distribución por tipificación» con `TypificationBar`.
- **Tabla** (`ai-table--dense ai-table--compact`, paginación por cursor en el servidor):

| Columna | Origen |
|---|---|
| Inicio → fin (+ fecha) | `Conversation.createdAt` / `updatedAt` (fin «—» si sigue abierta) |
| Robot | `robotUser` |
| Chat de Abaya | `abayaChatId` (monoespaciado, con Copiar) |
| Cliente | `profile.name` (descifrado; «—» si no lo dio) |
| Tipificación | `status` → `Typification short` |
| Etapa final | `stage` (overline) |
| Proceso · plan | `profile.process`, `Sale.planCode` (`ai-code-inline`) |
| Mensajes | ↓ entrantes ↑ salientes |
| 1.ª resp. · duración | de `Message.respondsToAt` y `sentAt` |
| Alertas | `AlertFlags`: envío incierto · pasó por revisión · regenerada (ícono + `aria-label`) |
| Ver | abre `/trazabilidad/:id` (toda la fila es clicable) |

- Pie: «Cada apertura queda en Auditoría · Retención: …» y paginador.

### B. Detalle — `trazabilidad-detalle.*.png`

Página completa `/trazabilidad/:id` (no drawer). Migas «Trazabilidad / AB-…», «N de M en el filtro», anterior/
siguiente y «Descargar transcripción».

- **Cabecera:** nombre del cliente (`font-display` 22/28), `ChatId`, `Typification showCode`, `CampaignChip`, hechos
  (robot, inicio, fin, duración, 1.ª respuesta, mensajes), insignias de regeneraciones y envíos inciertos y
  `StageTrail` con el recorrido real: MENU → PERFIL → OFERTA ⇄ OBJECIONES → AUTORIZACION → salida.
- **Chat completo** (`TraceChat`, solo lectura): mensajes tal cual con su hora; bajo cada respuesta del robot
  `DeliveryState` (Verificado / Incierto / Fallido + intentos + tiempo de respuesta desde la ráfaga del cliente
  hasta que Abaya confirmó). Eventos como pastillas: «Plan ofrecido X», «Consentimiento registrado»,
  «Transferida al backoffice», «Cerrada por inactividad», «Pasó a revisión».
- **Columna derecha:** Cliente (nombre, teléfono «— no se guarda», operador, uso, proceso) · Venta (plan, hora de
  transferencia, nota interna, resumen para el backoffice descifrado) · Consentimiento (respuesta exacta, hora,
  plantilla legal, hash, «Cadena verificada») · Catálogo usado (versión del Brain y cada precio mostrado,
  `KnowledgeUsage`).
- **Abajo:** Motor (llamadas `LlmCall` por etapa: modelo, latencia, tokens, resultado) + aviso de dato faltante ·
  Acciones del robot en Abaya (`RpaActionLog`: abrir, enviar, nota, transferir, cerrar, con resultado, duración y
  «Ver traza» si hubo error).

### C. Integración con lo que ya existe

- **Robots → Ver detalle:** sección **Conversaciones de este robot** con `TypificationBar` y la tabla ya filtrada
  (reutiliza `ConversationList` con `robots: [robot]`).
- Los **ids de chat** de *En vivo → Requiere atención*, *Errores recientes* e *Historial de acciones* pasan a ser
  enlaces a `/trazabilidad/:id` (solo si el usuario tiene el permiso; si no, texto con tooltip del motivo).

### D. Rendimiento por robot — `trazabilidad-robots.*.png`

Tabla robot × (conversaciones, barra de tipificaciones, ventas, % sin venta, % inactividad, revisiones,
conversión, 1.ª respuesta p95, envíos inciertos, regeneradas). Peor valor `ai-worst` (rojo ▼), mejor
`ai-best` (verde ▲) y un `Callout warning` que lo dice con palabras. Panel con la distribución total.

### E. Permiso y auditoría

- Permiso **«Ver conversaciones»**: ADMIN + la marca que otro ADMIN asigna en Usuarios (como «Publicar
  conocimiento»). Sin él, la pestaña del TopNav se ve **deshabilitada con candado y motivo** (no se oculta) y la
  ruta muestra `TraceNoAccess`.
- Cada apertura de un detalle → `CONVERSATION_VIEWED` (con el id). Cada exportación → `CONVERSATIONS_EXPORTED`
  (con los filtros). Los escribe el **servidor**. Sin motivo obligatorio.

### F. Exportar

CSV del listado (tipificación y métricas, **sin texto de mensajes**) y transcripción de una conversación desde su
detalle. Ambos con permiso y auditados.

### G. Retención

`CONVERSATION_RETENTION_DAYS` (vacía = no se borra nada). Tarea diaria del worker: borra mensajes, perfil,
resumen y respuesta del consentimiento de conversaciones cerradas hace más de N días; conserva conteos y
tipificación. El panel muestra «Se conservan N días · se borran automáticamente» o «Retención: sin plazo definido».
Plazo de las ventas: lo define Claro.

### Estados obligatorios — `trazabilidad-estados.*.png`

Sin permiso · skeletons con la forma de la tabla (`ai-skel`) · sin resultados con «Limpiar filtros» · error con
«Reintentar» (filtros conservados) · aviso de rango para buscar texto · claro y oscuro · sin scroll horizontal
(la tabla se desplaza dentro de su tarjeta).

---

## 2. Backend (RobotRPA)

| Pieza | Detalle |
|---|---|
| Migración Prisma | `AdminUser.conversationViewer Boolean @default(false)`; índices `Conversation(robotUser, createdAt)` y `(status, createdAt)` |
| `GET /admin/conversations` | Filtros, cursor, KPIs del filtro, `retentionDays`. Descifra solo el nombre del perfil. Forma: `ConversationListResponse` |
| `GET /admin/conversations/:id` | Mensajes descifrados, eventos, perfil, venta, consentimiento, `LlmCall`, `KnowledgeUsage`, `RpaActionLog`, `stagePath`, `nav`. Escribe `CONVERSATION_VIEWED`. Forma: `ConversationDetail` |
| `GET /admin/conversations/stats` | Rendimiento por robot y tipificación. Forma: `RobotPerformanceResponse` |
| `GET /admin/conversations/export` | CSV sin texto de mensajes, auditado. `?id=` para la transcripción |
| Búsqueda en el texto | Mensajes **cifrados**: descifrar y filtrar en el servidor dentro de un rango ≤ 30 días (si es mayor, 400 con mensaje claro) |
| Usuarios | Activar / desactivar «Ver conversaciones» con las salvaguardas de «Publicar conocimiento»; exponer `conversationViewer` en `/admin/auth/me` |
| Worker | Tarea de retención y la variable en `packages/config` |
| Pruebas | OPERADOR → 403, ADMIN sin la marca → 403, auditoría escrita, búsqueda > 30 días → 400, retención |
| Docs | `DECISIONS.md` (autorización de Claro), `runbook.md`, `.env.example` |

Las formas JSON están en `templates/lib/trazabilidad-api.ts`: el backend debe responder **con esas formas**
(o el front adapta solo ese archivo).

## 3. Front (interfazRPA)

| Archivo | Cambio | Plantilla |
|---|---|---|
| `src/styles/trazabilidad.css` | Estilos nuevos, importado después de `components.css` | `templates/styles/trazabilidad.css` |
| `src/lib/tipificaciones.ts` | Nombres en español, tonos y colores | `templates/lib/tipificaciones.ts` |
| `src/lib/api.ts` | Tipos + 4 funciones | `templates/lib/trazabilidad-api.ts` |
| `src/lib/roles.ts` | `viewConversationsReason(me)` | `templates/lib/roles.trazabilidad.ts` |
| `src/components/rpa/trazabilidad/*` | `Typification`, `TypificationBar`, `StageTrail`, `DeliveryState`, `ChatId`, `AlertFlags`, `FilterChip`, `Skel`, `TraceChat` | `templates/components/trazabilidad/` |
| `src/pages/trazabilidad.tsx` | Lista + KPIs + Rendimiento + estados, conectados a la API y a la URL | `templates/pages/trazabilidad.tsx` |
| `src/pages/trazabilidad-detalle.tsx` | Detalle | `templates/pages/trazabilidad-detalle.tsx` |
| `src/router.tsx`, `src/layout/app-shell.tsx` | Ruta y pestaña en el TopNav con `traceLocked` | `templates/integracion/TOPNAV.md` |
| `src/pages/robots.tsx`, `src/pages/en-vivo.tsx` | Sección del robot e ids como enlaces | este documento, 1.C |
| `src/pages/usuarios.tsx` | Interruptor «Ver conversaciones» | `templates/integracion/USUARIOS.md` |
| `CLAUDE.md` | Regla de contenido de mensajes | `CLAUDE.asiste-agente-rpa.md` de este paquete |

## 4. Datos faltantes (no se inventan: «—» con tooltip)

| Dato | Hoy | Qué haría falta |
|---|---|---|
| Teléfono del cliente | No se guarda (solo `customerRefHash`) | Que el robot lo capture y lo guarde cifrado |
| Origen de cada respuesta (plantilla / modelo / regenerada) | `LlmCall` es por etapa | Agregar `messageId` a `LlmCall` |
| Qué pasó después de la transferencia | Vive en Abaya | Integración con el backoffice (fuera de alcance) |

## 5. Por confirmar con el negocio

1. Permiso aparte y auditoría de cada apertura (recomendado: sí).
2. ¿Se quiere el teléfono? Implica cambiar lo que captura el robot.
3. Plazo de retención y si las ventas tienen uno distinto (lo define Claro).
