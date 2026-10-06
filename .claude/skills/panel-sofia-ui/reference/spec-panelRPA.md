# Panel de administración — Robot de ventas Abaya (Sofía)

> Documento de diseño para Claude Design. Versión 1.0 · 6 de octubre de 2026.
> Objetivo: diseñar la interfaz completa del panel con el que el equipo de Claro administra el robot
> que vende planes móviles pospago por WhatsApp dentro de la plataforma Abaya.

---

## 1. Contexto del producto

Un robot (RPA) opera la plataforma de chats **Abaya** como un asesor humano: lee los mensajes de
WhatsApp de los clientes, responde como **"Sofía"**, la asesora virtual de Claro Colombia, ofrece
planes pospago, pide la autorización legal de consulta de datos y transfiere la venta a un asesor
humano (backoffice).

El panel sirve para **cambiar cómo responde Sofía sin tocar código**: personalidad, instrucciones
de cada paso de la conversación, textos fijos, objeciones, texto legal, catálogo de planes y
campañas. También sirve para probar los cambios, aprobarlos, publicarlos y vigilar la operación.

### Principio de diseño más importante

La conversación **no se controla con un único prompt gigante**. Está dividida en piezas con
reglas distintas, y la interfaz debe dejar clara esa diferencia:

| Pieza | Quién escribe el texto final que ve el cliente | Cómo se edita en el panel |
|---|---|---|
| Personalidad y estilo | El modelo de IA, siguiendo estas instrucciones | Formulario + texto libre |
| Instrucciones por paso | El modelo de IA | Texto libre con variables permitidas |
| Textos fijos (saludo, menú, despedida, transferencias…) | El sistema, **palabra por palabra** | Editor de plantilla con vista previa |
| Texto legal de autorización | El sistema, **palabra por palabra** | Editor restringido, con aprobación legal |
| Planes, precios y descuentos | El sistema, desde el catálogo | Formulario estructurado (nunca texto libre) |
| Reglas de la oferta (orden, cantidad) | El sistema | Parámetros (interruptores, números, selectores) |

Usar una **marca visual consistente** para distinguirlas en todo el panel:
- 🤖 **"Lo redacta la IA"** (por ejemplo, insignia violeta): el texto es una guía; el modelo lo adapta.
- 🔒 **"Texto exacto"** (por ejemplo, insignia gris o azul con candado): se envía tal cual.
- ⚖️ **"Legal"** (por ejemplo, insignia ámbar): restringido y con aprobación.

Ningún cambio llega a los clientes al guardarlo. Todo se guarda como **borrador**, pasa una
**evaluación automática**, lo **aprueba** un responsable y después se **publica**. Ese ciclo
(borrador → evaluación → aprobación → publicación → reversión) es el eje del producto y debe verse
siempre.

---

## 2. Usuarios y roles

| Rol | Puede |
|---|---|
| **Operador** | Ver Inicio, Monitoreo y Auditoría; usar el apagado de emergencia; marcar casos de revisión como resueltos. |
| **Editor de contenido** | Todo lo del Operador + editar borradores (personalidad, pasos, textos fijos, objeciones, catálogo, campañas) y usar el simulador. |
| **Aprobador** | Todo lo del Editor + aprobar, publicar y revertir versiones. |
| **Legal** | Editar y aprobar el texto de autorización. |
| **Administrador** | Usuarios, roles y configuración. |

- Lo que un rol no puede hacer se muestra **deshabilitado con explicación** (tooltip "Requiere rol
  Aprobador"), no se oculta.
- Cada acción queda en la auditoría con el nombre del usuario.
- El inicio de sesión es con la cuenta corporativa (SSO). Diseñar solo la pantalla de bienvenida
  con el botón "Ingresar con cuenta corporativa".

---

## 3. Lineamientos visuales

- **Idioma:** español de Colombia, trato de "tú" en la interfaz. Fechas `05/10/2026`, horas 24 h,
  moneda `$ 99.900`.
- **Plataforma:** escritorio primero (1280–1920 px), usable en tablet (≥ 768 px). No requiere móvil.
- **Estilo:** herramienta corporativa sobria, densa pero legible, del estilo de Linear, Vercel o
  Stripe Dashboard. Espaciado generoso en los editores y compacto en las tablas.
- **Tema claro y oscuro.**
- **Color:**
  - Neutros como base.
  - Un color primario para acciones.
  - Rojo reservado para el **apagado de emergencia**, errores y alertas críticas.
  - Ámbar para advertencias y lo legal.
  - Verde para estados correctos y publicados.
  - No usar el rojo como color de marca aunque Claro lo use: aquí el rojo significa peligro.
- **Tipografía:** sans-serif del sistema o Inter para la interfaz y monoespaciada para variables,
  códigos y hashes.
- **Componentes:** basados en **shadcn/ui** (Radix + Tailwind), porque así se implementará. Usar
  sus patrones: Sidebar, Card, Table, Tabs, Dialog, Sheet (panel lateral), Badge, Switch,
  Select, Toast, Tooltip, Command (búsqueda), Breadcrumb.
- **Íconos:** Lucide.
- **Recursos:** sin recursos externos en tiempo de ejecución (sin fuentes ni imágenes de CDN), por
  la política de seguridad del panel.
- **Accesibilidad:** contraste AA, foco visible y navegación por teclado en todos los editores.
- **Vista previa de WhatsApp:** en varias pantallas aparece un componente que imita una
  conversación de WhatsApp (burbujas, colores y tipografía similares). Debe interpretar el formato
  de WhatsApp: `*negrita*` (un asterisco), viñetas `•`, saltos de línea y emojis.

---

## 4. Estructura general (layout)

### 4.1 Barra lateral (colapsable)
1. **Inicio**
2. **Conversación**
   - Personalidad
   - Instrucciones por paso
   - Textos fijos
   - Objeciones
   - Texto legal
3. **Catálogo de planes**
4. **Campañas**
5. **Probar conversación**
6. **Versiones y publicación**
7. **Evaluaciones**
8. **Monitoreo**
9. **Auditoría**
10. **Configuración**

### 4.2 Encabezado fijo
- **Estado del robot:** píldora con punto de color, con estos valores:
  - 🟢 *Activo*
  - 🔴 *Detenido*
  - 🟠 *Sin sesión en Abaya*
  - ⚪ *Sin señal*

  El tooltip muestra el último latido.
- **Versión publicada:** "Contenido v12 · publicada 05/10/2026 14:32 por J. Pérez". Al hacer
  clic va a Versiones.
- **Borrador:** etiqueta "Borrador con 4 cambios sin publicar" (solo si existen); al hacer clic
  muestra el resumen de cambios.
- **Botón Apagado de emergencia:** rojo, siempre visible. Abre un modal: "Esto detiene de
  inmediato todos los envíos a clientes. La lectura de mensajes continúa." con los botones
  **Sí, detener** y **Cancelar**. Con el robot detenido, el botón cambia a **Reanudar robot**.
- **Búsqueda global** (Ctrl+K): pasos, plantillas, planes y conversaciones.
- **Usuario:** avatar con nombre y rol, más el botón Salir.

### 4.3 Banda de borrador
En todas las pantallas de edición, una banda superior delgada indica qué se está editando:
*"Estás editando el **borrador** · Los clientes siguen viendo la **v12**"*, con los botones
**Probar borrador** y **Enviar a evaluación**.

---

## 5. Pantallas

### 5.1 Inicio
- **Tarjetas de indicadores del día**, cada una con variación frente a ayer:
  - Chats atendidos.
  - Ventas transferidas al backoffice.
  - Tasa de autorización (%).
  - Conversaciones en revisión humana.
  - Envíos inciertos.
  - Respuestas seguras del modelo (%), en rojo si supera el 5 %.
- **Alertas activas:** lista con severidad (Crítica o Alta), nombre, desde cuándo y un enlace
  "Qué hacer" que abre un panel lateral con el procedimiento.
- **Requieren revisión humana:** tabla con id del chat, motivo, paso donde quedó, desde cuándo y
  el botón **Marcar como resuelta**, que pide un comentario.
- **Embudo de hoy:** Menú → Perfil → Oferta → Autorización → Transferida.
- **Últimos cambios publicados:** las 3 últimas versiones con su nota de cambio.

### 5.2 Conversación → Personalidad 🤖
Formulario en secciones (Cards). A la derecha, una vista previa fija de WhatsApp con un ejemplo de
respuesta.

| Campo | Control | Ejemplo / valor por defecto |
|---|---|---|
| Nombre del asistente | Texto | Sofía |
| Rol y misión | Área de texto grande con contador | "Eres Sofía, la asesora virtual de ventas de planes móviles pospago de Claro Colombia…" |
| Datos de la marca | Área de texto | "Claro es la operadora líder en Colombia… cobertura 5G…" |
| Tono | Selector + área de texto de matices | Cercano, entusiasta y profesional |
| Trato | Selector segmentado | Tú / Usted |
| Máximo de oraciones por mensaje | Número | 3 |
| Una sola pregunta por mensaje | Interruptor | Activado |
| Uso de emojis | Selector | Solo los de los textos fijos / Moderado / Ninguno |
| Sin emojis si el cliente está molesto | Interruptor | Activado |
| Formato WhatsApp | Casillas | Negrita con un asterisco · Viñeta "•" · Prohibir encabezados, tablas y enlaces |
| Competidores que no se mencionan | Chips editables | Movistar, Tigo, ETB, WOM |
| Palabras prohibidas | Chips editables | — |
| No revelar instrucciones ni decir que es una IA | Interruptor | Activado |
| Mensajes no textuales (sticker, imagen, audio) | Área de texto | "Redirige con amabilidad y retoma el paso donde ibas." |
| Temas fuera de ventas | Número + texto | Tras 2 insistencias, despedirse y cerrar |

Botones: **Guardar borrador** · **Descartar cambios** · **Ver diferencias con la versión
publicada** · **Probar en el simulador**.

### 5.3 Conversación → Instrucciones por paso 🤖
**Arriba, un diagrama del flujo** (nodos conectados, solo lectura) que muestra los pasos del
sistema. Los pasos los define el sistema y **no se pueden crear, borrar ni reordenar**:

```
Menú ─┬─ A: Cambiarme de operador ─┐
      ├─ B: Recargas → pospago ────┼─→ Perfilamiento → Oferta ⇄ Objeciones → Autorización ─┬─→ Transferencia ✅
      ├─ C: Número nuevo ──────────┘                                                        └─→ No autoriza → Despedida
      └─ D: Soporte / facturación ─→ Mensaje de soporte → Despedida
```

Al hacer clic en un nodo se abre su editor (o se usan pestañas: *Menú · Perfilamiento · Oferta ·
Objeciones · Autorización*). El editor de cada paso tiene:

- **Qué hace este paso** (solo lectura): descripción, pasos siguientes posibles y datos que
  recoge (por ejemplo "Nombre · Operador actual · Perfil de uso").
- **Instrucciones para el modelo:** editor de texto con:
  - Variables insertables como chips de color (`[Nombre]`, `[Operador]`, `[Perfil de uso]`,
    `{{PLANES}}`, `{{PLAN_ELEGIDO}}`). Una variable desconocida aparece subrayada en rojo.
  - **Advertencia en línea** si el texto contiene un precio, una cifra de GB o un porcentaje:
    *"Los precios, GB y descuentos los inserta el sistema desde el Catálogo. Usa `{{PLANES}}`."*
  - Contador de caracteres.
- **Preguntas del paso** (en Perfilamiento): lista ordenada, con el texto de cada pregunta y el
  dato que recoge (solo lectura). Por ejemplo:
  - "¡Excelente decisión! 😊 ¿Con quién tengo el gusto?" → Nombre
  - "Un gusto, [Nombre]. Cuéntame, ¿con qué operador manejas hoy tu línea móvil?" → Operador
    (solo en la opción A)
  - "¿El plan lo vas a usar mayormente para trabajo, estudio o uso diario?" → Perfil de uso
- **Parámetros de la oferta** (solo en el paso Oferta, como formulario y nunca como texto libre):

| Parámetro | Control | Por defecto |
|---|---|---|
| Ofrecer primero el plan de mayor precio | Interruptor | Activado |
| Máximo de planes en la segunda oferta | Número (1–5) | 3 |
| No repetir el plan ya ofrecido | Interruptor | Activado |
| Criterio para perfil **Trabajo** | Selector | Más datos y llamadas internacionales |
| Criterio para perfil **Estudio** | Selector | Buenos datos + apps ilimitadas, precio moderado |
| Criterio para perfil **Uso diario** | Selector | Menor precio con apps ilimitadas |
| Formato de la línea de plan | Editor con chips `[Datos]` `[GB compartir]` `[Incluye]` `[Llamadas]` `[Precio]` `[Descuento]` | `• *[Datos]* + [GB compartir] para compartir \| [Incluye] \| *[Precio]* \| [Descuento]` |
| Detalle de un plan a pedido | Número de líneas máximas | 3 |

  Debajo, una **vista previa en vivo** de la oferta con planes reales del catálogo y un selector
  "Ver como: Opción A / B / C".
- Botones: **Guardar borrador** · **Probar este paso** · **Historial del paso**.

### 5.4 Conversación → Textos fijos 🔒
**Vista de lista:** tabla con nombre, paso, fragmento del texto, última edición (usuario y fecha) y
estado (*Publicado* o *Modificado en borrador*).

Textos fijos incluidos:
1. Saludo y menú (primera respuesta)
2. Respuesta al preguntar por el beneficio de la campaña
3. Soporte o facturación (opción D)
4. Inicio del cierre ("¡Excelente elección, [Nombre]! 🎉…")
5. Gracias y transferencia tras autorizar
6. Cliente no autoriza
7. Transferencia a asesor
8. Sin planes para el proceso ("Un asesor te compartirá las mejores opciones para tu caso.")
9. Pregunta de despedida ("¿Hay algo más en lo que pueda ayudarte…?")
10. Despedida final
11. Respuesta segura (cuando el modelo falla o no pasa la validación)
12. Mensaje por inactividad
13. Mensaje fuera de horario

**Editor de un texto fijo**, en dos columnas:
- **Izquierda:** área de texto que respeta saltos de línea y emojis, más una barra de herramientas:
  - Selector de emojis.
  - Botón **Negrita WhatsApp** (envuelve la selección en `*…*`).
  - Viñeta `•`.
  - Chips de variables permitidas para ese texto.
  - Contador de caracteres.
- **Derecha:** vista previa como burbuja de WhatsApp, exactamente como la recibirá el cliente.
- En **Saludo y menú**, debajo del texto, un sub-editor **Opciones del menú** (4 filas: A, B, C,
  D). Cada fila tiene el emoji de la letra (🅐 🅑 🅒 🅓), el texto visible (editable) y "lleva a"
  (solo lectura: Cambio de operador, Recargas → pospago, Número nuevo, Soporte).
- Insignia 🔒 *"Se envía exactamente así"*.
- Botones: **Guardar borrador** · **Restaurar versión publicada** · **Ver diferencias**.

### 5.5 Conversación → Objeciones 🤖
Lista de tarjetas, una por objeción. Cada tarjeta tiene:
- **Nombre:** Precio, Cobertura, "Lo voy a pensar", "Estoy bien con mi operador", Cliente molesto…
- **Frases de ejemplo del cliente:** chips. Sirven para detectarla y para las pruebas.
- **Respuesta guía:** área de texto con vista previa.
- **Acción siguiente:** selector entre *Continuar con la oferta*, *Mostrar el plan más
  económico*, *Preguntar ciudad* y *Ofrecer asesor y transferir*.
- Interruptor **Activa**.

Botones: **Agregar objeción** · **Eliminar** (con confirmación) · **Guardar borrador**.

### 5.6 Conversación → Texto legal ⚖️ (acceso restringido)
- Banner ámbar: *"Texto legal de autorización (Ley 1266 de 2008 y Ley 1581 de 2012). Solo el rol
  Legal puede editarlo. Cada versión queda registrada como evidencia de lo que aceptó cada
  cliente."*
- Editor del texto con la variable **`{{FECHA}}` bloqueada**, que no se puede borrar. En la
  vista previa se muestra como "5 de octubre de 2026".
- **Respuesta que cuenta como autorización:** campo de texto (por ejemplo `SÍ AUTORIZO`), con la
  nota *"Solo esta respuesta explícita cuenta como autorización. Cualquier otra respuesta se
  trata como duda o negativa."*
- Campos: referencia normativa, versión del texto (automática) y fecha de vigencia.
- **Historial:** tabla de versiones con número, autor, aprobador, fecha y huella (hash corto en
  monoespaciada, copiable).
- Botones: **Guardar borrador** · **Solicitar aprobación legal** · **Ver diferencias**.
- Usuarios sin rol Legal ven la pantalla en solo lectura, con el candado visible.

### 5.7 Catálogo de planes 🔒
- **Pestañas por proceso**, con nombres de negocio y contador:
  - *Cambiarme de operador (opción A)*: si no tiene planes, aviso ámbar "Sin planes activos:
    los clientes de esta opción se transfieren directo a un asesor".
  - *Recargas → pospago (opción B)* · 4 activos.
  - *Número nuevo (opción C)* · 3 activos.
- **Tabla:**
  - Columnas: Código · Datos · GB para compartir · Incluye · Precio · Descuento · Vigencia ·
    Activo (interruptor).
  - Se puede ordenar por precio (por defecto de mayor a menor, que es el orden de oferta).
  - Acciones por fila: Editar · Duplicar · Desactivar.
  - Marca visual en la fila del **plan de mayor precio**: "Se ofrece primero".
- **Formulario de plan** (panel lateral):

| Campo | Control | Validación |
|---|---|---|
| Código | Texto (ej. M1) | Obligatorio, único |
| Proceso | Selector | Obligatorio |
| Datos | Número de GB **o** casilla "Ilimitados" | Obligatorio |
| GB para compartir | Número | Opcional |
| Incluye | Texto (ej. Amazon Prime, Win Play) | Opcional; si está vacío no se muestra |
| Servicios adicionales | Chips (Claro video, Claro club, Claro drive 100 GB, Claro música…) | Opcional |
| Apps ilimitadas al agotar datos | Chips (X, WhatsApp, Facebook, Instagram) | Opcional |
| Llamadas y mensajes | Texto | Obligatorio |
| Precio mensual (IVA incluido) | Número con formato `$ 99.900` | Obligatorio, > 0 |
| Descuento | Casilla "Sin descuento" o texto aprobado (ej. "25% CFM en mes 1 y 2") | — |
| Vigente desde / hasta | Fechas | "Desde" obligatorio |

  Debajo del formulario, una vista previa del plan tal como aparece en WhatsApp: versión de oferta
  principal y versión de línea en la lista.
- Botones de la página: **Nuevo plan** · **Importar catálogo (CSV/JSON)** · **Exportar** ·
  **Guardar borrador**.
- **Importar** abre un asistente de 3 pasos: subir archivo → vista previa con errores por fila →
  confirmar.

### 5.8 Campañas
- **Lista:** nombre, fechas, estado (*Programada*, *Activa* o *Finalizada*) e interruptor.
- **Formulario:**
  - Nombre (ej. "Navidad 2026").
  - **Bloque del saludo:** texto con emojis que se inserta en el saludo, con vista previa del
    saludo completo.
  - **Respuesta al preguntar por el beneficio:** texto fijo.
  - Fecha y hora de inicio y fin.
  - Activa.
- Regla visible: *"Solo una campaña activa a la vez. Al terminar, el saludo vuelve al texto sin
  campaña automáticamente."*

### 5.9 Probar conversación (simulador)
Pantalla de tres columnas:
- **Izquierda, configuración:**
  - Contenido a probar: *Borrador actual* / *Versión publicada* / *Versión específica*.
  - Botón **Comparar lado a lado**, que divide el chat en dos: borrador y publicada.
  - Casos guardados (lista) con botón **Cargar**.
- **Centro, chat tipo WhatsApp:** burbujas del cliente (derecha) y de Sofía (izquierda), campo
  para escribir como cliente, botones rápidos para enviar "[sticker]", "[imagen]" o "[audio]", e
  indicador "Sofía está escribiendo…".
- **Derecha, depuración por turno** (acordeón por cada respuesta):
  - Paso actual → paso siguiente.
  - Intención detectada (ej. `ELIGE_OPCION`, `OBJECION`).
  - Datos recogidos: Nombre, Opción, Operador, Perfil, Plan elegido.
  - Validadores: lista con ✓ o ✗ (sin datos inventados, formato WhatsApp, una sola pregunta,
    sin competidores…).
  - Si se usó la respuesta segura y por qué.
  - Tiempo de respuesta y proveedor del modelo.
- Banner fijo: *"Simulación: no se envía nada a Abaya ni a clientes reales."*
- Botones: **Reiniciar conversación** · **Guardar como caso de prueba** (pide nombre y resultado
  esperado) · **Exportar transcripción**.

### 5.10 Versiones y publicación
- **Línea de tiempo vertical** de versiones de contenido. Cada versión muestra número, autor,
  fecha, nota de cambio, estado y resultado de la evaluación.
- **Estados** con insignia: *Borrador* · *En evaluación* · *Evaluación fallida* · *Lista para
  aprobar* · *Aprobada* · *Publicada* · *Retirada*.
- **Stepper del ciclo** en la parte superior para la versión en curso:
  `Borrador → Evaluación → Aprobación → Publicada`.
- **Detalle de versión:**
  - Diferencias agrupadas por sección (Personalidad, Pasos, Textos fijos, Objeciones, Legal,
    Catálogo, Campañas), con lo añadido en verde y lo quitado en rojo, en vista unificada o
    lado a lado.
  - Resumen: "3 textos fijos modificados · 1 plan nuevo · precio de M2 cambió de $ 56.900 a
    $ 54.900". Los cambios de precio y de texto legal se resaltan.
- **Botones según estado y rol:**
  1. **Enviar a evaluación**, para el Editor. Al pulsarlo muestra el progreso de la suite.
  2. **Aprobar** o **Rechazar con comentario**, para el Aprobador. **Aprobar queda deshabilitado
     si la evaluación falló**, con el motivo visible. Si hay cambios legales, también se
     requiere la aprobación de Legal.
  3. **Publicar**, para el Aprobador. Abre un modal de confirmación con resumen de cambios y nota
     de cambio obligatoria.
  4. **Revertir a esta versión**, en cualquier versión publicada antes. Pide confirmación y usa
     un ciclo abreviado.
- El autor de un cambio **no puede aprobar su propio cambio** (control de cuatro ojos). Mostrarlo
  deshabilitado con explicación.

### 5.11 Evaluaciones
- **Resumen de la última corrida:**
  - % de casos aprobados, con meta ≥ 95 % y barra.
  - **Datos inventados: 0**, indicador grande que se pone rojo si es mayor que 0 (bloquea la
    publicación).
  - Proveedor y modelo de IA, duración y versión evaluada.
- **Tabla de casos:** nombre, categoría (flujo feliz, objeción, intento de manipulación, fuera de
  alcance…), resultado (✓/✗) y turno donde falló.
- **Detalle de un caso:** conversación completa con el turno fallido resaltado y la explicación
  ("Mencionó un precio que no está en el catálogo").
- **Historial de corridas:** gráfico de líneas con el % aprobado por corrida.
- Botones: **Correr evaluación** (con selector de proveedor de IA) · **Agregar caso** · **Casos
  guardados desde el simulador**.

### 5.12 Monitoreo
- **Lista de conversaciones** con filtros: fecha, paso actual, resultado (*Venta transferida*,
  *Sin venta*, *En curso*, *En revisión*), opción del menú y campaña.
- Columnas: id del chat, inicio, paso, opción, plan ofrecido o elegido, resultado y duración.
- **Detalle:** línea de tiempo de pasos y acciones del robot (enviado, verificado, nota,
  transferencia).
  - El **contenido de los mensajes está oculto por defecto** (datos personales). El botón
    **Mostrar contenido** pide un motivo y queda en la auditoría.
- **Gráficos:**
  - Ventas por día.
  - Embudo por paso.
  - Motivos de cierre sin venta.
  - Tasa de respuestas seguras.
  - Distribución por opción del menú.
- Exportar a CSV (sin datos personales).

### 5.13 Auditoría
- Tabla de solo lectura con fecha y hora, usuario, rol, acción (Publicó versión, Activó apagado,
  Vio contenido, Editó plan…), objeto y detalle.
- Filtros por usuario, tipo de acción y rango de fechas. Botón **Exportar**.
- Indicador **"Cadena de auditoría íntegra ✓"**, que se vuelve rojo si la verificación falla.

### 5.14 Configuración (Administrador)
- **Modelo de IA:** proveedor y modelo en solo lectura, con el texto *"Se cambia solo con una
  evaluación aprobada"* y un enlace a Evaluaciones.
- **Tiempos:**
  - Espera antes de responder una ráfaga de mensajes (segundos).
  - Inactividad para cerrar el chat (minutos).
  - Mensaje de inactividad (enlace a Textos fijos).
- **Horario de atención:** grilla de días y horas, más el mensaje fuera de horario.
- **Usuarios y roles:** tabla (nombre, correo, rol, último acceso) y botón **Invitar usuario**.
- **Alertas:** destino de notificaciones (Teams o Slack) y prueba de envío.

---

## 6. Estados y patrones transversales

- **Vacíos:** sin planes en un proceso, sin alertas ("Todo en orden ✓"), sin conversaciones,
  sin casos de prueba.
- **Carga:** skeletons en tablas y tarjetas.
- **Error:** de conexión con reintento y de permisos ("Tu rol no permite esta acción").
- **Cambios sin guardar:** punto en la pestaña o menú y modal al salir: "Tienes cambios sin
  guardar. ¿Guardar borrador / Descartar / Seguir editando?".
- **Confirmaciones obligatorias** en: publicar, revertir, apagar o reanudar el robot, eliminar
  una objeción, desactivar un plan y cambiar el texto legal.
- **Toasts:** "Borrador guardado", "Evaluación iniciada", "Versión v13 publicada".
- **Robot detenido:** banner rojo en todas las pantallas: "Robot detenido por [usuario] a las
  [hora]. Los clientes no reciben respuestas." con el botón **Reanudar**.
- **Edición simultánea:** aviso "Ana está editando esta sección" cuando otra persona tiene el
  mismo borrador abierto.

---

## 7. Datos de ejemplo para el diseño

Usar estos datos **ficticios** en las maquetas.

**Saludo y menú (texto fijo):**
```
¡Hola! Con Claro lo puedes todo.
💪📱Mi nombre es Sofía.

🎄✨ ¡En esta Navidad armamos el arbolito por ti! 🎅 Con tu plan Claro Móvil accede a beneficios exclusivos de Bienestar y asistencia para tu hogar. ¡Pregúntame cómo obtener este beneficio!

📲  Elige una de nuestras opciones:
🅐 Cambiarme de operador
🅑 Pasarme de recargas a plan pospago
🅒 Quiero un número completamente nuevo
🅓 Ya tengo plan y necesito ayuda con soporte o facturación
```

**Planes (opción B, Recargas → pospago):**

| Código | Datos | Compartir | Incluye | Apps ilimitadas | Llamadas | Precio | Descuento |
|---|---|---|---|---|---|---|---|
| M1 | GB ILIMITADAS | 70 GB | Amazon Prime | — | Ilimitados Nacional + LDI USA, Canadá, México y Puerto Rico | $ 99.900 | 25% CFM en mes 1 y 2 |
| M2 | 65 GB | 65 GB | Amazon Prime | X, WhatsApp, Facebook, Instagram | Ilimitados Nacional + LDI | $ 56.900 | 25% CFM en mes 1 y 2 |
| M3 | 45 GB | 45 GB | — | X, WhatsApp, Facebook | Ilimitados Nacional | $ 44.900 | 25% CFM en mes 1 y 2 |
| M4 | 37 GB | 37 GB | — | X, WhatsApp, Facebook | Ilimitados Nacional | $ 41.900 | 25% CFM en mes 1 y 2 |

**Planes (opción C, Número nuevo):**

| Código | Datos | Compartir | Incluye | Precio | Descuento |
|---|---|---|---|---|---|
| L1 | GB ILIMITADAS | 70 GB | Amazon Prime | $ 99.900 | Sin descuento |
| L2 | 55 GB | 55 GB | Win Play | $ 60.900 | Sin descuento |
| L3 | 65 GB | 65 GB | — | $ 53.900 | Sin descuento |

**Opción A (Cambiarme de operador):** sin planes cargados (sirve para diseñar el estado vacío).

**Conversación de ejemplo para el simulador:**
1. Cliente: "hola"
2. Sofía: *(saludo y menú)*
3. Cliente: "b"
4. Sofía: "¡Perfecto! 😊 ¿Con quién tengo el gusto?"
5. Cliente: "Laura"
6. Sofía: "Un gusto, Laura. ¿El plan lo vas a usar mayormente para trabajo, estudio o uso diario?"
7. Cliente: "trabajo"
8. Sofía: "Perfecto, Laura. Tengo para ti nuestro plan más completo:
   • *GB ILIMITADAS* + 70 GB para compartir
   • Amazon Prime
   • Minutos y SMS ilimitados Nacional + LDI USA, Canadá, México y Puerto Rico
   • *$ 99.900* | 25% CFM en mes 1 y 2
   ¿Te gustaría quedarte con este plan?"

**Indicadores de ejemplo:** 148 chats hoy · 23 ventas transferidas · 71 % de autorización ·
2 en revisión · 0 envíos inciertos · 1,4 % de respuestas seguras.

---

## 8. Entregables esperados de Claude Design

1. **Sistema de diseño:** tokens (color claro/oscuro, tipografía, espaciado, radios), insignias
   🤖/🔒/⚖️, estados de versión y componente **Vista previa de WhatsApp**.
2. **Maquetas de alta fidelidad** de todas las pantallas de la sección 5, en tema claro, más
   Inicio, Textos fijos y Simulador en tema oscuro.
3. **Flujo de publicación** paso a paso: editar → probar → enviar a evaluación (aprobada y
   fallida) → aprobar → publicar → revertir.
4. **Estados** de la sección 6 sobre al menos una pantalla cada uno.
5. **Prototipo navegable** del recorrido principal: cambiar un texto fijo, probarlo en el
   simulador y publicarlo.

---

## 9. Notas técnicas (para que el diseño sea implementable tal cual)

- **Frontend:** React 19 + Vite + TypeScript, **shadcn/ui** (Radix + Tailwind CSS), TanStack
  Router, TanStack Query, React Hook Form + zod, CodeMirror 6 para los editores de texto con
  variables, Recharts para gráficos y una librería de diff para comparar versiones.
- El panel se sirve desde el mismo backend con una política de seguridad estricta: **todo
  empaquetado localmente**, sin CDN, fuentes externas ni scripts de terceros.
- **Autenticación** con SSO corporativo (OIDC). Los permisos por rol los aplica el servidor; la
  interfaz solo los refleja.
- **El contenido es inmutable por versión.** Publicar es cambiar qué versión está activa, y
  revertir es activar una anterior. El robot toma la versión activa sin reiniciarse.
- **Evaluación obligatoria antes de publicar.** La suite corre como tarea en segundo plano y la
  interfaz muestra el progreso en vivo.
