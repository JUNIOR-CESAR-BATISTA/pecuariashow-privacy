import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * O caminho base é o do GitHub Pages deste repositório, e vale sempre.
 *
 * Aplicá-lo só na compilação não funciona: o `vite preview` roda como
 * "serve", então servia na raiz enquanto o HTML compilado apontava para a
 * subpasta - e o servidor devolvia o index.html no lugar do JavaScript.
 */
export default defineConfig({
  plugins: [react()],
  base: "/pecuariashow-privacy/",
  build: { outDir: "dist" },
});
