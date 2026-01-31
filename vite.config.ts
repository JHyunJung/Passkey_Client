import { defineConfig, loadEnv, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 환경 변수 로드
  const env = loadEnv(mode, process.cwd(), '')

  // 환경별 설정
  const isDev = mode === 'development'
  const isQA = mode === 'qa'
  const isProd = mode === 'production'
  const isAnalyze = mode === 'analyze'

  // 포트 설정 (환경 변수 또는 기본값)
  const port = env.VITE_PORT ? parseInt(env.VITE_PORT) : 5173

  const config: UserConfig = {
    plugins: [
      react(),
      // Bundle analyzer (analyze 모드에서만)
      isAnalyze && visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),

    // 개발 서버 설정
    server: {
      port,
      host: '0.0.0.0',
      allowedHosts: ['.trycloudflare.com'],
      // 환경별 추가 설정
      strictPort: false,
      open: isDev,
    },

    // 빌드 설정
    build: {
      // 환경별 소스맵 설정
      sourcemap: isDev || isQA || isAnalyze,

      // 환경별 최적화 레벨
      minify: isProd ? 'esbuild' : false,

      // 청크 크기 최적화
      rollupOptions: {
        output: {
          // 벤더 청크 분리
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'framer-motion': ['framer-motion'],
            'lucide': ['lucide-react'],
          },
          // 환경별 청크 파일명
          chunkFileNames: isProd
            ? 'assets/[name]-[hash].js'
            : 'assets/[name].js',
          entryFileNames: isProd
            ? 'assets/[name]-[hash].js'
            : 'assets/[name].js',
          assetFileNames: isProd
            ? 'assets/[name]-[hash].[ext]'
            : 'assets/[name].[ext]',
        },
      },

      // 청크 크기 경고 설정
      chunkSizeWarningLimit: 1000,
    },

    // 환경별 define 설정 (빌드 타임 상수)
    define: {
      __DEV__: isDev,
      __QA__: isQA,
      __PROD__: isProd,
    },

    // 미리보기 서버 설정
    preview: {
      port,
      host: '0.0.0.0',
      strictPort: false,
    },
  }

  return config
})
