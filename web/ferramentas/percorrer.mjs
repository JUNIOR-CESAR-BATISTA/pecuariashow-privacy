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
// O botão do Início troca para o Rebanho já com o formulário aberto.
await pagina.getByRole("button", { name: "Cadastrar lote" }).click();
await pagina.getByRole("button", { name: "Salvar" }).click();
await pagina.waitForTimeout(400);

const fotografar = async (nome) => {
  await pagina.waitForTimeout(500);
  const arquivo = `${pasta}/${nome.normalize("NFD").replace(/[^a-zA-Z]/g, "").toLowerCase()}.png`;
  await pagina.screenshot({ path: arquivo, fullPage: true });
  console.log(`${nome}: ${(await pagina.innerText("main")).split("\n")[0]}`);
};

// O nome da aba se repete nos blocos de categoria do Início, por isso a busca
// é feita dentro da barra de navegação.
const barra = pagina.locator("nav");
for (const nome of ["Início", "Ração", "Abate", "Rebanho", "Insumos", "Análise"]) {
  await barra.getByRole("button", { name: nome, exact: true }).click();
  await fotografar(nome);
}

// Dados não é aba: abre pelo botão redondo do cabeçalho, como no iPhone.
await barra.getByRole("button", { name: "Início", exact: true }).click();
await pagina.getByRole("button", { name: "Dados", exact: true }).click();
await fotografar("Dados");

console.log("--- problemas ---");
console.log(problemas.length ? problemas.join("\n") : "nenhum");

await navegador.close();
