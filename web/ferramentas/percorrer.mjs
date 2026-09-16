// Ferramenta de desenvolvimento: cadastra um lote pela interface e fotografa
// as telas com dados. É o que prova que a cadeia inteira funciona no navegador.
import { chromium } from "playwright";

const base = process.argv[2];
const pasta = process.argv[3];

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const pagina = await navegador.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});

const problemas = [];
pagina.on("pageerror", (e) => problemas.push("PAGEERROR: " + e.message));
pagina.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("favicon")) {
    problemas.push("CONSOLE: " + m.text());
  }
});

await pagina.goto(base, { waitUntil: "networkidle" });

// Cadastra o primeiro lote com o que o formulário já traz preenchido.
// O botão do Início leva para o Rebanho; é lá que o formulário abre.
await pagina.getByRole("button", { name: "Cadastrar lote" }).click();
await pagina.getByRole("button", { name: "Cadastrar o primeiro" }).click();
await pagina.getByRole("button", { name: "Salvar" }).click();
await pagina.waitForTimeout(400);

const telas = ["Início", "Ração", "Abate", "Rebanho", "Insumos", "Dados"];
for (const nome of telas) {
  await pagina.getByRole("button", { name: nome, exact: true }).click();
  await pagina.waitForTimeout(500);
  const arquivo = `${pasta}/${nome.normalize("NFD").replace(/[^a-zA-Z]/g, "").toLowerCase()}.png`;
  await pagina.screenshot({ path: arquivo, fullPage: true });
  console.log(`${nome}: ${(await pagina.innerText("main")).split("\n")[0]}`);
}

console.log("--- problemas ---");
console.log(problemas.length ? problemas.join("\n") : "nenhum");

await navegador.close();
