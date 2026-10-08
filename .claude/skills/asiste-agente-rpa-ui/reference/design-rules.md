Sistema de diseño del **panel del Agente RPA de ventas de Asiste ING**. El robot es de Asiste: opera la aplicación Abaya como un asesor humano y atiende la **campaña Claro Móvil por WhatsApp** (Claro es el cliente, no la marca del panel). El panel es la consola interna para vigilar, controlar y configurar el robot; nunca lo ven los clientes.

La interfaz sigue el estilo de Asiste ING (Opción C de Recursos Humanos y Asistencia): barra superior navy, Outfit para títulos y cifras, Plus Jakarta Sans para el resto, tarjetas blancas de 14 px de radio sobre `surface-0`. Las clases de referencia conservan el prefijo `ai-` de Asiste para reutilizar los componentes que ya existen (TopNav, Kpi, Badge, Chip, Table, Modal).

## Dos experiencias, una sola navegación

| Rol | Ve | Hace |
|---|---|---|
| **OPERADOR** | En vivo · Robots · Agente (solo lectura y Probar con la versión publicada) · Trazabilidad deshabilitada con motivo | Apagado de emergencia, cambiar su contraseña |
| **ADMIN** | Todo lo anterior + Usuarios · Auditoría · Trazabilidad | Reanudar robot, habilitar reintento, gestionar robots, guardar/publicar/restaurar el agente, probar el borrador, gestionar usuarios |

- `TopNav`: En vivo · Robots · Agente · **Trazabilidad** | Usuarios · Auditoría. El grupo tras el separador solo se renderiza para ADMIN. Trazabilidad se renderiza para todos; para el OPERADOR se ve deshabilitada con candado y motivo (`traceLocked`).
- Dentro de Agente, subpestañas `Tabs sub`: Configuración · Probar agente · Historial · Evaluaciones.
- Lo que un rol no puede hacer se ve **deshabilitado con motivo** ("Requiere rol ADMIN"), no se oculta. Excepción: las pestañas de administración, que no se renderizan para OPERADOR.

## Configuración del agente (estilo Retell)

La pantalla del agente sigue la estructura de Retell/Dapta para **editar el prompt completo**:

1. `AgentBar` arriba: nombre, chip `CLARO MÓVIL`, `VersionStatus`, contexto ("Borrador v15 · basado en v14…"), indicador "Cambios sin guardar" y **Descartar · Guardar borrador · Publicar** (la evaluación es evidencia, D-005).
2. **Columna 1 (ancha):** fila de ajustes (Modelo de la lista permitida, Temperatura 0–0,3 con aviso si el modelo no la usa, Idioma fijo con candado) y el `PromptEditor`: el guion en Markdown con etapas `## MENU`, `## PERFIL`, `## OFERTA`, `## OBJECIONES`, `## AUTORIZACION`, hasta 30 000 caracteres.
3. **Columna 2:** `Accordion` con Ajustes del agente, Mensaje de bienvenida (saludo editable + menú A–D fijo), **Catálogo en solo lectura** por proceso (Portabilidad, Migración, Línea nueva) con "Insertar" `{{OFERTA:CÓDIGO}}` en el cursor, Reglas del sistema (no editables) y Funciones del motor (en código).
4. **Columna 3:** Probar agente en vivo (`WhatsAppPreview`) con el selector "Lo que hay en el editor / Versión publicada".

## Reglas no negociables

- **Sin datos personales ni contenido de mensajes reales**, salvo en dos lugares: el chat de simulación y la pestaña **Trazabilidad** (autorizada por Claro por escrito, citada en `DECISIONS.md`). Trazabilidad es solo para ADMIN y cada apertura de un detalle o exportación queda en Auditoría (`CONVERSATION_VIEWED`, `CONVERSATIONS_EXPORTED`). En el resto del panel siguen solo estados, conteos, ids (`AB-77120`) y tiempos.
- **Precios, planes y textos legales no van en el guion.** El `PromptEditor` subraya en rojo cualquier precio (`$ 99.900`), gigas (`55 GB`) o porcentaje (`20 %`), marca la línea y lista el error con enlace; no se puede guardar con errores. En la bienvenida además se bloquean promesas ("gratis", "te regalo"), enlaces y marcadores.
- **El flujo no se configura visualmente.** No hay editor de nodos; las etapas se muestran (`StageTrack`) pero las decide la máquina de estados.
- **Publicar es inmediato (D-005)**: la evaluación (conversaciones guionadas; meta 0 datos inventados y ≥ 95 % de casos correctos) corre después de publicar o con «Evaluar» y queda como evidencia en el historial; no frena la publicación. Mientras evalúa, la pantalla se refresca cada 5 s.
- **Apagado de emergencia siempre visible** en el TopNav y a un clic con confirmación en línea, para ambos roles. Reanudar solo ADMIN. Con el robot detenido, la píldora pasa a "ROBOT DETENIDO", el TopNav se marca en rojo y aparece la banda de detenido en todas las pantallas.
- **Confirmación** en: apagado, deshabilitar robot, desactivar usuario, restablecer contraseña, actualizar todos.
- **Secretos de un solo uso** (contraseña temporal, código de instalación) con `OneTimeSecret`: destacados, monoespaciados, con Copiar; nunca se vuelven a mostrar.
- Salvaguardas de usuarios: nadie se desactiva ni se quita el rol a sí mismo; siempre queda al menos un ADMIN activo.

## Trazabilidad

Pestaña para seguir cada conversación del robot con el cliente, completa y sin enmascarar, con su tipificación y el rendimiento de cada robot. Ícono `MessagesSquare` (`messages`). Ruta `/trazabilidad` y detalle en `/trazabilidad/:id` (página completa, no drawer: el chat necesita alto).

- **Subpestañas** `Tabs sub`: Conversaciones (con conteo del filtro) · Rendimiento por robot. Rango con `Segmented`: Hoy · 7 días · 30 días · Personalizado.
- **Filtros** en `ai-toolbar`: búsqueda (id del chat de Abaya, nombre del cliente o texto de los mensajes, este último solo en rangos ≤ 30 días) y `ai-filter` para Robot, Tipificación, Proceso, Etapa final y «Pasó por revisión». Un filtro activo usa `ai-filter is-on` con su conteo.
- **KPIs del filtro** en `ai-kpi-strip` 2 × 2 (conversaciones, ventas · conversión, 1.ª respuesta p50 / p95, duración media) junto a `TypificationBar`.
- **Tabla** `ai-table--dense ai-table--compact`: Inicio → fin · Robot · Chat de Abaya (mono, con Copiar) · Cliente · `Typification short` · Etapa final (overline) · Proceso · plan (`ai-code-inline`) · Mensajes ↓ entrantes ↑ salientes · 1.ª resp. · duración · Alertas (`ai-flag`: incierto `warning`, revisión `danger`, regenerada `cat-tecnologia`, siempre con `aria-label`) · Ver. Paginación en el servidor en `ai-table-foot`, con el aviso de auditoría y la retención.
- **Detalle**: migas con anterior/siguiente del filtro y «Descargar transcripción»; cabecera con nombre del cliente en `font-display`, id del chat, `Typification showCode`, hechos (`ai-trace-facts`) y `StageTrail` con el recorrido real. Debajo, `ai-trace-grid`: `WhatsAppPreview` de solo lectura (`input:false`) con `DeliveryState` y tiempo de respuesta bajo cada mensaje del robot y eventos como pastillas; a la derecha, paneles Cliente · Venta · Consentimiento · Catálogo usado (`dl.ai-kv ai-kv--wide`). Al final, Motor (llamadas por etapa) y Acciones del robot en Abaya (`RpaActionLog`, «Ver traza» si hubo error).
- **Rendimiento por robot**: tabla robot × conversaciones, `TypificationBar thin`, ventas, % sin venta, % inactividad, revisiones, conversión, p95, inciertos y regeneradas. El peor valor del rango va en `ai-worst` (rojo + ▼) y el mejor en `ai-best` (verde + ▲); un `Callout warning` lo dice con palabras.
- **Tipificaciones** (`Conversation.status`), siempre con texto: `TRANSFERRED_BACKOFFICE` Venta transferida al backoffice (`success`) · `CLOSED_NO_SALE` Cerrada sin venta (`neutral`) · `CLOSED_SUPPORT` Derivada a soporte (*611) (`cat-tyt`) · `CLOSED_INACTIVE` Cerrada por inactividad (120 min) (`outline`; barra `cat-tecnologia`) · `NEEDS_REVIEW` Requiere revisión humana (`danger`) · `ACTIVE` En curso (`info`, punto pulsante) · `WAITING_CONSENT` Esperando autorización (`warning`; barra `cat-operacion`) · `TRANSFERRING` Transfiriendo (`info`; barra `brand-azure`).
- **Datos faltantes**: el teléfono del cliente no se guarda (`—` con tooltip); el origen de cada respuesta se muestra por etapa porque `LlmCall` no tiene `messageId`; lo que pasa después de la transferencia vive en Abaya. Nunca se inventan.
- **Estados**: sin permiso (`Empty` con candado), skeletons `ai-skel` con la forma de la tabla, sin resultados con «Limpiar filtros», error con «Reintentar», aviso de rango para buscar texto.
- **Ancho**: con seis pestañas, entre 1280 y 1420 px el reloj del TopNav se oculta para que quepan; la tabla se desplaza dentro de su tarjeta, nunca la página.

## Contenido y formatos

- Español de Colombia, trato de **tú**. Botones en infinitivo ("Habilitar reintento", "Restaurar como borrador").
- Horas `07:58` o `3:42 p. m.`; duraciones `6 h 42 m`, `1,8 s`; fechas `06/10/2026` o `Jue 24 sep 2026`; dinero `$ 99.900` (`Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`); porcentajes `15,5 %`. Hora de Bogotá.
- Toda cifra, hora o duración con `tabular-nums`.
- Códigos del sistema (ACTIVE, DOWN, UNCERTAIN, MENU…) en mayúsculas junto a su nombre en español. Campañas en MAYÚSCULAS dentro de su chip.
- Personas en Nombre Propio con tildes.

## Fundamentos visuales

**Color.** Solo `var(--token)`. Marca: `primary` (azul del wordmark) para acciones y selección, `sidebar-bg` para el TopNav, `brand-cyan` solo como acento (subrayado de pestaña activa, foco, barras, contador de alerta), nunca como fondo de botón ni texto. Estados siempre con texto: `success` (operando, en línea, publicado), `warning` (reconectando, evaluando, envío incierto), `danger` (detenido, caído, rechazado, error del guion), `primary-soft` / `primary-soft-ink` (info, pausado). `danger-solid` solo para el botón de apagado y confirmaciones destructivas. Origen de respuestas en la prueba: `cat-tyt` = plantilla del sistema, `cat-tecnologia` = modelo, `warning` = regenerado o respuesta segura, `danger` = proveedor con error.

**Tipografía.** `--font-display` (Outfit) en `page-title` 26/32, `kpi`, `panel-title` y `modal-title`. `--font-sans` (Plus Jakarta Sans) en `body`, `label`, `meta`, `overline` (encabezados de tabla en mayúsculas). `--font-mono` solo en el editor del guion, marcadores, ids y secretos. `wa-body` solo dentro de la vista de WhatsApp. En producción, empaqueta las fuentes localmente (p. ej. `@fontsource`): el panel no carga recursos externos.

**Espacio, radios y sombras.** Contenido con padding `space-6` / `space-8` y gap `space-5`. Tarjetas `radius-lg` (14 px) con `shadow-card`; botones y campos `radius-md`; insignias `radius-pill`; chips `radius-sm`. `shadow-pop` en menús, `shadow-modal` en modales.

**Foco y accesibilidad.** Anillo de 2 px en `focus-ring` en todo control. Contraste AA en ambos temas. Sin scroll horizontal de la página (las tablas anchas se desplazan dentro de su tarjeta). Debajo de 1280 px el TopNav deja solo íconos con tooltip; debajo de 768 px, menú hamburguesa.

**Movimiento.** Solo el punto pulsante de "Evaluando…" y "escribiendo…"; respeta `prefers-reduced-motion`.

## Iconografía

lucide-react con `strokeWidth={1.75}`. Equivalencias: En vivo `Activity`, Robots `Bot`, Agente `MessageSquareText`, Trazabilidad `MessagesSquare`, Usuarios `Users`, Auditoría `ScrollText`, módulos `LayoutGrid`, apagado `Power`, reanudar `Play`, pausar `Pause`, credenciales `KeyRound`, equipo `Monitor`, sin señal `WifiOff`, catálogo `Package`, probar `FlaskConical`, historial `History`, guardar `Save`, reglas `Shield`. El componente `Icon` de este sistema es un subconjunto dibujado al estilo Lucide para las vistas previas.

## Logos

Grupo **Logos**: `asiste-mark-white.png` (isotipo blanco, en el TopNav sobre `sidebar-bg`), `asiste-mark.png` (isotipo a color, en login y avatar del chat de prueba), `asiste-logo.png` (logotipo completo con "ASISTE ING S.A.S"). No se usa el logo de Claro: Claro aparece solo como nombre de la campaña en el chip `CLARO MÓVIL` y en el contenido del agente.

## Pantallas de referencia

El grupo **Pantallas** tiene maquetas completas: Agente (configuración estilo Retell), Probar agente, Historial y evaluación, Operación en vivo, Robots, Usuarios y Acceso. El grupo **Trazabilidad** tiene la lista de conversaciones, el detalle de una conversación, el rendimiento por robot y los estados (sin permiso, cargando, vacío, error), más sus componentes: `Typification`, `TypificationBar`, `StageTrail` y `DeliveryState`. Cambia el tema para verlas en oscuro. Todos los datos son ficticios.
