// Ferramenta de desenvolvimento: confere que o aplicativo abre sem internet.
//
// Carrega a página, cadastra um lote, desliga a rede do navegador e recarrega.
// Se o service worker estiver fazendo o trabalho dele, a tela volta com os
// dados no lugar. É o teste que separa "tem service worker" de "funciona".
import { chromium } from "playwright";

const base = process.argv[2];

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 } });
const pagina = await contexto.newPage();

await pagina.goto(base, { waitUntil: "networkidle" });
await pagina.getByRole("button", { name: "Cadastrar lote" }).click();
await pagina.getByRole("button", { name: "Cadastrar o primeiro" }).click();
await pagina.getByRole("button", { name: "Salvar" }).click();
await pagina.waitForTimeout(800);

// Espera o service worker assumir o controle da página.
await pagina.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, {
  timeout: 15_000,
});
console.log("service worker no controle: sim");

await contexto.setOffline(true);
console.log("rede desligada");

await pagina.reload({ waitUntil: "domcontentloaded" });
await pagina.waitForTimeout(1500);

const texto = await pagina.innerText("body");
const abriu = texto.includes("EXIGÊNCIA DE HOJE");
const manteveDados = texto.includes("Lote 1");

console.log("abriu sem internet:", abriu ? "sim" : "NÃO");
console.log("dados preservados:", manteveDados ? "sim" : "NÃO");

if (process.argv[3]) await pagina.screenshot({ path: process.argv[3] });
await navegador.close();

if (!abriu || !manteveDados) process.exit(1);
