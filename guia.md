# Guía de instalación de los robots hijos (Agente RPA · Asiste ING)

Paso a paso para dejar un computador trabajando como **robot hijo** del Agente RPA de ventas
(campaña Claro Móvil). Fuente: `RobotRPA/apps/rpa/installer/*`, `docs/runbook.md` (secciones 7 y 10)
y `docs/informe-proyecto.md` (sección 13).

---

## 0. Cómo funciona (en una línea)

**Un robot = un usuario de Abaya = un computador.** El **servidor (padre)** guarda las credenciales
cifradas, la base de datos, las colas, el motor de conversación y el panel. Cada **equipo (hijo)**
solo corre el navegador y habla con el servidor por **HTTPS** (`/robot-api/v1`). El hijo guarda
únicamente la dirección del servidor y su token, protegidos con el usuario de Windows (DPAPI).
**Nunca guarda la contraseña de Abaya**: la recibe del servidor cada vez que arranca.

---

## 1. Requisitos

### 1.1 Del servidor (una sola vez, lo hace soporte técnico)

| Requisito | Detalle |
|---|---|
| API publicada por HTTPS | El panel (`/admin`) y la pasarela de robots (`/robot-api/v1`, incluido el WebSocket `/robot-api/v1/ws`) en el mismo servidor. Solo el puerto 443 abierto: los robots **no** acceden a PostgreSQL ni a Redis. |
| `ABAYA_BASE_URL` | Dirección de Abaya configurada en el servidor. |
| Claves de publicación | Generadas una vez con `pnpm robot:keys` (ver 2.1). |
| Paquete del robot | Armado con `pnpm robot:package` y copiado a `ROBOT_PACKAGE_FILE` (ver 2.2). |
| `ROBOT_RELEASE_PUBLIC_KEY` | Opcional; por defecto `apps/rpa/release-key.pub`. |
| Un ADMIN del panel | Es el único rol que puede agregar robots y generar códigos de instalación. |

### 1.2 De cada computador robot

- **Windows 10 u 11**, con un usuario de Windows que **permanezca con sesión iniciada** (el robot
  corre en esa sesión, como lo haría un asesor).
- **4 GB de RAM libres** y conexión estable.
- **Al menos 5 GB libres** en disco (las actualizaciones usan unos 2 GB).
- Acceso de red a **Abaya** (VPN o red de Claro si aplica) y al **servidor** (solo HTTPS).
- Salida a Internet para descargar el navegador, **o** un paquete armado con `--con-navegador`.
- **No necesita** Node.js, Git ni el proyecto: el paquete trae todo.

### 1.3 De la cuenta de Abaya

- Un **usuario robot dedicado** por equipo (por ejemplo `robot-ventas-01`), con permisos mínimos.
- Su contraseña y, si Abaya pide MFA, el **secreto TOTP**.
- Recomendado: que Claro limite a **3 chats simultáneos** por usuario robot (`MAX_CHATS_PER_ROBOT`).

---

## 2. Preparar el paquete instalador (soporte técnico, en el servidor o equipo de armado)

> Se hace una vez y luego en cada versión nueva. Si el panel ya muestra
> **"Versión publicada: … · Firma válida"** en la pestaña Robots, sigue al paso 3.

### 2.1 Claves de publicación (solo la primera vez)

```bash
pnpm robot:keys
```

- La **clave privada** (`.secrets/release-signing.key`) va al gestor de secretos o a una bóveda.
  **Nunca** se guarda en el repositorio, el servidor ni los equipos.
- La **clave pública** (`apps/rpa/release-key.pub`) viaja dentro de cada robot y la usa el servidor.
- Si la privada se pierde o se filtra: `pnpm robot:keys --forzar` y **reinstalar todos los robots**
  con un paquete nuevo (los instalados no aceptan la clave nueva).

### 2.2 Armar el paquete (en Windows)

```bash
pnpm build
pnpm robot:package                     # liviano: el navegador se descarga al instalar
pnpm robot:package --con-navegador     # incluye Chromium (equipos sin salida a Internet)
pnpm robot:package --node-exe <ruta>   # obligatorio si no se arma en Windows
```

Genera dos archivos en `dist/robot-package/`:

- `abaya-robot-windows.zip` (unos 80 MB)
- `abaya-robot-windows.zip.manifest.json` (versión, SHA-256 y tamaño, firmados con Ed25519)

### 2.3 Publicarlo

1. Copia **ambos archivos** a la ruta de `ROBOT_PACKAGE_FILE` del servidor
   (por defecto `dist/robot-package/abaya-robot-windows.zip`).
2. En el panel → **Robots** comprueba que diga **"Firma válida"**. Si dice **"Firma inválida"**, no
   se ofrecerá a ningún robot: revisa que se armó con la clave privada correcta.

---

## 3. Dar de alta el robot en el panel (ADMIN)

1. Entra al panel con un usuario **ADMIN** → pestaña **Robots**.
2. Pulsa **Agregar robot** y completa:
   - **Usuario de Abaya** de ese equipo (por ejemplo `robot-ventas-01`).
   - **Contraseña de Abaya**.
   - **MFA**: *Ninguno* o *TOTP* (en ese caso, pega el secreto TOTP).
3. Pulsa **Crear y generar código**.
4. El panel muestra la tarjeta **"Instalar \<robot\> en un equipo"** con el **código de instalación**
   (por ejemplo `HMYG-XVTT-QSDT`) y la **dirección del servidor**.
   - Sirve **una sola vez** y **vence a las 24 h** (la tarjeta muestra la fecha y hora exactas).
   - **No contiene la contraseña de Abaya.**
   - **Se muestra una sola vez**: cópialo ahora. Si lo pierdes o vence, genera otro (paso 8.1).

> Un OPERADOR ve el botón **Agregar robot** deshabilitado con el motivo «Requiere rol ADMIN».

---

## 4. Preparar el computador (con TI, antes de producción)

El instalador **revisa** estos puntos y deja los avisos en `preparacion.txt`, pero **no los
cambia**. Lo ideal es resolverlos antes:

| Punto | Qué configurar |
|---|---|
| Suspensión | *Suspender: Nunca* con corriente (Configuración → Sistema → Energía). |
| Windows Update | **Horas activas** que cubran el horario de atención (para que no reinicie en ese horario). |
| Inicio de sesión | **Inicio de sesión automático** del usuario de Windows del robot (el robot corre en su sesión). |
| Disco | Al menos 5 GB libres. |
| Antivirus | **Excepción** para la carpeta `%LOCALAPPDATA%\AbayaRobot` (no se puede verificar solo: confírmalo con TI). |

Inicia sesión en Windows con **el usuario que va a ejecutar el robot**. Debe ser siempre el mismo:
el token queda protegido con DPAPI para ese usuario.

---

## 5. Instalar en el computador

### 5.1 Obtener el paquete

- En el navegador del computador abre el panel → **Robots** → **Descargar instalador**
  (`abaya-robot-windows.zip`), **o** cópialo con una USB.
- **Descomprímelo** en cualquier carpeta (por ejemplo `Descargas\abaya-robot`). No lo ejecutes
  desde dentro del zip.

### 5.2 Ejecutar el instalador

1. Doble clic en **`instalar.cmd`**.
2. Escribe lo que te pide:
   - **Dirección del servidor**: la que muestra la tarjeta del panel (por ejemplo
     `https://rpa.empresa.com`). Tiene que ser **HTTPS** (ver 5.4).
   - **Código de instalación**: el del paso 3 (por ejemplo `HMYG-XVTT-QSDT`).
3. Espera a que termine. Verás estos pasos:

| Paso en pantalla | Qué hace |
|---|---|
| `Deteniendo el robot anterior` | Solo si ya había un robot corriendo desde esa carpeta. |
| `Copiando la versión X a …\versions\X` | Copia la app y Node.js a `%LOCALAPPDATA%\AbayaRobot\versions\<versión>` (versiones lado a lado para actualizar y revertir). |
| `Instalando el navegador del robot (Chromium)` | Lo copia del paquete o lo descarga de Internet. |
| `Registrando este equipo en el servidor` | Canjea el código y guarda `robot.json` con la URL y el token, protegidos con DPAPI. |
| *(sin mensaje)* | Crea `robot.local.env` (solo configuración local, nada secreto) y deja la carpeta legible **solo** por tu usuario de Windows y SYSTEM. |
| `Configurando el arranque automático…` | Acceso directo **Robot Abaya** en la carpeta *Inicio* de Windows (arranca minimizado al iniciar sesión). |
| `Revisando la preparación del equipo` | Muestra `[OK]` / `[AVISO]` y lo guarda en `preparacion.txt`. |
| `Iniciando el robot` | Abre la ventana **Robot Abaya** minimizada. |

4. Al final debe decir:

```
Listo. Este equipo (NOMBRE-PC) quedó registrado como robot-ventas-01 (versión X).
En el panel (pestaña Robots) debe aparecer En línea en menos de un minuto.
```

### 5.3 Opciones del instalador

```bat
instalar.cmd -SinVentana                                         :: navegador oculto (headless)
instalar.cmd -Servidor https://rpa.empresa.com -Codigo ABCD-EFGH-JKLM   :: sin preguntas (instalación masiva)
instalar.cmd -NoIniciar                                          :: instala sin arrancar el robot
instalar.cmd -SinArranqueAutomatico                              :: no crea el acceso en Inicio
instalar.cmd -Destino D:\AbayaRobot                              :: otra carpeta (por defecto %LOCALAPPDATA%\AbayaRobot)
instalar.cmd -Puerto 3002                                        :: puerto local del robot (por defecto 3001)
instalar.cmd -PermitirHttp                                       :: SOLO pruebas: acepta un servidor por HTTP
```

Se pueden combinar, por ejemplo:
`instalar.cmd -Servidor https://rpa.empresa.com -Codigo ABCD-EFGH-JKLM -SinVentana`.

### 5.4 Sobre HTTPS

El robot **solo acepta servidores HTTPS**. Las únicas excepciones son `localhost`/`127.0.0.1`
(desarrollo) y `-PermitirHttp` (pruebas en red interna). No uses `-PermitirHttp` en producción.

---

## 6. Verificar que quedó bien

1. **En el panel → Robots**: el robot aparece **En línea**, con el **nombre del equipo**, en menos de
   1 minuto.
2. **En el computador**: la ventana **Robot Abaya** está abierta (minimizada) y muestra
   `Iniciando el robot (versión X)...` sin errores.
3. Abre `%LOCALAPPDATA%\AbayaRobot\preparacion.txt` y resuelve con TI cada `[AVISO]`.
4. Cierra y vuelve a abrir la sesión de Windows: el robot debe arrancar solo.
5. Para un piloto: **un robot**, horario limitado y revisión diaria de conversaciones con Claro.

### Qué queda en el equipo

```
%LOCALAPPDATA%\AbayaRobot\
├─ versions\<versión>\app\      código del robot
├─ versions\<versión>\node\     Node.js
├─ navegador\                   Chromium
├─ datos\                       sesión cifrada y trazas de error (7 días)
├─ robot.json                   URL del servidor + token (DPAPI)
├─ robot.local.env              ventana visible/oculta, puerto, carpetas
├─ current.txt                  versión activa
├─ iniciar.cmd / iniciar.ps1    lanzador (reinicia el robot si se cae)
├─ actualizar.cmd               pide la última versión publicada
├─ desinstalar.cmd
├─ preparacion.txt              revisión del equipo
└─ LEEME.txt
```

---

## 7. Uso diario

| Para… | Haz… |
|---|---|
| Detener el robot en ese equipo | Cerrar la ventana **Robot Abaya**. |
| Iniciarlo | `%LOCALAPPDATA%\AbayaRobot\iniciar.cmd` (o cerrar y abrir sesión). |
| Pausarlo sin apagar el equipo | Panel → Robots → **Pausar** (ADMIN). Sigue leyendo mensajes; no actúa en Abaya hasta **Reanudar**. |
| Detener **todos** los robots | **Apagado de emergencia** en la barra superior del panel (ambos roles). Reanudar: solo ADMIN. |
| Cambiar la contraseña de Abaya | Panel → **Credenciales**. El robot la toma en su próximo arranque (cerrar la ventana y abrir `iniciar.cmd`). |

Reglas:

- **No uses el navegador del robot** para otras tareas.
- El robot debe correr con el **mismo usuario de Windows** que lo instaló.
- **Un usuario de Abaya, un equipo a la vez.** Si el mismo robot arranca en otro equipo mientras
  está en línea, el segundo se niega a trabajar (alerta `ROBOT_DUPLICATE`).
- El lanzador reinicia el robot a los **30 s** si se cae.

---

## 8. Casos frecuentes

### 8.1 El código venció o se perdió

Panel → Robots → en la fila del robot, **Nuevo código (reinstalar)**. Ejecuta de nuevo
`instalar.cmd` con el código nuevo.

### 8.2 Cambiar el robot de computador

1. **Apaga** el equipo viejo (cierra la ventana **Robot Abaya**) y, si ya no se usará,
   ejecuta `desinstalar.cmd` en él.
2. Panel → **Nuevo código (reinstalar)**.
3. Instala en el equipo nuevo (paso 5) con ese código.

### 8.3 Cambiar el usuario de Windows que ejecuta el robot

El token está protegido con DPAPI para el usuario que instaló: **reinstala con un código nuevo**
iniciando sesión con el usuario nuevo.

### 8.4 Equipo robado, perdido o retirado

Panel → **Deshabilitar** (con confirmación). Revoca su token: si está encendido se apaga en menos
de 15 s y no vuelve a arrancar. El equipo nunca guardó la contraseña de Abaya; aun así, cámbiala en
Abaya si el equipo no se recupera.

### 8.5 Cambios del lanzador o del instalador

Las actualizaciones automáticas **no** cambian `iniciar.ps1` ni `instalar.ps1`. Si una versión trae
cambios en ellos, hay que **reinstalar** con código nuevo.

---

## 9. Actualizaciones

Se hacen **desde el panel**, sin ir a los equipos:

1. Soporte publica la versión nueva (paso 2.2 y 2.3) y el panel muestra **Firma válida**.
2. Panel → Robots → **Actualizar** (un robot, para probar) o **Actualizar todos** (con confirmación).
3. Cada robot: descarga y verifica firma y SHA-256 en segundo plano (sigue atendiendo) →
   **"Esperando a terminar sus chats"** → se reinicia en la versión nueva (unos 20 s fuera de línea)
   → la confirma tras 2 minutos en línea (**"Actualizado"**).
4. Si la versión nueva se cae dos veces en sus primeros 2 minutos, el lanzador **vuelve solo a la
   anterior** (**"Revertida"**) y alerta `ROBOT_UPDATE_FAILED`. No la reintenta solo.

Desde el equipo (si el panel no está disponible): doble clic en
`%LOCALAPPDATA%\AbayaRobot\actualizar.cmd`. La firma se verifica igual.

---

## 10. Solución de problemas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `El servidor no aceptó el código. Genere uno nuevo en el panel` | Código usado, vencido (24 h) o mal escrito. | Panel → **Nuevo código (reinstalar)** y volver a instalar. |
| `El servidor debe usar HTTPS` | La dirección empieza por `http://`. | Usar la dirección `https://` del panel. Solo para pruebas: `-PermitirHttp`. |
| `No se pudo descargar el navegador` | Sin salida a Internet. | Revisar la red o usar un paquete armado con `--con-navegador`. |
| `No se pudo copiar … (robocopy N)` / `No se pudieron asignar permisos` | Archivos en uso, antivirus o sin permisos. | Cerrar la ventana **Robot Abaya**, revisar la excepción del antivirus y repetir. |
| Ventana: *"El servidor indicó que este equipo no debe ejecutar el robot"* | Robot **deshabilitado**, **ya en línea en otro equipo** o instalación **revocada**. | Revisar la fila en el panel; si hace falta, **Nuevo código (reinstalar)**. |
| Ventana: *"No se encuentra la versión '…' del robot"* | Carpeta de versión dañada o borrada. | Reinstalar con un código nuevo. |
| En el panel: **Sin señal** | No reporta hace más de 1 min: equipo apagado, sin red o colgado. | Revisar el equipo y la red; abrir `iniciar.cmd`. |
| En el panel: **Caído (login)** | 3 logins fallidos en Abaya (contraseña vencida, usuario bloqueado, MFA). | Entrar a mano a Abaya desde ese equipo; corregir en **Credenciales**; luego **Habilitar reintento** en En vivo (ADMIN) y reiniciar el robot. |
| Alerta `ROBOT_DUPLICATE` | El mismo robot en dos equipos. | Dejarlo en uno solo (ver 8.2). |
| Alerta `ROBOT_TOKEN_REUSE` | Se copió `robot.json` o robaron el equipo; el servidor ya revocó el robot. | Ubicar el equipo legítimo, cambiar la contraseña de Abaya (**Credenciales**) y **reinstalar** con código nuevo. |
| `preparacion.txt` con `[AVISO]` | Suspensión, Windows Update, inicio automático, disco o antivirus. | Resolver con TI (paso 4) antes de producción. |

---

## 11. Desinstalar

1. En el equipo: `%LOCALAPPDATA%\AbayaRobot\desinstalar.cmd`. Detiene el robot, quita el arranque
   automático y borra la carpeta.
2. En el panel: **Deshabilitar** el robot si el equipo deja de usarse (en el servidor sigue
   registrado hasta que lo deshabilites).

---

## Lista de verificación por equipo

- [ ] Usuario de Abaya dedicado, con contraseña (y TOTP si aplica).
- [ ] Robot creado en el panel y código copiado (vigente, menos de 24 h).
- [ ] Windows 10/11, sesión del usuario del robot, 4 GB de RAM libres y 5 GB de disco.
- [ ] Red hacia Abaya y hacia el servidor por HTTPS.
- [ ] Suspensión *Nunca*, horas activas de Windows Update, inicio de sesión automático y excepción del antivirus.
- [ ] `instalar.cmd` terminó con «Listo».
- [ ] **En línea** en el panel con el nombre del equipo.
- [ ] Arranca solo tras cerrar y abrir sesión.
- [ ] `preparacion.txt` sin avisos pendientes.
