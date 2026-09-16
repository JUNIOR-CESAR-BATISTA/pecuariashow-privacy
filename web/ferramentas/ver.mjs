// Ferramenta de desenvolvimento: abre o aplicativo no Chromium e fotografa.
import { chromium } from "playwright";

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const pagina = await navegador.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

const erros = [];
pagina.on("console", (m) => {
  if (m.type() === "error") erros.push("CONSOLE: " + m.text());
});
pagina.on("pageerror", (e) => erros.push("PAGEERROR: " + e.message));
pagina.on("response", (r) => {
  if (r.status() >= 400) erros.push(`HTTP ${r.status()}: ${r.url()}`);
});

await pagina.goto(process.argv[2], { waitUntil: "networkidle" });
await pagina.waitForTimeout(1000);

console.log("--- problemas ---");
console.log(erros.length ? erros.join("\n") : "nenhum");
console.log("--- texto visível ---");
console.log((await pagina.innerText("body")).slice(0, 500));

await pagina.screenshot({ path: process.argv[3] });
await navegador.close();
