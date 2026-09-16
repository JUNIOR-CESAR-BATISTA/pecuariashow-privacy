/** O ciclo de vida dos dados: carregar, alterar, gravar, restaurar, apagar. */
import { describe, expect, it, vi } from "vitest";

import { DepositoMemoria, type Deposito } from "../src/armazenamento/deposito.js";
import { Repositorio } from "../src/armazenamento/repositorio.js";
import { CATALOGO_PADRAO } from "../src/nucleo/catalogoInsumos.js";
import { criarLote } from "../src/nucleo/lote.js";

function comLote(nome: string) {
  return (dados: Parameters<Parameters<Repositorio["alterar"]>[0]>[0]) => ({
    ...dados,
    lotes: [...dados.lotes, criarLote({ nome })],
  });
}

describe("primeira abertura", () => {
  it("sem arquivo, começa com o catálogo padrão e nenhum lote", async () => {
    const repo = new Repositorio(new DepositoMemoria());
    const dados = await repo.carregar();

    expect(dados.lotes).toHaveLength(0);
    expect(dados.insumos).toHaveLength(CATALOGO_PADRAO.length);
    expect(repo.erro).toBeNull();
  });
});

describe("gravar e recuperar", () => {
  it("o que foi salvo volta na próxima abertura", async () => {
    const deposito = new DepositoMemoria();

    const primeiro = new Repositorio(deposito);
    await primeiro.carregar();
    primeiro.alterar(comLote("Lote 1"));
    await primeiro.salvarAgora();

    const segundo = new Repositorio(deposito);
    const dados = await segundo.carregar();

    expect(dados.lotes).toHaveLength(1);
    expect(dados.lotes[0]?.nome).toBe("Lote 1");
  });

  it("alterações seguidas viram uma gravação só", async () => {
    vi.useFakeTimers();
    const deposito = new DepositoMemoria();
    const gravar = vi.spyOn(deposito, "gravar");

    const repo = new Repositorio(deposito);
    await repo.carregar();
    repo.alterar(comLote("A"));
    repo.alterar(comLote("B"));
    repo.alterar(comLote("C"));

    expect(gravar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(gravar).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
    expect(repo.atual().lotes).toHaveLength(3);
  });

  it("avisa quem estiver ouvindo", async () => {
    const repo = new Repositorio(new DepositoMemoria());
    const ouvinte = vi.fn();
    await repo.carregar();

    const parar = repo.aoMudar(ouvinte);
    repo.alterar(comLote("Novo"));
    expect(ouvinte).toHaveBeenCalledTimes(1);

    parar();
    repo.alterar(comLote("Outro"));
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });
});

describe("backup", () => {
  it("exporta e restaura", async () => {
    const origem = new Repositorio(new DepositoMemoria());
    await origem.carregar();
    origem.alterar(comLote("Lote exportado"));
    const backup = origem.exportar();

    const destino = new Repositorio(new DepositoMemoria());
    await destino.carregar();
    const dados = await destino.restaurar(backup);

    expect(dados.lotes[0]?.nome).toBe("Lote exportado");
    expect(destino.atual().lotes).toHaveLength(1);
  });

  it("arquivo inválido não encosta nos dados que já existem", async () => {
    const repo = new Repositorio(new DepositoMemoria());
    await repo.carregar();
    repo.alterar(comLote("Meu rebanho"));
    await repo.salvarAgora();

    await expect(repo.restaurar('{"qualquer":"coisa"}')).rejects.toThrow();

    // O ponto do teste: o rebanho continua lá depois da tentativa recusada.
    expect(repo.atual().lotes).toHaveLength(1);
    expect(repo.atual().lotes[0]?.nome).toBe("Meu rebanho");
  });
});

describe("quando o depósito falha", () => {
  it("arquivo ilegível não apaga nada: começa limpo e avisa", async () => {
    const quebrado: Deposito = {
      ler: async () => "isto não é json",
      gravar: async () => {},
      apagar: async () => {},
      tamanho: async () => 0,
    };

    const repo = new Repositorio(quebrado);
    const dados = await repo.carregar();

    expect(dados.lotes).toHaveLength(0);
    expect(repo.erro).not.toBeNull();
  });

  it("falha ao gravar é registrada em vez de derrubar o aplicativo", async () => {
    const semEspaco: Deposito = {
      ler: async () => null,
      gravar: async () => {
        throw new Error("sem espaço no aparelho");
      },
      apagar: async () => {},
      tamanho: async () => 0,
    };

    const repo = new Repositorio(semEspaco);
    await repo.carregar();
    repo.alterar(comLote("Lote"));
    await repo.salvarAgora();

    expect(repo.erro).toContain("sem espaço");
    // O dado continua em memória: o usuário não perde o que digitou.
    expect(repo.atual().lotes).toHaveLength(1);
  });
});

describe("apagar tudo", () => {
  it("volta ao estado inicial e limpa o depósito", async () => {
    const deposito = new DepositoMemoria();
    const repo = new Repositorio(deposito);
    await repo.carregar();
    repo.alterar(comLote("Some"));
    await repo.salvarAgora();

    await repo.apagarTudo();

    expect(repo.atual().lotes).toHaveLength(0);
    expect(repo.atual().insumos).toHaveLength(CATALOGO_PADRAO.length);

    const outro = new Repositorio(deposito);
    expect((await outro.carregar()).lotes).toHaveLength(0);
  });
});
