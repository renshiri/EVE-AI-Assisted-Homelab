import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/vscode': {
        target: 'http://127.0.0.1:8888',
        ws: true, // Schaltet WebSocket-Proxying ein
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/vscode/, ''),
        // Verhindert das vorzeitige Schließen der WebSocket-Pipes
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Proxy Error:', err);
          });
          proxy.on('proxyReqWs', (proxyReq, _req, _socket, _options, _head) => {
            proxyReq.setHeader('Origin', 'http://127.0.0.1:8888');
          });
        },
      },
    },
  }
})