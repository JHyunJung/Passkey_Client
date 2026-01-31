import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 환경 변수 로드
  const env = loadEnv(mode, process.cwd(), '')

  // 포트 설정 (환경 변수 또는 기본값 5173)
  const port = env.VITE_PORT ? parseInt(env.VITE_PORT) : 5173

  return {
    plugins: [
      react(),
      // Bundle analyzer in analyze mode
      mode === 'analyze' && visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    server: {
      port,
      host: '0.0.0.0',  // 외부 접속 허용
      allowedHosts: ['.trycloudflare.com'],
    },
    build: {
      // Generate source maps for production debugging
      sourcemap: mode === 'analyze',
      // Optimize chunk size
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
