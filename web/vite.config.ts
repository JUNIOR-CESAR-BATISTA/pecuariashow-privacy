import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * O caminho base é o do GitHub Pages deste repositório, e vale sempre.
 *
 * Aplicá-lo só na compilação não funciona: o `vite preview` roda como
 * "serve", então servia na raiz enquanto o HTML compilado apontava para a
 * subpasta - e o servidor devolvia o index.html no lugar do JavaScript.
 */
export default defineConfig({
  base: "/pecuariashow-privacy/",
  build: { outDir: "dist" },
  plugins: [
    react(),
    VitePWA({
      // O manifesto já existe em public/ e é a fonte da verdade; aqui só
      // geramos o service worker que guarda os arquivos para uso sem internet.
      manifest: false,
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,webmanifest,woff2}"],
        // Qualquer endereço desconhecido dentro do aplicativo cai no index:
        // é uma tela só, e sem isto recarregar a página daria 404.
        navigateFallback: "/pecuariashow-privacy/index.html",
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
});
