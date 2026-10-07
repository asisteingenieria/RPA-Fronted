import type { ReactNode } from 'react';
import { createRootRoute, createRoute, createRouter, lazyRouteComponent, Link, Outlet, redirect } from '@tanstack/react-router';
import { Lock } from 'lucide-react';
import { useMe, useUser } from '@/auth/session';
import type { Range } from '@/lib/api';
import { AppShell } from '@/layout/app-shell';
import { ChangePasswordPage, ForcedChangePage, LoginPage } from '@/pages/login';
import { EnVivoPage } from '@/pages/en-vivo';
import type { RobotsSearch } from '@/pages/robots';
import { Empty, ErrorState } from '@/components/rpa/common';
import { Skeleton } from '@/components/ui/skeleton';

// Pantallas cargadas bajo demanda (el editor del guion y los modales pesan).
const RobotsPage = lazyRouteComponent(() => import('@/pages/robots'), 'RobotsPage');
const AgentePage = lazyRouteComponent(() => import('@/pages/agente'), 'AgentePage');
const UsuariosPage = lazyRouteComponent(() => import('@/pages/usuarios'), 'UsuariosPage');
const AuditoriaPage = lazyRouteComponent(() => import('@/pages/auditoria'), 'AuditoriaPage');

function Splash() {
  return (
    <div className="min-h-screen bg-surface-0" aria-busy="true" aria-label="Cargando el panel">
      <div className="h-[60px] bg-navy" />
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-8 py-6">
        <Skeleton className="h-8 w-64 bg-surface-200" />
        <Skeleton className="h-24 rounded-lg bg-surface-200" />
        <Skeleton className="h-64 rounded-lg bg-surface-200" />
      </div>
    </div>
  );
}

function Root() {
  const me = useMe();
  if (me.isLoading) return <Splash />;
  if (me.isError) {
    return (
      <main className="grid min-h-screen place-items-center bg-surface-0 p-6">
        <ErrorState message="No hay conexión con el servidor del robot." onRetry={() => void me.refetch()} retrying={me.isFetching} />
      </main>
    );
  }
  if (!me.data) return <LoginPage />;
  if (me.data.mustChangePassword) return <ForcedChangePage me={me.data} />;
  return <AppShell />;
}

/** Usuarios y Auditoría no se muestran a OPERADOR; si llega por URL, se explica. */
function AdminOnly({ children }: { children: ReactNode }) {
  const me = useUser();
  if (me.role === 'ADMIN') return <>{children}</>;
  return (
    <Empty
      icon={Lock}
      title="Requiere rol ADMIN"
      action={
        <Link to="/en-vivo" className="text-sm font-semibold text-primary-soft-ink hover:underline">
          Ir a En vivo
        </Link>
      }
    >
      Esta sección solo está disponible para administradores.
    </Empty>
  );
}

function NotFound() {
  return (
    <div className="grid place-items-center py-24 text-center">
      <p className="font-display text-[22px] font-semibold">Esta página no existe</p>
      <Link to="/en-vivo" className="mt-2 text-sm font-semibold text-primary-soft-ink hover:underline">
        Volver a En vivo
      </Link>
    </div>
  );
}

const root = createRootRoute({ component: Root, notFoundComponent: NotFound });
const shell = createRoute({ getParentRoute: () => root, id: 'shell', component: Outlet });

const RANGES: Range[] = ['hoy', '7d', '30d'];
const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

const routes = [
  createRoute({
    getParentRoute: () => shell,
    path: '/',
    beforeLoad: () => {
      throw redirect({ to: '/en-vivo' });
    },
  }),
  createRoute({ getParentRoute: () => shell, path: '/en-vivo', component: EnVivoPage }),
  createRoute({
    getParentRoute: () => shell,
    path: '/robots',
    component: RobotsPage,
    validateSearch: (s: Record<string, unknown>): RobotsSearch => {
      const rango = RANGES.find((r) => r === s.rango);
      const robot = str(s.robot);
      return { ...(robot ? { robot } : {}), ...(rango && rango !== 'hoy' ? { rango } : {}) };
    },
  }),
  createRoute({
    getParentRoute: () => shell,
    path: '/agente',
    beforeLoad: () => {
      throw redirect({ to: '/agente/$tab', params: { tab: 'configuracion' } });
    },
  }),
  createRoute({ getParentRoute: () => shell, path: '/agente/$tab', component: AgentePage }),
  createRoute({
    getParentRoute: () => shell,
    path: '/usuarios',
    component: () => (
      <AdminOnly>
        <UsuariosPage />
      </AdminOnly>
    ),
  }),
  createRoute({
    getParentRoute: () => shell,
    path: '/auditoria',
    component: () => (
      <AdminOnly>
        <AuditoriaPage />
      </AdminOnly>
    ),
  }),
  createRoute({ getParentRoute: () => shell, path: '/cuenta/contrasena', component: ChangePasswordPage }),
];

export const router = createRouter({
  routeTree: root.addChildren([shell.addChildren(routes)]),
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
