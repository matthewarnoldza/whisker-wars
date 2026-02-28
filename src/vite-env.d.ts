/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_JUNGLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
