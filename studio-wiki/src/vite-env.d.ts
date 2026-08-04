/// <reference types="vite/client" />

declare module 'virtual:studio-content' {
  export const productionMarkdown: string;
  export const buildStamp: {
    commit: string | null;
    commitDate: string | null;
    subject: string | null;
    builtAt: string;
    dev: boolean;
  };
}
