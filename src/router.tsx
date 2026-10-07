import { createRootRoute, createRoute, createRouter, lazyRouteComponent, Link, redirect } from '@tanstack/react-router';
import { useSessionCtx } from '@/auth/session';
import { AppShell } from '@/layout/app-shell';
import { ForcedChangePage, LoginPage } from '@/pages/login';
import { InicioPage } from '@/pages/inicio';
import type { StepId } from '@/data/types';

// Pantallas cargadas bajo demanda (el editor, los gráficos y el simulador pesan).
const PersonalidadPage = lazyRouteComponent(() => import('@/pages/personalidad'), 'PersonalidadPage');
const PasosPage = lazyRouteComponent(() => import('@/pages/pasos'), 'PasosPage');
const TextosFijosPage = lazyRouteComponent(() => import('@/pages/textos-fijos'), 'TextosFijosPage');
const TextoFijoEditorPage = lazyRouteComponent(() => import('@/pages/textos-fijos'), 'TextoFijoEditorPage');
const ObjecionesPage = lazyRouteComponent(() => import('@/pages/objeciones'), 'ObjecionesPage');
const TextoLegalPage = lazyRouteComponent(() => import('@/pages/texto-legal'), 'TextoLegalPage');
const CatalogoPage = lazyRouteComponent(() => import('@/pages/catalogo'), 'CatalogoPage');
const CampanasPage = lazyRouteComponent(() => import('@/pages/campanas'), 'CampanasPage');
const SimuladorPage = lazyRouteComponent(() => import('@/pages/simulador'), 'SimuladorPage');
const VersionesPage = lazyRouteComponent(() => import('@/pages/versiones'), 'VersionesPage');
const EvaluacionesPage = lazyRouteComponent(() => import('@/pages/evaluaciones'), 'EvaluacionesPage');
const MonitoreoPage = lazyRouteComponent(() => import('@/pages/monitoreo'), 'MonitoreoPage');
const AuditoriaPage = lazyRouteComponent(() => import('@/pages/auditoria'), 'AuditoriaPage');
const ConfiguracionPage = lazyRouteComponent(() => import('@/pages/configuracion'), 'ConfiguracionPage');

function Root() {
  const { session } = useSessionCtx();
  if (!session) return <LoginPage />;
  return session.mustChange ? <ForcedChangePage /> : <AppShell />;
}

function NotFound() {
  return (
    <div className="grid place-items-center py-24 text-center">
      <p className="text-[22px] font-semibold">Esta página no existe</p>
      <Link to="/" className="mt-2 text-sm text-primary underline-offset-4 hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

const root = createRootRoute({ component: Root, notFoundComponent: NotFound });
const r = <P extends string>(path: P, component: Parameters<typeof createRoute>[0]['component']) => createRoute({ getParentRoute: () => root, path, component });

const routes = [
  r('/', InicioPage),
  createRoute({ getParentRoute: () => root, path: '/conversacion', beforeLoad: () => { throw redirect({ to: '/conversacion/personalidad' }); } }),
  r('/conversacion/personalidad', PersonalidadPage),
  createRoute({
    getParentRoute: () => root,
    path: '/conversacion/pasos',
    component: PasosPage,
    validateSearch: (s: Record<string, unknown>): { paso?: StepId } => ({ paso: str(s.paso) as StepId | undefined }),
  }),
  r('/conversacion/textos-fijos', TextosFijosPage),
  r('/conversacion/textos-fijos/$id', TextoFijoEditorPage),
  r('/conversacion/objeciones', ObjecionesPage),
  r('/conversacion/texto-legal', TextoLegalPage),
  createRoute({ getParentRoute: () => root, path: '/catalogo', component: CatalogoPage, validateSearch: (s: Record<string, unknown>): { plan?: string } => ({ plan: str(s.plan) }) }),
  r('/campanas', CampanasPage),
  createRoute({
    getParentRoute: () => root,
    path: '/simulador',
    component: SimuladorPage,
    validateSearch: (s: Record<string, unknown>): { contenido?: string } => ({ contenido: str(s.contenido) }),
  }),
  r('/versiones', VersionesPage),
  r('/evaluaciones', EvaluacionesPage),
  createRoute({ getParentRoute: () => root, path: '/monitoreo', component: MonitoreoPage, validateSearch: (s: Record<string, unknown>): { chat?: string } => ({ chat: str(s.chat) }) }),
  r('/auditoria', AuditoriaPage),
  r('/configuracion', ConfiguracionPage),
];

export const router = createRouter({ routeTree: root.addChildren(routes), defaultPreload: 'intent', scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
