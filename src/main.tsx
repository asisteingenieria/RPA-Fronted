import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { toast } from 'sonner';
// Fuentes empaquetadas localmente (sin CDN: la CSP del panel no carga recursos externos).
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import { ApiError } from '@/lib/api';
import { ThemeProvider } from '@/lib/theme';
import { ME_KEY } from '@/auth/session';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { router } from './router';
import './styles/globals.css';

/** Un 401 en cualquier consulta o acción = sesión vencida (8 h o 30 min sin actividad): volver al ingreso. */
function onError(err: unknown) {
  if (!(err instanceof ApiError) || err.status !== 401) return;
  if (queryClient.getQueryData(ME_KEY) === null) return;
  queryClient.clear();
  queryClient.setQueryData(ME_KEY, null);
  toast.info('Tu sesión venció. Vuelve a ingresar.');
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      retry: (n, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && n < 2,
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={250}>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
