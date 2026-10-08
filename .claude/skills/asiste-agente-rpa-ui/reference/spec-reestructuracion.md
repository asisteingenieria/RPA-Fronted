# Reestructuración de la interfaz — Panel del Agente RPA de ventas (Abaya)

> Documento para **Claude Design**: inventario completo de funcionalidades del panel y del sistema,
> para rediseñar la interfaz con dos experiencias: **Administrador** y **Operación**.
> Fecha: 2026-10-07 · Versión del sistema: v1.8 (plan `docs/planRPA.md`).

---

## 1. Qué es el sistema (en una línea)

Un **robot de ventas** que opera la aplicación web **Abaya** como un asesor humano: inicia sesión,
atiende los chats de WhatsApp que le asignan, conduce la venta de planes móviles pospago con un
**motor de conversación propio** (máquina de estados + catálogo + LLM que solo redacta) y, cuando el
cliente autoriza, deja una nota interna y **transfiere el chat al backoffice**.

El **panel** (lo que se va a rediseñar) es la consola web del equipo interno para vigilar, controlar
y configurar el robot. **Nunca lo ven los clientes.**

- URL local: `http://localhost:3000/panel/` (lo sirve el proceso `api`).
- Stack del panel: **React 19 + Vite**, sin librería de componentes; CSS propio con tokens
  (claro/oscuro automático). Idioma: español (Colombia). Hora: Bogotá.

---

## 2. Aclaración: ¿qué se quitó?

**No se quitó nada del panel.** El chat de simulación ("Probar agente" en Dapta, "Test" en Retell)
**nunca había existido** en este proyecto: se propuso como opción y quedó fuera del primer alcance.
**Ya se agregó** (ver 3.2).

Lo que Dapta y Retell tienen y este panel **no tiene** (no es que se haya quitado: nunca se hizo).
Sirve para decidir qué incluir en el rediseño:

| Función en Dapta / Retell | ¿Existe aquí? | Comentario |
|---|---|---|
| Configuración del agente (ajustes + bloque grande de prompt) | ✅ Sí (v1.8) | Pestaña **Agente → Configuración**. |
| Probar agente / Test (chat de simulación) | ✅ Sí (v1.8) | Pestaña **Agente → Probar agente**. |
| Historial de versiones del agente | ✅ Sí | Tabla "Historial" con restaurar como borrador. |
| Guardar / Publicar | ✅ Sí | Publicar exige pasar la suite de evaluación (ver 3.1). |
| Base de conocimiento ("Brain") editable con precios | ⚠️ Distinto | Aquí el **catálogo** se ve en solo lectura; se carga por script desde los datos oficiales de Claro. Los precios **nunca** van en el prompt (regla de negocio). Candidato: pantalla de catálogo (solo lectura o carga de archivo por ADMIN). |
| Simulación con cliente sintético automático (Retell: "Prueba de simulación" con identidad y objetivo) | ⚠️ Parcial | Existe la **suite de evaluación** de 60 conversaciones guionadas que corre al publicar, pero no hay pantalla para verla/editarla. Candidato: pestaña "Evaluaciones" con el último reporte. |
| Análisis de conversación / Historial de conversaciones reales | ✅ Sí (D-002) | Pestaña **Trazabilidad**: conversaciones completas sin enmascarar, autorizadas por Claro, solo para ADMIN y con cada apertura y exportación en Auditoría. Spec: `reference/trazabilidad/SPEC-TRAZABILIDAD.md`. |
| Métricas | ✅ Parcial | Operación (conteos del día) y Robots (rendimiento por robot y rango de fechas). No hay gráficos. Candidato: tablero con gráficos. |
| Canales | ❌ No aplica | Solo existe el canal Abaya (WhatsApp vía Abaya). |
| Funciones / herramientas (end_chat, transferencia de agentes, extraer variables, código) | ⚠️ En código | Transferir, cerrar, escalar y extraer datos del cliente existen, pero los decide la máquina de estados, no se configuran en la UI (regla: el flujo lo decide el código). |
| Integraciones CRM (HubSpot, Salesforce, Zendesk…), Webhooks, MCPs | ❌ No | Fuera del alcance v1. Solo hay webhook de **alertas** (Slack/Teams) por variable de entorno. |
| "Mejorar con IA" / "Director" / "Manual del agente" | ❌ No | Candidatos opcionales (asistente que sugiere mejoras al guion). |
| Idioma, temperatura, modelo | ✅ Sí | Temperatura limitada a 0–0.3; modelos de una lista permitida. |

---

## 3. Cambios hechos en esta sesión (v1.8)

### 3.1 Configuración del agente estilo Dapta/Retell
- **Apartado de configuración** (columna izquierda): Idioma (fijo: Español Colombia), Nombre del
  agente, Nombre de empresa, Descripción de la empresa, Modelo (lista permitida o "por defecto del
  servidor"), Temperatura (deslizador 0–0.3; aviso si el modelo es Claude, que no la usa).
- **Mensaje de bienvenida** con vista previa tipo burbuja: saludo editable + menú de opciones A–D
  fijo (el menú no se edita porque el flujo depende de las letras).
- **Catálogo en solo lectura** (equivalente al "Brain"): planes por proceso (Portabilidad, Migración,
  Línea nueva) con código, nombre, GB y precio, y botón **"Copiar marcador"** `{{OFERTA:CODIGO}}`.
- **Bloque grande del guion** (columna derecha) en Markdown, con conmutador **Vista previa |
  Markdown**, contador de tokens y caracteres (máx. 30 000), organizado por etapas con títulos
  `## MENU`, `## PERFIL`, `## OFERTA`, `## OBJECIONES`, `## AUTORIZACION`.
- **Revisión en vivo**: si se escribe un precio ($99.900), gigas (55 GB) o porcentaje (20 %) en el
  guion, aparece el error con **enlace a la línea**; en la bienvenida además se bloquean promesas
  ("gratis", "te regalo"…), enlaces y marcadores. No se puede guardar con errores.
- **Reglas del sistema (no editables)**: plegable que muestra la parte fija del prompt que va
  siempre antes del guion.
- **Estados de una versión**: Borrador · Evaluando… · Publicado · Rechazado · Archivado (pastillas
  de color). Indicador "Cambios sin guardar". Botones **Descartar**, **Guardar**, **Publicar**.
- **Publicar = pasar la suite de evaluación**: el servidor corre 60 conversaciones guionadas con el
  borrador; solo publica si hay **0 datos inventados y ≥ 95 % de casos correctos**. Si falla, la
  versión queda **Rechazada** con una tarjeta roja: motivos, resultado y casos fallidos
  (desplegable). La pantalla se actualiza sola cada 5 s mientras evalúa.
- Avisos cuando **no se puede publicar** (proveedor simulado o sin API key).
- **Historial**: versión, estado, agente, modelo, quién guardó, quién publicó, resultado de la
  evaluación y **"Restaurar como borrador"**.

### 3.2 Probar agente (chat de simulación) — agregado hoy
- Sub‑pestaña **Agente → Probar agente**.
- Selector: **"Lo que hay en el editor"** (incluso sin guardar; solo ADMIN) o **"Versión publicada"**
  (OPERADOR siempre prueba la publicada).
- Chat estilo WhatsApp: burbujas del cliente (derecha) y del robot (izquierda) con formato
  (*negrita*, saltos de línea, fichas de planes).
- Debajo de cada respuesta del robot, una etiqueta de **origen**: "plantilla del sistema",
  "modelo · validado", "modelo · regenerado 1 vez", "respuesta segura", "proveedor con error", más
  modelo y latencia.
- **Eventos** en el chat como pastillas centradas: "Consentimiento registrado", "Transferencia al
  backoffice (con nota interna)", "Chat cerrado (soporte *611)", "Chat cerrado sin venta",
  "Escalado a un asesor humano", "Pasaría a revisión humana".
- Panel lateral **"Estado de la simulación"**: etapa actual, proceso, nombre, uso, plan ofrecido,
  plan aceptado, proveedor. Aviso si el proveedor es "simulado" (no lee el guion).
- Botón **Reiniciar conversación**; al terminar (transferencia, soporte, cierre, escalado) el campo
  se bloquea con aviso.
- Usa el **motor real** (máquina de estados, catálogo, validadores). No toca Abaya ni guarda nada.

### 3.3 Otros
- Usuarios locales de prueba creados (ADMIN y OPERADOR) — credenciales fuera de este documento.
- La base de pruebas automáticas ahora es UTF‑8 (los emojis de la bienvenida funcionan).

---

## 4. Roles y permisos (matriz completa)

| Acción | ADMIN | OPERADOR |
|---|:---:|:---:|
| Ver Operación: sesiones, conteos, revisiones, errores | ✅ | ✅ |
| **Apagado de emergencia** (detener todo el robot) | ✅ | ✅ |
| **Reanudar** el robot | ✅ | ❌ |
| Habilitar reintento de una sesión caída (DOWN) | ✅ | ❌ |
| Ver auditoría del panel | ✅ | ❌ |
| Ver robots y su rendimiento | ✅ | ✅ |
| Agregar robot, pausar/reanudar robot, deshabilitar, generar código de instalación, cambiar credenciales de Abaya, actualizar versión, ver/descargar trazas de error | ✅ | ❌ |
| Ver configuración del agente e historial | ✅ | ✅ |
| Guardar, publicar, restaurar configuración del agente | ✅ | ❌ |
| Probar agente con lo del editor (sin guardar) | ✅ | ❌ |
| Probar agente con la versión publicada | ✅ | ✅ |
| Gestionar usuarios del panel (crear, rol, activar/desactivar, restablecer contraseña) | ✅ | ❌ |
| Cambiar su propia contraseña | ✅ | ✅ |

Salvaguardas que la UI debe reflejar: nadie se desactiva ni se quita el rol a sí mismo; siempre
queda al menos un ADMIN activo; desactivar o restablecer cierra las sesiones del usuario.

---

## 5. Inventario de pantallas actuales

### 5.1 Acceso
- **Login**: usuario + contraseña. Error genérico (no revela si el usuario existe). Bloqueo de
  15 min tras 5 intentos fallidos.
- **Cambio obligatorio de contraseña** en el primer ingreso (contraseña temporal). Política: mínimo
  12 caracteres, sin palabras/secuencias comunes ni el nombre de usuario.
- Sesión: cookie segura, 8 h máximo, 30 min de inactividad → vuelve al login.

### 5.2 Barra superior (todas las pantallas)
- Título "Agente RPA · Operación" + hora de última actualización (refresco cada 10 s).
- Pastilla **"Robot operando"** (verde) / **"ROBOT DETENIDO"** (rojo; la barra se marca en rojo).
- Botón rojo **"Apagado de emergencia"** con confirmación en línea ("¿Detener TODAS las acciones del
  robot?" → Confirmar / Cancelar). Si está detenido: **"Reanudar robot"** (solo ADMIN).
- **"Salir (usuario · ROL)"**.
- Pestañas: Operación · Robots · Agente · Usuarios (solo ADMIN) · Cambiar contraseña.

### 5.3 Operación (tablero del día)
- **Tarjetas de métricas**: Conversaciones activas · En transferencia · Ventas hoy · Transferidas al
  backoffice hoy · Requieren revisión (rojo si > 0).
- **Sesiones de los robots** (tabla): robot, estado (ACTIVE / RELOGGING / PAUSED / DOWN), último
  heartbeat, último login, fallos seguidos, botón **"Habilitar reintento"** si está DOWN (ADMIN).
- **Requieren revisión humana** (tabla): tipo (conversación en revisión / envío incierto), chat de
  Abaya, robot, detalle (etapa o intentos), desde.
- **Errores recientes del robot** (tabla, últimos 20): hora, robot, acción, chat, resultado
  (ERROR / UNCERTAIN).
- **Auditoría del panel** (solo ADMIN): hora, usuario, acción, objetivo.

### 5.4 Robots (un robot = un usuario de Abaya = un computador)
- Filtro de rango: **Hoy · Últimos 7 días · Últimos 30 días**.
- Resumen: robots en línea / con problemas.
- Paquete publicado: versión, tamaño, fecha, firma válida/ inválida; **"Actualizar todos"**,
  **"Descargar instalador"**.
- **Tabla "Robots por equipo"**: robot, equipo, estado (En línea · Reconectando · Caído · Sin señal ·
  Apagado · Deshabilitado, con ayuda al pasar el mouse), pastilla "Pausado", última señal ("hace
  12 s"), versión y estado de actualización, chats abiertos / tope (3), tiempo de respuesta p95,
  conversaciones, ventas, conversión, envío p95, errores / inciertos. Acciones por fila:
  **Actualizar / Cancelar actualización, Pausar / Reanudar, Credenciales, Deshabilitar /
  Habilitar, Ver detalle**.
- **Agregar robot**: usuario de Abaya, contraseña, MFA (ninguno / TOTP + secreto) → **"Crear y
  generar código"**.
- **Instalar en un equipo**: pasos, código de instalación de un solo uso (vence en 24 h), URL del
  servidor. Botón "Nuevo código" para reinstalar o cambiar de equipo.
- **Credenciales**: cambiar contraseña de Abaya / MFA (nunca se muestran las actuales).
- **Detalle de un robot**: ficha (equipo, versión, inicio, última señal, instalado, MFA, último
  arranque duplicado rechazado), tiempo de respuesta (muestras, p50, p95, máx.), sesión, métricas
  (conversaciones por resultado, ventas, transferidas, conversión), **rendimiento por acción**
  (total, OK, errores, inciertas, bloqueadas, p50, p95), **trazas de error** de 7 días (descargar,
  solo ADMIN), **historial de acciones** (últimas 100: hora, acción, chat, resultado, duración).

### 5.5 Agente
Ver sección 3: **Configuración** (ajustes, bienvenida, catálogo, guion, reglas del sistema, revisión,
estados, publicar con evaluación), **Probar agente** (chat de simulación) e **Historial**.

### 5.6 Usuarios (solo ADMIN)
- **Crear usuario**: nombre de usuario + rol → muestra la **contraseña temporal una sola vez**
  (tarjeta destacada para copiar).
- **Tabla**: usuario, rol (cambiable), estado (activo / inactivo / bloqueado hasta…), cambio de
  contraseña pendiente, último ingreso, creado por. Acciones: cambiar rol, activar/desactivar,
  **Restablecer contraseña**.

### 5.7 Cambiar contraseña
Contraseña actual + nueva + confirmación, con la política explicada.

---

## 6. Resto del sistema (no es UI, pero la UI lo refleja)

- **Motor de conversación**: etapas MENU → PERFIL → OFERTA ⇄ OBJECIONES → AUTORIZACION →
  TRANSFERENCIA; salidas a SOPORTE, CIERRE_SIN_VENTA, ESCALAR. Menú y autorización deterministas
  (solo "SÍ AUTORIZO" explícito es consentimiento). Precios y textos legales siempre de plantillas
  y catálogo. Seis validadores anti‑alucinación; si fallan: regenerar 1 vez → respuesta segura.
- **Ráfagas**: espera 4 s sin mensajes antes de responder; un turno a la vez por conversación.
- **Envío seguro**: verifica la identidad del chat antes de escribir; envíos inciertos nunca se
  reintentan solos (pasan a revisión).
- **Venta**: guarda venta + evidencia de consentimiento (cadena de hashes), nota interna y
  transferencia a la cola de backoffice; si falla 2 veces → revisión y alerta crítica.
- **Cierres**: soporte (*611), no interesado, inactividad (120 min).
- **Capacidad**: 3 chats simultáneos por robot; prioridad de acciones (enviar > abrir > transferir
  > leer > cerrar).
- **Robots padre/hijo**: el servidor central tiene base de datos, colas, motor y panel; cada
  computador robot solo corre el navegador y habla con el servidor por HTTPS (token atado al
  equipo). Actualizaciones firmadas con reversión automática.
- **Alertas** (logs + Slack/Teams): sesión caída, heartbeat perdido, selector roto, venta sin
  transferir, revisión pendiente, envío incierto, cliente sin respuesta > 2 min, robot sobrecargado,
  respuesta lenta, robot duplicado, errores del proveedor LLM, validación fallida, prueba de humo,
  cola acumulada, reúso de token, actualización fallida. *(Hoy no hay pantalla de alertas:
  candidato para el rediseño.)*
- **Trazas** solo en error, cifradas, 7 días. **Auditoría** inmutable de todas las acciones.

---

## 7. Reglas que el diseño debe respetar (no negociables)

1. **Sin datos personales ni contenido de mensajes reales** en el panel: solo estados, conteos,
   ids y tiempos. Excepciones: el chat de **simulación** (texto de prueba) y la pestaña
   **Trazabilidad** (autorización de Claro, D-002; solo ADMIN; auditada).
2. **Precios, planes y textos legales no se editan en el guion**: el catálogo se muestra aparte, en
   solo lectura.
3. **El flujo de la conversación no es configurable** visualmente (no hay editor de flujos tipo
   nodos): lo decide la máquina de estados del código.
4. **Publicar siempre pasa por la evaluación**: no puede existir un botón "publicar sin probar".
5. **Apagado de emergencia siempre visible** y a un clic (con confirmación) para ambos roles;
   reanudar solo ADMIN.
6. Acciones destructivas o sensibles con confirmación: apagado, deshabilitar robot, desactivar
   usuario, restablecer contraseña, actualizar todos.
7. **Secretos de un solo uso** (contraseña temporal, código de instalación) se muestran una vez,
   destacados y fáciles de copiar; nunca se vuelven a mostrar.
8. Accesible y usable en pantallas pequeñas (sin scroll horizontal de la página), claro/oscuro.

---

## 8. Propuesta de estructura para el rediseño

### 8.1 Experiencia **Operación** (OPERADOR) — "¿está todo bien y qué necesita atención?"
- **Inicio / En vivo**: semáforo general (robot operando / detenido), botón de emergencia grande,
  tarjetas del día, lista priorizada de **lo que requiere atención** (revisiones, envíos inciertos,
  robots caídos, alertas recientes).
- **Robots**: tarjetas o tabla con estado, chats abiertos/tope, tiempos y última señal; detalle en
  solo lectura.
- **Probar agente**: chat de simulación con la versión publicada.
- **Mi cuenta**: cambiar contraseña.

### 8.2 Experiencia **Administrador** (ADMIN) — todo lo anterior, más:
- **Agente**: Configuración (ajustes + guion grande + catálogo), Probar agente (editor o
  publicada), Historial y resultado de evaluaciones.
- **Robots (gestión)**: agregar, instalar (código), credenciales, pausar, deshabilitar,
  actualizaciones y trazas.
- **Usuarios**: alta, roles, estados, restablecer.
- **Auditoría**: quién hizo qué y cuándo (con filtros).
- **Sesiones**: habilitar reintento de sesiones caídas.

### 8.3 Ideas nuevas a evaluar en el diseño
- Pantalla de **Alertas** (historial y estado) en lugar de solo logs/Slack.
- Pantalla de **Evaluaciones** (último reporte: % correctos, inventados, latencias, casos fallidos).
- **Catálogo** visible para todos (solo lectura) con vigencias.
- **Gráficos** de ventas, conversión y tiempos por día/robot.
- Navegación lateral (como Retell: Agente · Flujo de trabajo · Simulación) en vez de pestañas.
- Inserción de marcadores `{{OFERTA:…}}` directa en el cursor del editor (hoy se copian).

---

## 9. Datos técnicos para el diseño

- Paleta actual (tokens CSS): fondo `#f4f5f7`, superficie `#ffffff`, texto `#1b1f24`, apagado
  `#5f6b7a`, borde `#dde1e6`, acento `#1f5fbf`, ok `#1f7a4d`/`#e3f4ea`, advertencia
  `#8a5a00`/`#fdf1d8`, error `#b3261e`/`#fbe4e2`; modo oscuro equivalente.
- Tipografía: system-ui; monoespaciada para el editor del guion.
- Componentes existentes: tarjetas, pastillas de estado (ok / warn / bad / muted), tablas, botones
  (primario, fantasma, peligro, pequeño, enlace), conmutador segmentado, formularios en línea,
  avisos (advertencia / ok / error), burbujas de chat.
- Endpoints que la UI consume: `/admin/auth/*`, `/admin/overview`, `/admin/review`,
  `/admin/audit`, `/admin/kill-switch`, `/admin/sessions/:robot/reset`, `/admin/users*`,
  `/admin/robots*`, `/admin/agent*` (overview, review, draft, publish, versions, restore, test).
