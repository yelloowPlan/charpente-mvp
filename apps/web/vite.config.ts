import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Le moteur (@charpente/moteur) est consommé en TypeScript source via le
// workspace pnpm — Vite le transpile à la volée, aucun build préalable requis.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
