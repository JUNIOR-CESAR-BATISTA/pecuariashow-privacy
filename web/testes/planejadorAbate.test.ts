/** Porte de `NovilhaNutriTests/PlanejadorAbateTests.swift`, do antigo aplicativo de iPhone. */
import { beforeEach, describe, expect, it } from "vitest";

import type { SelecaoInsumos } from "../src/nucleo/formuladorRacao.js";
import {
  PASTEJO,
  SACA_25,
  SACA_50,
  SACA_60,
  criarInsumo,
  type Insumo,
} from "../src/nucleo/insumo.js";
import { criarLote, criarPesagem, ganhoRealDiario, type Lote } from "../src/nucleo/lote.js";
import {
  arrobasFinais,
  arrobasIniciais,
  arrobasProduzidasLote,
  arrobasProduzidasPorAnimal,
  consumoConversao,
  conversaoAlimentar,
  custoPeriodo,
  custoPorArroba,
  custoTotal,
  ganhoTotalLote,
  materiaSecaTotal,
  projetar,
  viavel,
} from "../src/nucleo/planejadorAbate.js";
import { gerar } from "../src/nucleo/relatorioTexto.js";

function perto(valor: number, esperado: number, tolerancia: number) {
  expect(Math.abs(valor - esperado)).toBeLessThanOrEqual(tolerancia);
}

let selecao: SelecaoInsumos;
let pasto: Insumo;

function loteBase(): Lote {
  return criarLote({
    nome: "Lote teste",
    quantidadeAnimais: 40,
    pesoMedioInicial: 260,
    ganhoMetaDiario: 0.75,
    fase: "recriaInicial",
    dataEntrada: new Date(0),
    pesoAlvoAbate: 430,
    rendimentoCarcaca: 0.53,
    pesoFinalMaturidade: 430,
    diasPorPeriodo: 30,
    // Estes testes medem a mecânica da projeção com uma dieta só; o ciclo de
    // duas etapas tem suíte própria.
    planoEtapas: "soCrescimento",
  });
}

beforeEach(() => {
  pasto = criarInsumo({
    nome: "Pasto",
    categoria: "volumoso",
    materiaSeca: 28,
    proteinaBruta: 9.0,
    ndt: 58,
    embalagem: PASTEJO,
  });
  selecao = {
    volumoso: pasto,
    energetico: criarInsumo({
      nome: "Milho",
      categoria: "energetico",
      materiaSeca: 88,
      proteinaBruta: 9.0,
      ndt: 87,
      embalagem: SACA_60,
      precoUnitario: 60,
    }),
    proteico: criarInsumo({
      nome: "Farelo de soja",
      categoria: "proteico",
      materiaSeca: 89,
      proteinaBruta: 48.0,
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

describe("duração do ciclo", () => {
  it("duração e data de abate", () => {
    const r = projetar(loteBase(), selecao);

    expect(viavel(r)).toBe(true);
    // (430 - 260) / 0,750 = 226,67 dias
    perto(r.diasTotais, 226.667, 0.01);
    expect(r.periodos).toHaveLength(8);
    perto((r.dataAbate.getTime() - r.dataInicio.getTime()) / 86_400_000, 226.667, 0.01);
  });

  it("último período é parcial e chega ao peso alvo", () => {
    const r = projetar(loteBase(), selecao);
    const ultimo = r.periodos[r.periodos.length - 1];

    expect(ultimo).toBeDefined();
    perto(ultimo!.dias, 16.667, 0.01);
    perto(ultimo!.pesoFinal, 430, 0.01);
    perto(r.periodos[0]?.pesoInicial ?? 0, 260, 0.001);
  });

  it("período maior gera menos períodos", () => {
    const r = projetar({ ...loteBase(), diasPorPeriodo: 60 }, selecao);

    expect(r.periodos).toHaveLength(4);
    perto(r.diasTotais, 226.667, 0.01);
  });

  it("consumo cresce ao longo do ciclo", () => {
    const r = projetar(loteBase(), selecao);
    const consumos = r.periodos.map((p) => p.exigencia.consumoMateriaSeca);

    expect(consumos).toEqual([...consumos].sort((a, b) => a - b));
    expect(consumos[consumos.length - 1]!).toBeGreaterThan(consumos[0]!);
  });
});

describe("totais do ciclo", () => {
  it("totais são a soma dos períodos", () => {
    const r = projetar(loteBase(), selecao);

    for (const total of r.totais) {
      const soma = r.periodos
        .flatMap((p) => p.consumos)
        .filter((c) => c.insumo.id === total.insumo.id)
        .reduce((t, c) => t + c.kgMateriaNatural, 0);
      perto(total.kgMateriaNatural, soma, 0.001);
    }
    perto(
      custoTotal(r),
      r.periodos.reduce((t, p) => t + custoPeriodo(p), 0),
      0.01,
    );
  });

  it("consumo de mineral bate com o planejado", () => {
    const lote = loteBase();
    const r = projetar(lote, selecao);
    const mineralTotal = r.totais.find((c) => c.insumo.categoria === "mineral");

    expect(mineralTotal).toBeDefined();
    // 100 g por animal por dia durante todo o ciclo.
    perto(mineralTotal!.kgMateriaNatural, 0.1 * r.diasTotais * lote.quantidadeAnimais, 0.5);
  });

  it("sacas do ciclo são calculadas", () => {
    const r = projetar(loteBase(), selecao);
    const milhoTotal = r.totais.find((c) => c.insumo.nome === "Milho");
    expect(milhoTotal).toBeDefined();

    const conversao = consumoConversao(milhoTotal!);
    expect(conversao).not.toBeNull();
    perto(conversao!.kgPorUnidade, 60, 0.0001);
    perto(conversao!.unidadesInteiras, Math.floor(milhoTotal!.kgMateriaNatural / 60), 0.0001);
    expect(conversao!.unidadesParaCompra).toBeGreaterThanOrEqual(conversao!.unidadesInteiras);
  });
});

describe("produção e custo", () => {
  it("produção em arrobas", () => {
    const r = projetar(loteBase(), selecao);

    // 430 kg x 53% / 15 = 15,19 arrobas por animal
    perto(arrobasFinais(r), 15.193, 0.01);
    perto(arrobasIniciais(r), 9.187, 0.01);
    perto(arrobasProduzidasPorAnimal(r), 6.007, 0.01);
    perto(arrobasProduzidasLote(r), 6.007 * 40, 0.5);
    perto(ganhoTotalLote(r), 170 * 40, 0.001);
  });

  it("conversão alimentar é coerente", () => {
    const r = projetar(loteBase(), selecao);

    perto(conversaoAlimentar(r), materiaSecaTotal(r) / ganhoTotalLote(r), 0.0001);
    // Entre 8 e 14 kg de MS por kg de ganho é a faixa esperada em recria.
    expect(conversaoAlimentar(r)).toBeGreaterThanOrEqual(8);
    expect(conversaoAlimentar(r)).toBeLessThanOrEqual(14);
  });

  it("custo por arroba usa somente insumos com preço", () => {
    const r = projetar(loteBase(), selecao);

    expect(custoTotal(r)).toBeGreaterThan(0);
    perto(custoPorArroba(r), custoTotal(r) / arrobasProduzidasLote(r), 0.001);
    const pastoTotal = r.totais.find((c) => c.insumo.categoria === "volumoso");
    perto(pastoTotal?.custo ?? -1, 0, 0.0001);
  });
});

describe("quando não há o que projetar", () => {
  it("lote já no peso de abate não projeta", () => {
    const r = projetar({ ...loteBase(), pesoMedioInicial: 440 }, selecao);

    expect(viavel(r)).toBe(false);
    expect(r.alertas.length).toBeGreaterThan(0);
  });

  it("meta de ganho zerada não projeta", () => {
    expect(viavel(projetar({ ...loteBase(), ganhoMetaDiario: 0 }, selecao))).toBe(false);
  });
});

describe("pesagens", () => {
  it("a mais recente vira o ponto de partida", () => {
    const data = new Date(60 * 86_400_000);
    const lote = { ...loteBase(), pesagens: [criarPesagem({ data, pesoMedio: 305 })] };
    const r = projetar(lote, selecao);

    perto(r.pesoInicial, 305, 0.001);
    expect(r.dataInicio.getTime()).toBe(data.getTime());
    perto(r.diasTotais, (430 - 305) / 0.75, 0.01);
  });

  it("ganho real observado", () => {
    const lote = {
      ...loteBase(),
      pesagens: [criarPesagem({ data: new Date(100 * 86_400_000), pesoMedio: 330 })],
    };

    // 70 kg em 100 dias = 0,700 kg/dia
    perto(ganhoRealDiario(lote) ?? 0, 0.7, 0.0001);
  });
});

describe("relatório em texto", () => {
  it("traz os blocos principais", () => {
    const texto = gerar(projetar(loteBase(), selecao));

    expect(texto).toContain("PLANEJAMENTO NUTRICIONAL E DE ABATE");
    expect(texto).toContain("INSUMOS DO CICLO COMPLETO");
    expect(texto).toContain("PERÍODOS");
    expect(texto).toContain("Milho");
    expect(texto).toContain("sacas");
  });
});
