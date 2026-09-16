/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Fundo mais fechado que a superfície, para o cartão ter onde pousar.
        fundo: "#0B140F",
        superficie: "#16221A",
        superficieAlta: "#1E2C23",
        borda: "#26362C",
        // Fio de luz no alto do cartão e contorno quase invisível: é o que dá
        // relevo sem sombra pesada.
        realce: "rgba(255,255,255,0.055)",
        ouro: "#E4C053",
        // O cartão claro do cocho: é a peça que se lê no sol do curral.
        creme: "#F4F0E6",
        cremeFio: "rgba(22,35,26,0.10)",
        cremeTexto: "#16231A",
        cremeSuave: "#7A8A7C",
        // As mesmas famílias de cor dos alimentos, fechadas para o creme.
        volumosoEscuro: "#1F5B41",
        energeticoEscuro: "#C2792B",
        proteicoEscuro: "#2C5AA8",
        mineralEscuro: "#8A9A8C",
        ouroClaro: "#F0DCA0",
        ouroEscuro: "#B79A3E",
        verde: "#2E7D57",
        verdeClaro: "#5FBF8A",
        vermelho: "#E2564A",
        laranja: "#E0904A",
        azul: "#6E9BE8",
        texto: "#F4F6F2",
        textoSuave: "#93A89A",
        textoTenue: "#64796C",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
        // Só para o nome do aplicativo, títulos e números grandes. Os dados de
        // leitura continuam em sans, que é o que se lê no sol.
        display: ["Fraunces", "Georgia", "serif"],
      },
      letterSpacing: {
        rotulo: "0.14em",
      },
    },
  },
  plugins: [],
};
