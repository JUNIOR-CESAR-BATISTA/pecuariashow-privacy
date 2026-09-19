/**
 * Previsão de resultado: o que foi pago na compra, o que a dieta custa e o
 * que sobra na venda.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { desserializar, serializar, VERSAO_ATUAL } from "../src/nucleo/dadosApp.js";
import type { SelecaoInsumos } from "../src/nucleo/formuladorRacao.js";
import { PASTEJO, SACA_25, SACA_50, SACA_60, criarInsumo } from "../src/nucleo/insumo.js";
import {
  arrobasCompra,
  criarLote,
  criarPesagem,
  custoCompraLote,
  custoCompraPorAnimal,
  type Lote,
} from "../src/nucleo/lote.js";
import {
  arrobasProduzidasLote,
  arrobasTotaisLote,
  compraTotal,
  custoTotal,
  investimentoTotal,
  lucroPorAnimal,
  lucroPorArrobaProduzida,
  lucroTotal,
  margemDaEngorda,
  margemSobreReceita,
  precoArrobaEquilibrio,
  precoArrobaEquilibrioEngorda,
  projetar,
  receitaTotal,
  retornoSobreInvestimento,
  temPrecos,
} from "../src/nucleo/planejadorAbate.js";
import { gerar } from "../src/nucleo/relatorioTexto.js";

function perto(valor: number, esperado: number, tolerancia = 0.01) {
  expect(Math.abs(valor - esperado)).toBeLessThanOrEqual(tolerancia);
}

let selecao: SelecaoInsumos;

function loteBase(extra: Partial<Lote> = {}): Lote {
  return criarLote({
    nome: "Lote teste",
    quantidadeAnimais: 40,
    pesoMedioInicial: 260,
    ganhoMetaDiario: 0.75,
    fase: "recriaInicial",
    dataEntrada: new Date(0),
    pesoAlvoAbate: 430,
    rendimentoCarcaca: 0.5,
    pesoFinalMaturidade: 430,
    diasPorPeriodo: 30,
    ...extra,
  });
}

beforeEach(() => {
  selecao = {
    volumoso: criarInsumo({
      nome: "Pasto",
      categoria: "volumoso",
      materiaSeca: 28,
      proteinaBruta: 9,
      ndt: 58,
      embalagem: PASTEJO,
    }),
    energetico: criarInsumo({
      nome: "Milho",
      categoria: "energetico",
      materiaSeca: 88,
      proteinaBruta: 9,
      ndt: 87,
      embalagem: SACA_60,
      precoUnitario: 60,
    }),
    proteico: criarInsumo({
      nome: "Farelo de soja",
      categoria: "proteico",
      materiaSeca: 89,
      proteinaBruta: 48,
      ndt: 82,
      embalagem: SACA_50,
      precoUnitario: 150,
    }),
    mineral: criarInsumo({
      nome: "Núcleo",
      categoria: "mineral",
      materiaSeca: 99,
      proteinaBruta: 0,
      ndt: 0,
      embalagem: SACA_25,
      precoUnitario: 100,
    }),
  };
});

describe("custo de compra do lote", () => {
  it("por arroba, multiplica pelo peso de entrada em carcaça", () => {
    // 260 kg x 0,5 de rendimento = 130 kg de carcaça = 8,6667 @.
    const lote = loteBase({ modoCompra: "porArroba", precoCompra: 300 });
    perto(arrobasCompra(lote), 260 * 0.5 / 15, 1e-9);
    perto(custoCompraPorAnimal(lote), 300 * (260 * 0.5 / 15));
    perto(custoCompraLote(lote), custoCompraPorAnimal(lote) * 40);
  });

  it("por cabeça, usa o valor como está", () => {
    const lote = loteBase({ modoCompra: "porCabeca", precoCompra: 2600 });
    expect(custoCompraPorAnimal(lote)).toBe(2600);
    expect(custoCompraLote(lote)).toBe(2600 * 40);
  });

  it("cobra pelo peso de entrada, não pelo de hoje", () => {
    // O animal foi pago na entrada; engordar depois não muda o que se pagou.
    const lote = loteBase({
      modoCompra: "porArroba",
      precoCompra: 300,
      pesagens: [criarPesagem({ pesoMedio: 340, data: new Date(90 * 86_400_000) })],
    });
    perto(custoCompraPorAnimal(lote), 300 * (260 * 0.5 / 15));
  });

  it("sem preço informado, a compra não entra na conta", () => {
    const lote = loteBase({ precoCompra: 0 });
    expect(custoCompraPorAnimal(lote)).toBe(0);
    expect(custoCompraLote(lote)).toBe(0);
  });
});

describe("previsão de resultado", () => {
  it("lucro é a venda menos a compra e a dieta", () => {
    const lote = loteBase({ modoCompra: "porArroba", precoCompra: 300, precoArrobaVenda: 340 });
    const r = projetar(lote, selecao);

    expect(temPrecos(r)).toBe(true);
    perto(investimentoTotal(r), compraTotal(r) + custoTotal(r));
    perto(lucroTotal(r), receitaTotal(r) - compraTotal(r) - custoTotal(r));
    perto(lucroPorAnimal(r), lucroTotal(r) / 40);
  });

  it("a receita é o peso de carcaça no abate ao preço de venda", () => {
    const lote = loteBase({ precoArrobaVenda: 340 });
    const r = projetar(lote, selecao);
    // 430 kg x 0,5 / 15 = 14,3333 @ por animal.
    perto(receitaTotal(r), (430 * 0.5) / 15 * 340 * 40, 0.1);
  });

  it("no preço de equilíbrio o lucro é zero", () => {
    const base = loteBase({ modoCompra: "porArroba", precoCompra: 300, precoArrobaVenda: 340 });
    const equilibrio = precoArrobaEquilibrio(projetar(base, selecao));

    const r = projetar({ ...base, precoArrobaVenda: equilibrio }, selecao);
    perto(lucroTotal(r), 0);
    perto(margemSobreReceita(r), 0);
    perto(retornoSobreInvestimento(r), 0);
  });

  it("vender acima do equilíbrio dá lucro, abaixo dá prejuízo", () => {
    const base = loteBase({ modoCompra: "porArroba", precoCompra: 300 });
    const equilibrio = precoArrobaEquilibrio(projetar({ ...base, precoArrobaVenda: 1 }, selecao));

    expect(lucroTotal(projetar({ ...base, precoArrobaVenda: equilibrio + 20 }, selecao))).toBeGreaterThan(0);
    expect(lucroTotal(projetar({ ...base, precoArrobaVenda: equilibrio - 20 }, selecao))).toBeLessThan(0);
  });

  it("o resultado da engorda olha só as arrobas produzidas contra a dieta", () => {
    const lote = loteBase({ modoCompra: "porArroba", precoCompra: 300, precoArrobaVenda: 340 });
    const r = projetar(lote, selecao);

    perto(margemDaEngorda(r), arrobasProduzidasLote(r) * 340 - custoTotal(r));
    perto(precoArrobaEquilibrioEngorda(r), custoTotal(r) / arrobasProduzidasLote(r));
    // A compra não entra aqui: mudar o preço pago não mexe neste número.
    const caro = projetar({ ...lote, precoCompra: 900 }, selecao);
    perto(margemDaEngorda(caro), margemDaEngorda(r));
  });

  it("uma compra cara pode dar prejuízo no todo com engorda lucrativa", () => {
    const lote = loteBase({ modoCompra: "porArroba", precoCompra: 900, precoArrobaVenda: 340 });
    const r = projetar(lote, selecao);
    expect(margemDaEngorda(r)).toBeGreaterThan(0);
    expect(lucroTotal(r)).toBeLessThan(0);
  });

  it("sem preço de compra, o resultado conta apenas a dieta", () => {
    const lote = loteBase({ precoCompra: 0, precoArrobaVenda: 340 });
    const r = projetar(lote, selecao);
    expect(compraTotal(r)).toBe(0);
    perto(lucroTotal(r), receitaTotal(r) - custoTotal(r));
  });

  it("sem preço de venda não há previsão, e nada vira NaN", () => {
    const r = projetar(loteBase({ precoCompra: 300 }), selecao);
    expect(temPrecos(r)).toBe(false);
    for (const valor of [
      receitaTotal(r),
      margemSobreReceita(r),
      retornoSobreInvestimento(r),
      lucroPorArrobaProduzida(r),
      precoArrobaEquilibrio(r),
    ]) {
      expect(Number.isFinite(valor)).toBe(true);
    }
    // Sem receita, o prejuízo é exatamente o que foi investido.
    perto(lucroTotal(r), -investimentoTotal(r));
  });

  it("o equilíbrio cobre o investimento em todas as arrobas vendidas", () => {
    const r = projetar(
      loteBase({ modoCompra: "porCabeca", precoCompra: 2600, precoArrobaVenda: 340 }),
      selecao,
    );
    perto(precoArrobaEquilibrio(r) * arrobasTotaisLote(r), investimentoTotal(r));
  });
});

describe("relatório em texto", () => {
  it("traz o bloco de resultado quando há preço de venda", () => {
    const texto = gerar(
      projetar(loteBase({ precoCompra: 300, precoArrobaVenda: 340 }), selecao),
    );
    expect(texto).toContain("RESULTADO PREVISTO");
    expect(texto).toContain("Lucro do lote");
    expect(texto).toContain("Arroba de equilíbrio");
  });

  it("omite o bloco quando não há preço de venda", () => {
    const texto = gerar(projetar(loteBase({ precoCompra: 300 }), selecao));
    expect(texto).not.toContain("RESULTADO PREVISTO");
  });

  it("avisa quando só a dieta entra na conta", () => {
    const texto = gerar(projetar(loteBase({ precoArrobaVenda: 340 }), selecao));
    expect(texto).toContain("apenas a dieta");
  });
});

describe("compatibilidade do arquivo", () => {
  it("um backup antigo, sem os campos de preço, abre com zero", () => {
    // Exatamente o que o aplicativo gravava antes desta funcionalidade.
    const antigo = JSON.stringify({
      versao: 1,
      lotes: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          nome: "Lote antigo",
          quantidadeAnimais: 10,
          pesoMedioInicial: 250,
          ganhoMetaDiario: 0.7,
          fase: "recriaInicial",
          grupoGenetico: "zebuino",
          sistema: "semiconfinamento",
          dataEntrada: "2025-01-01T00:00:00Z",
          pesoAlvoAbate: 420,
          rendimentoCarcaca: 0.53,
          pesoFinalMaturidade: 430,
          diasPorPeriodo: 30,
          ajusteConsumo: 1,
          restricoes: {},
          pesagens: [],
          observacoes: "",
        },
      ],
      insumos: [],
      ciclos: [],
      usarCalibracao: true,
    });

    const lote = desserializar(antigo).lotes[0]!;
    expect(lote.modoCompra).toBe("porArroba");
    expect(lote.precoCompra).toBe(0);
    expect(lote.precoArrobaVenda).toBe(0);
    expect(Number.isFinite(custoCompraPorAnimal(lote))).toBe(true);
    expect(custoCompraPorAnimal(lote)).toBe(0);
  });

  it("os campos novos sobrevivem a exportar e restaurar", () => {
    const lote = loteBase({ modoCompra: "porCabeca", precoCompra: 2600, precoArrobaVenda: 345.5 });
    const voltou = desserializar(
      serializar({
        versao: VERSAO_ATUAL,
        lotes: [lote],
        insumos: [],
        ciclos: [],
        usarCalibracao: true,
        precoArrobaHoje: null,
      }),
    ).lotes[0]!;

    expect(voltou.modoCompra).toBe("porCabeca");
    expect(voltou.precoCompra).toBe(2600);
    expect(voltou.precoArrobaVenda).toBe(345.5);
  });
});
