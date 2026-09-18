/**
 * O resumo de vários lotes ao mesmo tempo: a fazenda inteira, não um lote
 * só. É o que aparece quando há mais de um ciclo em andamento.
 */
import { beforeEach, describe, expect, it } from "vitest";

import type { SelecaoInsumos } from "../src/nucleo/formuladorRacao.js";
import { PASTEJO, SACA_25, SACA_50, SACA_60, criarInsumo } from "../src/nucleo/insumo.js";
import { criarLote, type Lote } from "../src/nucleo/lote.js";
import {
  arrobasProduzidasLote,
  custoTotal,
  investimentoTotal,
  lucroTotal,
  projetar,
  receitaTotal,
  resumirLotes,
  retornoGeral,
  type RelatorioPlanejamento,
} from "../src/nucleo/planejadorAbate.js";

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
    planoEtapas: "soCrescimento",
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

describe("resumirLotes", () => {
  it("lista vazia dá tudo zero, sem dividir por zero em nada", () => {
    const r = resumirLotes([]);
    expect(r).toEqual({
      lotes: 0,
      lotesViaveis: 0,
      lotesComPreco: 0,
      animais: 0,
      arrobasProduzidas: 0,
      custoDieta: 0,
      investimento: 0,
      receita: 0,
      lucro: 0,
    });
    expect(retornoGeral(r)).toBe(0);
  });

  it("soma dois lotes com preço exatamente como a soma manual", () => {
    const a = projetar(
      loteBase({ quantidadeAnimais: 40, modoCompra: "porCabeca", precoCompra: 1500, precoArrobaVenda: 300 }),
      selecao,
    );
    const b = projetar(
      loteBase({ quantidadeAnimais: 60, modoCompra: "porCabeca", precoCompra: 1600, precoArrobaVenda: 300 }),
      selecao,
    );
    const r = resumirLotes([a, b]);

    expect(r.lotes).toBe(2);
    expect(r.lotesViaveis).toBe(2);
    expect(r.lotesComPreco).toBe(2);
    expect(r.animais).toBe(a.animais + b.animais);
    perto(r.arrobasProduzidas, arrobasProduzidasLote(a) + arrobasProduzidasLote(b), 1e-6);
    perto(r.custoDieta, custoTotal(a) + custoTotal(b), 1e-6);
    perto(r.investimento, investimentoTotal(a) + investimentoTotal(b), 1e-6);
    perto(r.receita, receitaTotal(a) + receitaTotal(b), 1e-6);
    perto(r.lucro, lucroTotal(a) + lucroTotal(b), 1e-6);
    perto(retornoGeral(r), (r.lucro / r.investimento) * 100, 1e-9);
  });

  it("lote sem preço de venda entra na produção mas fica fora do dinheiro", () => {
    const comPreco = projetar(
      loteBase({ modoCompra: "porCabeca", precoCompra: 1500, precoArrobaVenda: 300 }),
      selecao,
    );
    const semPreco = projetar(loteBase({ precoArrobaVenda: 0 }), selecao);
    const r = resumirLotes([comPreco, semPreco]);

    expect(r.lotes).toBe(2);
    expect(r.lotesViaveis).toBe(2);
    // Só um dos dois tem preço de venda informado.
    expect(r.lotesComPreco).toBe(1);
    // Produção conta os dois: o lote sem preço também come e ganha peso.
    expect(r.animais).toBe(comPreco.animais + semPreco.animais);
    perto(r.custoDieta, custoTotal(comPreco) + custoTotal(semPreco), 1e-6);
    perto(r.arrobasProduzidas, arrobasProduzidasLote(comPreco) + arrobasProduzidasLote(semPreco), 1e-6);
    // Dinheiro só do lote com preço.
    perto(r.investimento, investimentoTotal(comPreco), 1e-6);
    perto(r.receita, receitaTotal(comPreco), 1e-6);
    perto(r.lucro, lucroTotal(comPreco), 1e-6);
  });

  it("lote inviável não entra em soma nenhuma, mas ainda é contado em 'lotes'", () => {
    // Já no peso de abate: projetar devolve relatório vazio.
    const inviavel: RelatorioPlanejamento = projetar(
      loteBase({ pesoMedioInicial: 430, pesoAlvoAbate: 430 }),
      selecao,
    );
    const viavel = projetar(
      loteBase({ modoCompra: "porCabeca", precoCompra: 1500, precoArrobaVenda: 300 }),
      selecao,
    );
    const r = resumirLotes([inviavel, viavel]);

    expect(r.lotes).toBe(2);
    expect(r.lotesViaveis).toBe(1);
    expect(r.animais).toBe(viavel.animais);
    perto(r.custoDieta, custoTotal(viavel), 1e-6);
    perto(r.lucro, lucroTotal(viavel), 1e-6);
  });
});
