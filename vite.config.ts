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
      // /admin va a la API del robot (apps/api de RobotRPA). Mismo origen para la cookie de sesión.
      proxy: { '/admin': env.ADMIN_API_URL || 'http://localhost:3000' },
    },
    test: { environment: 'node' },
  };
});
