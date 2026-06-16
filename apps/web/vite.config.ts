/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Le moteur (@charpente/moteur) est consommé en TypeScript source via le
// workspace pnpm — Vite le transpile à la volée, aucun build préalable requis.
// `base: "./"` → chemins d'assets relatifs : déployable sur n'importe quel hôte
// statique (racine ou sous-chemin) sans reconfiguration.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  // La 3D (three.js) est isolée dans un chunk chargé à la demande : pas d'alerte.
  build: { chunkSizeWarningLimit: 1200 },
  test: { environment: "node" },
});
