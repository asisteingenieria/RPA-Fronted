# Nueva pestaña «Trazabilidad» — instrucciones para Claude Code

> **Cambio aprobado (07/10/2026):** no hay permiso «Ver conversaciones». La Trazabilidad la ve **todo ADMIN** (un solo administrador configura el robot); el OPERADOR la ve deshabilitada con el motivo «Requiere rol ADMIN». Donde este documento diga «Ver conversaciones» / `conversationViewer`, léase «rol ADMIN». Se mantiene la auditoría de aperturas y exportaciones.

La pestaña necesita backend (RobotRPA) y front (interfazRPA). Hay **dos prompts**: úsalos en ese orden, cada
uno en su repo. Si el front va primero, usa el modo de datos de prueba descrito en la fase F2.

---

## Prompt 1 — Backend (pegar en Claude Code dentro de `RobotRPA`)

> Vamos a crear el backend de la pestaña **Trazabilidad** del panel. Lee
> `.claude/skills/asiste-agente-rpa-ui/reference/trazabilidad/SPEC-TRAZABILIDAD.md` (secciones 0, 1.E–1.G, 2 y 4)
> y `.claude/skills/asiste-agente-rpa-ui/templates/lib/trazabilidad-api.ts`: ese archivo define las formas JSON
> exactas que deben devolver los endpoints. Antes de escribir código, confirma conmigo que ya está la
> **autorización escrita de Claro** y dime dónde la citamos en `docs/DECISIONS.md`; si no está, detente.
> Luego revisa el esquema Prisma (`Conversation`, `Message`, `Sale`, `Consent`, `LlmCall`, `KnowledgeUsage`,
> `RpaActionLog`, `AdminUser`), el cifrado de mensajes y perfiles, y cómo están hechos los endpoints `/admin/*`, la
> auditoría y el permiso «Publicar conocimiento». Propón un plan (archivos, migración, consultas, índices) y
> espera mi aprobación. Implementa: migración `conversationViewer` + índices; `GET /admin/conversations`,
> `/:id`, `/stats`, `/export` con el permiso, la auditoría (`CONVERSATION_VIEWED`, `CONVERSATIONS_EXPORTED`) y la
> búsqueda en texto limitada a 30 días; el interruptor en usuarios; `conversationViewer` en `/admin/auth/me`; la
> tarea de retención con `CONVERSATION_RETENTION_DAYS` (vacía = no borra). Pruebas de integración: OPERADOR → 403,
> ADMIN sin la marca → 403, auditoría escrita, búsqueda > 30 días → 400, retención. No inventes datos que no
> existen en la base (teléfono, origen por mensaje): devuélvelos como `null` y anótalos en «datos faltantes».

## Prompt 2 — Front (pegar en Claude Code dentro de `interfazRPA`)

> Usa el skill `asiste-agente-rpa-ui`. Vamos a crear la pestaña **Trazabilidad**. Lee
> `reference/trazabilidad/SPEC-TRAZABILIDAD.md` completo, `INSTRUCCIONES-TRAZABILIDAD.md` y mira las 8 capturas de
> `reference/trazabilidad/screens/` (lista, detalle, rendimiento por robot y estados, en claro y oscuro). Si
> necesitas medidas exactas, abre las maquetas de `reference/trazabilidad/maquetas/`. Las plantillas de código
> están en `templates/` (componentes en `components/trazabilidad/`, vistas en `pages/trazabilidad*.tsx`, tipos y
> etiquetas en `lib/`, estilos en `styles/trazabilidad.css`, integración en `integracion/`); ya compilan con
> TypeScript estricto sobre las plantillas del kit. Antes de escribir código, revisa cómo está hoy el panel (router,
> app-shell/TopNav, `src/lib/api.ts`, `roles.ts`, páginas Robots, En vivo y Usuarios) y dime tu plan: qué
> archivos creas o modificas y qué endpoint alimenta cada bloque. No cambies lógica de negocio ni permisos del
> servidor. Si un dato no llega del backend, muestra «—» y agrégalo a la lista de «datos faltantes». Trabaja por
> las fases de este documento y muéstrame el resultado de cada una, comparándolo con su captura.

---

## Fases del front

1. **F1 · Base.** Copia `styles/trazabilidad.css` (importado después de `components.css`), `lib/tipificaciones.ts`,
   los tipos y las 4 funciones de `lib/trazabilidad-api.ts` dentro de `src/lib/api.ts` (con el patrón del cliente
   actual), `viewConversationsReason` en `roles.ts` y `components/trazabilidad/*` en `src/components/rpa/trazabilidad/`.
   Ajusta rutas de import. Actualiza `CLAUDE.md` con el bloque de este paquete y el comentario de cabecera de
   `WhatsAppPreview.tsx` («única vista con texto de mensajes» → ya no es la única).
2. **F2 · Navegación.** Pestaña en el TopNav con `traceLocked` y rutas `/trazabilidad` y `/trazabilidad/:id`
   (`integracion/TOPNAV.md`). Si el backend aún no existe: una bandera `VITE_TRAZABILIDAD_MOCK=1` que sirva datos
   de prueba **ficticios** con las formas de `trazabilidad-api.ts`, solo en desarrollo; nunca en producción.
3. **F3 · Lista.** `src/pages/trazabilidad.tsx` con `TraceHeader`, `TraceKpis`, `ConversationList`: filtros en la URL,
   popovers de filtro con los componentes que ya tenga el proyecto, búsqueda con Enter, paginación por cursor,
   exportar CSV (loading + toast «Exportación lista»). Compara con `trazabilidad-lista.*.png`.
4. **F4 · Detalle.** `src/pages/trazabilidad-detalle.tsx` con `ConversationDetailView`: anterior/siguiente conservando
   el filtro, «Descargar transcripción», refresco cada 10 s solo si la conversación sigue abierta y la pestaña está
   visible. Compara con `trazabilidad-detalle.*.png`.
5. **F5 · Rendimiento por robot.** Subpestaña con `RobotPerformance`; «Ver» abre la lista filtrada por ese robot.
6. **F6 · Integración.** Robots → Ver detalle: sección «Conversaciones de este robot». En vivo / Errores recientes /
   Historial de acciones: ids de chat como enlaces al detalle (texto con motivo si no hay permiso). Usuarios:
   interruptor «Ver conversaciones» (`integracion/USUARIOS.md`).
7. **F7 · Estados y revisión.** Sin permiso (`TraceNoAccess` también ante un 403), skeletons, vacío, error con
   «Reintentar», aviso de rango para texto. Teclado y foco visible, claro/oscuro, 1440 y 1366 px sin scroll
   horizontal, < 1280 px solo íconos. Entrega la lista de datos faltantes.

## Criterios de aceptación

- [ ] La pestaña Trazabilidad aparece entre Agente y el separador para ambos roles; sin el permiso se ve
      deshabilitada con candado y el motivo en tooltip, y la ruta muestra `TraceNoAccess`.
- [ ] La lista coincide con `trazabilidad-lista.*.png` a 1440 px en claro y oscuro; filtros, rango y página viven en la URL.
- [ ] Toda tipificación se muestra con su nombre en español (y código en el detalle); ningún estado solo por color.
- [ ] El detalle coincide con `trazabilidad-detalle.*.png`: chat de solo lectura con estado de envío, intentos y
      tiempo de respuesta bajo cada mensaje del robot; recorrido real con retrocesos; fichas; motor; acciones en Abaya.
- [ ] Anterior/siguiente recorren el filtro actual; volver conserva los filtros.
- [ ] El CSV no incluye texto de mensajes. La apertura del detalle y la exportación quedan en Auditoría (lo hace el servidor; verifícalo en la pestaña Auditoría).
- [ ] Teléfono, origen por mensaje y post-transferencia aparecen como «—» con tooltip, nunca inventados.
- [ ] Cero hexadecimales fuera de `tokens.css`; cifras y horas con `tabular-nums` y formatos de `format.ts`.
- [ ] Sin scroll horizontal de la página a 1440 y 1366 px; la tabla se desplaza dentro de su tarjeta.
- [ ] Ningún dato de prueba (mock) llega a producción.
