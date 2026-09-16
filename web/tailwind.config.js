/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Os mesmos valores do Tema.swift, para as duas versões do aplicativo
      // ficarem com a mesma cara.
      colors: {
        fundo: "#0F1A13",
        superficie: "#18271C",
        superficieAlta: "#1F3025",
        borda: "#2C3E31",
        ouro: "#E4C053",
        ouroEscuro: "#B79A3E",
        verde: "#2E7D57",
        verdeClaro: "#5FBF8A",
        vermelho: "#E2564A",
        laranja: "#E0904A",
        azul: "#6E9BE8",
        texto: "#F2F5F1",
        textoSuave: "#8DA394",
        textoTenue: "#62786B",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
