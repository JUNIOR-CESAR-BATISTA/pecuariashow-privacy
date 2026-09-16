/** Porte de `NovilhaNutriTests/ConversorSacasTests.swift`, do antigo aplicativo de iPhone. */
import { describe, expect, it } from "vitest";

import {
  converter,
  converterPelaEmbalagem,
  descricao,
  descricaoCompra,
  equivalencias,
} from "../src/nucleo/conversorSacas.js";
import {
  GRANEL,
  PASTEJO,
  SACA_60,
  TAMANHOS_PADRAO,
  criarInsumo,
  materiaNatural,
  materiaSecaDe,
  precoPorKg,
  precoPorKgMateriaSeca,
} from "../src/nucleo/insumo.js";

function perto(valor: number, esperado: number, tolerancia: number) {
  expect(Math.abs(valor - esperado)).toBeLessThanOrEqual(tolerancia);
}

/** Todas as conversões destes testes existem; o null é falha real. */
function exigir<T>(valor: T | null): T {
  expect(valor).not.toBeNull();
  return valor as T;
}

describe("conversão de quilos para sacas", () => {
  it("saca de 50 kg com sobra", () => {
    const c = exigir(converter(3775, 50));

    perto(c.unidadesExatas, 75.5, 0.0001);
    expect(c.unidadesInteiras).toBe(75);
    perto(c.sobraKg, 25, 0.0001);
    expect(c.unidadesParaCompra).toBe(76);
    perto(c.toneladas, 3.775, 0.0001);
  });

  it("quantidade exata não arredonda para cima", () => {
    const c = exigir(converter(3000, 60));

    expect(c.unidadesInteiras).toBe(50);
    perto(c.sobraKg, 0, 0.0001);
    expect(c.unidadesParaCompra).toBe(50);
  });

  it("quantidade menor que uma saca", () => {
    const c = exigir(converter(12, 40));

    expect(c.unidadesInteiras).toBe(0);
    expect(c.unidadesParaCompra).toBe(1);
    perto(c.sobraKg, 12, 0.0001);
  });

  it("granel usa tonelada", () => {
    const c = exigir(converterPelaEmbalagem(2500, GRANEL));

    perto(c.kgPorUnidade, 1000, 0.0001);
    expect(c.unidadesInteiras).toBe(2);
    perto(c.sobraKg, 500, 0.0001);
    expect(c.nomeUnidadePlural).toBe("toneladas");
  });

  it("pastejo não converte", () => {
    expect(converterPelaEmbalagem(5000, PASTEJO)).toBeNull();
  });

  it("embalagem inválida não converte", () => {
    expect(converter(100, 0)).toBeNull();
    expect(converter(-5, 50)).toBeNull();
  });

  it("equivalências cobrem os tamanhos de mercado", () => {
    const lista = equivalencias(1200);

    expect(lista).toHaveLength(TAMANHOS_PADRAO.length);
    expect(lista.map((c) => c.kgPorUnidade)).toEqual([60, 50, 40, 30, 25, 20]);
    expect(lista[0]?.unidadesInteiras).toBe(20);
    expect(lista[1]?.unidadesInteiras).toBe(24);
  });

  it("descrição traz sacas e sobra", () => {
    const c = exigir(converter(128, 25));

    expect(descricao(c)).toContain("5");
    expect(descricaoCompra(c)).toBe("6 sacas");
  });
});

describe("matéria seca e preço do insumo", () => {
  it("converte matéria seca para natural e de volta", () => {
    const silagem = criarInsumo({
      nome: "Silagem",
      categoria: "volumoso",
      materiaSeca: 32,
      proteinaBruta: 7.5,
      ndt: 65,
    });

    perto(materiaNatural(silagem, 3.2), 10.0, 0.0001);
    perto(materiaSecaDe(silagem, 10), 3.2, 0.0001);
  });

  it("preço por quilo considera o tamanho da embalagem", () => {
    const milho = criarInsumo({
      nome: "Milho",
      categoria: "energetico",
      materiaSeca: 88,
      proteinaBruta: 9,
      ndt: 87,
      embalagem: SACA_60,
      precoUnitario: 72,
    });

    perto(precoPorKg(milho), 1.2, 0.0001);
    perto(precoPorKgMateriaSeca(milho), 1.2 / 0.88, 0.0001);
  });
});
