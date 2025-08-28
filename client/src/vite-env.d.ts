/// <reference types="vite/client" />

// (opcional) tipa tus variables personalizadas:
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  // añade aquí otras VITE_*
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
