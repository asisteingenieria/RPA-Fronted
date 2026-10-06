import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5180,
      // Con VITE_ADMIN_API_URL, /admin va a la API real del robot (apps/api de RobotRPA).
      proxy: env.VITE_ADMIN_API_URL ? { '/admin': env.VITE_ADMIN_API_URL } : undefined,
    },
    test: { environment: 'node' },
  };
});
