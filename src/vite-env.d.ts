/// <reference types="vite/client" />

// 환경별 빌드 타임 상수
declare const __DEV__: boolean
declare const __QA__: boolean
declare const __PROD__: boolean

interface ImportMetaEnv {
  readonly VITE_PORT: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENV_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
