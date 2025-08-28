// client/vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default ({ mode }) => {
  // Carga variables VITE_* del .env del modo actual
  const env = loadEnv(mode, process.cwd(), '')
  const tunnelHost = (env.VITE_TUNNEL_HOST || '').trim() // ej: foo.trycloudflare.com

  return defineConfig({
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      allowedHosts: true,
      proxy: {
        '/api': { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      },
      // ✅ HMR solo se fuerza a WSS/443 cuando hay túnel
      hmr: tunnelHost
        ? { host: tunnelHost, protocol: 'wss', clientPort: 443 }
        : true, // en local: HMR por defecto (ws, sin https)
    },
  })
}
