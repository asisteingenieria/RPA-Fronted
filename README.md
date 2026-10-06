# interfazRPA — Panel Sofía

Panel de administración del robot RPA de ventas en Abaya (proyecto `RobotRPA`). Desde aquí el equipo
cambia cómo responde **Sofía** sin tocar código: personalidad, instrucciones por paso, textos fijos,
objeciones, texto legal, catálogo de planes y campañas. Cada cambio se prueba, se evalúa, se aprueba y
recién entonces se publica.

Diseño: kit de Claude Design en `.claude/skills/panel-sofia-ui/` (tokens, reglas, maquetas). La
especificación funcional está en `.claude/skills/panel-sofia-ui/reference/spec-panelRPA.md`.

## Arrancar

```bash
pnpm install
pnpm dev          # http://localhost:5180
pnpm test         # motor de simulación y evaluaciones
pnpm build        # typecheck + build de producción en dist/
```

En la pantalla de ingreso eliges un **usuario de demostración** para recorrer cada rol:

| Usuario | Rol | Qué puede hacer |
|---|---|---|
| Ana Rojas | Editor de contenido | Edita el borrador y lo envía a evaluación |
| Juan Pérez | Aprobador | Aprueba, publica y revierte (no lo que él mismo escribió) |
| Carolina Méndez | Legal | Único rol que edita y aprueba el texto legal |
| Luis Gómez | Operador | Inicio, monitoreo, auditoría y apagado de emergencia |
| María Torres | Administrador | Configuración, usuarios y roles |

Menú del usuario → **Restablecer datos de demostración** vuelve todo al estado inicial.

## Recorrido sugerido

1. Como **Ana**: Textos fijos → Saludo y menú → cambia un texto → Guardar borrador → Probar borrador
   (simulador) → Enviar a evaluación.
2. Como **Juan**: Versiones → revisa las diferencias → Aprobar → Publicar (pide nota de cambio).
3. Prueba que una cifra escrita a mano en una instrucción de IA (por ejemplo «$ 89.900» en el paso
   Oferta) hace **fallar** la evaluación y bloquea la aprobación.

## Cómo está hecho

| Carpeta | Contenido |
|---|---|
| `src/pages/` | Las 14 pantallas de la especificación + ingreso |
| `src/components/panel/` | Componentes del kit (insignias, stepper, vista WhatsApp, apagado) y propios (editor con variables, diff, línea de tiempo, diagrama de flujo, embudo) |
| `src/components/ui/` | shadcn/ui, ajustado a los tokens del kit |
| `src/engine/` | Simulador local de la máquina de estados, validadores y suite de evaluación |
| `src/data/` | Modelo de datos, semilla de demostración y backend simulado (`store.ts`) |
| `src/hooks/` | Datos reactivos, edición de secciones del borrador con detección de cambios |

Stack: React 19 · Vite · TypeScript estricto · Tailwind v4 · shadcn/ui (Radix) · TanStack Router y
Query · React Hook Form + zod · CodeMirror 6 · Recharts · lucide-react. Todo empaquetado localmente
(sin CDN), compatible con la CSP estricta del panel del robot.

### Reglas del robot que respeta la interfaz

- **Guardar nunca publica**: Borrador → Evaluación → Aprobación → Publicada (y Reversión).
- **Precios, planes y textos legales no son texto libre**: el catálogo es un formulario validado; los
  editores de IA avisan si hay cifras escritas a mano y la evaluación falla.
- **Cuatro ojos**: el autor no puede aprobar su propio cambio; los cambios legales requieren además Legal.
- **Datos personales**: el contenido de los chats en Monitoreo está oculto; verlo pide motivo y se audita.
- **Auditoría encadenada**: toda acción queda registrada con huella encadenada.

## Datos: qué es real y qué es simulado

- **Contenido** (versiones, borrador, catálogo, textos, evaluaciones): **simulado en el navegador**
  (`src/data/store.ts`, `localStorage`). El robot aún no expone una API de contenido.
- **Operación** (estado del robot, apagado de emergencia, cola de revisión): **real** si defines
  `VITE_ADMIN_API_URL` en `.env` (ver `.env.example`) apuntando a `apps/api` de RobotRPA; el panel pide
  entonces el token de administración. Sin esa variable, también es simulado.
- **Simulador**: sigue el mismo flujo que la máquina de estados del robot, pero lo que en
  producción redacta la IA se aproxima con las preguntas y respuestas guía. La prueba con el modelo
  real corresponde a `pnpm evals` en RobotRPA.

### Para conectarlo de verdad (pendiente en RobotRPA)

1. API de contenido en `apps/api`: `GET/PUT /admin/content/draft`, `POST /admin/content/versions`
   (enviar a evaluación), `POST …/:n/approve|reject|publish|revert`, `GET /admin/evals`. Cada función
   de `backend` en `src/data/store.ts` corresponde a una llamada.
2. Ampliar el modelo `Plan` en Prisma (GB para compartir, incluye, servicios, apps ilimitadas,
   llamadas, descuento) y crear `ContentVersion` con el contenido inmutable por versión.
3. Que el worker lea la versión publicada (plantillas, catálogo, parámetros) en vez de los archivos
   sintéticos, y que «Publicar» exija la evaluación aprobada en el servidor.
4. SSO corporativo (OIDC) en lugar de los usuarios de demostración; los permisos los aplica el servidor.
