import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = mode === 'qa' ? 8003 : (env.VITE_PORT ? parseInt(env.VITE_PORT) : 5173)

  return {
    base: '/client',
    plugins: [
      react(),
      mode === 'analyze' && visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    server: {
      port,
      host: '0.0.0.0',
        allowedHosts: [
      'passkey.crosscert.com',
      'localhost']
      // https 설정 제거
    },
    build: {
      sourcemap: mode === 'analyze',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'framer-motion': ['framer-motion'],
            'lucide': ['lucide-react'],
          },
        },
      },
    },
  }
})