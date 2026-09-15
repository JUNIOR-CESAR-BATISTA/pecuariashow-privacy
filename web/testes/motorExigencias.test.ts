/**
 * Porte de `NovilhaNutriTests/MotorExigenciasTests.swift`.
 *
 * Os números esperados são os mesmos da versão Swift, que por sua vez foram
 * conferidos contra uma implementação independente das mesmas equações. Se o
 * porte tivesse escorregado em qualquer constante ou sinal, é aqui que
 * apareceria.
 */
import { describe, expect, it } from "vitest";

import { faseSugerida, type FaseAnimal, type GrupoGenetico, type SistemaCriacao } from "../src/nucleo/classificacoes.js";
import {
  calcular,
  consumoPotencial,
  energiaMantenca,
  ganhoEsperado,
  ganhoMaximo,
  ganhoPorEnergia,
  perfilAnimal,
  type PerfilAnimal,
} from "../src/nucleo/motorExigencias.js";

function perfil(opcoes: {
  peso: number;
  fase?: FaseAnimal;
  genetica?: GrupoGenetico;
  sistema?: SistemaCriacao;
  pesoFinal?: number;
}): PerfilAnimal {
  return perfilAnimal({
    pesoVivo: opcoes.peso,
    fase: opcoes.fase ?? "recriaFinal",
    grupoGenetico: opcoes.genetica ?? "zebuino",
    sistema: opcoes.sistema ?? "semiconfinamento",
    pesoFinal: opcoes.pesoFinal ?? 450,
  });
}

/** Equivalente ao `accuracy:` do XCTAssertEqual. */
function perto(valor: number, esperado: number, tolerancia: number) {
  expect(Math.abs(valor - esperado)).toBeLessThanOrEqual(tolerancia);
}

describe("exigências diárias", () => {
  it("novilha de 300 kg ganhando 0,700 kg/dia", () => {
    const r = calcular(perfil({ peso: 300 }), 0.7);

    perto(r.consumoMateriaSeca, 6.886, 0.01);
    perto(r.ndtPercentualDieta, 67.87, 0.05);
    perto(r.ndtKg, 4.674, 0.01);
    perto(r.proteinaBrutaGramas, 757.4, 1.0);
    expect(r.metaAtingivel).toBe(true);
    perto(r.ganhoDiario, 0.7, 0.0001);
    // Consumo entre 2% e 3% do peso vivo é o esperado nesta categoria.
    expect(r.consumoPercentualPeso).toBeGreaterThanOrEqual(2);
    expect(r.consumoPercentualPeso).toBeLessThanOrEqual(3);
  });

  it("novilha de 200 kg cai no piso de proteína da fase", () => {
    const r = calcular(perfil({ peso: 200, fase: "recriaInicial", pesoFinal: 430 }), 0.5);

    perto(r.consumoMateriaSeca, 5.03, 0.01);
    perto(r.ndtKg, 3.134, 0.01);
    perto(r.proteinaBrutaPercentualDieta, 12.0, 0.001);
    expect(r.proteinaAjustadaAoPiso).toBe(true);
  });

  it("cruzada em confinamento com ganho alto", () => {
    const r = calcular(
      perfil({ peso: 400, genetica: "cruzado", sistema: "confinamento", pesoFinal: 480 }),
      1.0,
    );

    perto(r.consumoMateriaSeca, 8.369, 0.02);
    perto(r.ndtPercentualDieta, 76.59, 0.05);
    perto(r.proteinaBrutaGramas, 920.5, 2.0);
  });

  it("mantença não tem energia de ganho", () => {
    const r = calcular(perfil({ peso: 300 }), 0);

    perto(r.energiaLiquidaGanho, 0, 0.0001);
    perto(r.proteinaMetabolizavelGanho, 0, 0.0001);
    perto(r.consumoMateriaSeca, 5.619, 0.01);
    expect(r.ndtPercentualDieta).toBeLessThan(55);
  });

  it("meta inviável cai para o ganho máximo", () => {
    const animal = perfil({ peso: 300 });
    const r = calcular(animal, 2.0);

    expect(r.metaAtingivel).toBe(false);
    perto(r.ganhoDiarioMeta, 2.0, 0.0001);
    perto(r.ganhoDiario, ganhoMaximo(animal), 0.001);
    perto(r.ganhoDiario, 1.093, 0.01);
    expect(r.alertas.length).toBeGreaterThan(0);
  });
});

describe("como as exigências reagem", () => {
  it("crescem com o peso", () => {
    const leve = calcular(perfil({ peso: 250 }), 0.7);
    const pesada = calcular(perfil({ peso: 400 }), 0.7);

    expect(pesada.consumoMateriaSeca).toBeGreaterThan(leve.consumoMateriaSeca);
    expect(pesada.ndtKg).toBeGreaterThan(leve.ndtKg);
    expect(pesada.proteinaBrutaKg).toBeGreaterThan(leve.proteinaBrutaKg);
  });

  it("ganho maior exige dieta mais concentrada", () => {
    const lento = calcular(perfil({ peso: 300 }), 0.4);
    const rapido = calcular(perfil({ peso: 300 }), 0.9);

    expect(rapido.ndtPercentualDieta).toBeGreaterThan(lento.ndtPercentualDieta);
    expect(rapido.ndtKg).toBeGreaterThan(lento.ndtKg);
  });

  it("animal mais precoce exige mais energia", () => {
    const precoce = calcular(perfil({ peso: 300, pesoFinal: 380 }), 0.7);
    const tardia = calcular(perfil({ peso: 300, pesoFinal: 520 }), 0.7);

    expect(precoce.ndtPercentualDieta).toBeGreaterThan(tardia.ndtPercentualDieta);
    expect(precoce.energiaLiquidaGanho).toBeGreaterThan(tardia.energiaLiquidaGanho);
  });

  it("semiconfinamento gasta mais que confinamento", () => {
    const curral = energiaMantenca(perfil({ peso: 300, sistema: "confinamento" }));
    const semi = energiaMantenca(perfil({ peso: 300, sistema: "semiconfinamento" }));
    const pasto = energiaMantenca(perfil({ peso: 300, sistema: "pasto" }));

    expect(curral).toBeLessThan(semi);
    expect(semi).toBeLessThan(pasto);
    perto(semi / curral, 1.1, 0.0001);
  });

  it("ajuste de consumo altera o previsto", () => {
    const animal = perfil({ peso: 300 });
    const padrao = consumoPotencial(animal, 65);
    const ajustado = consumoPotencial({ ...animal, ajusteConsumo: 1.1 }, 65);

    perto(ajustado / padrao, 1.1, 0.0001);
  });
});

describe("ganho esperado de uma dieta pronta", () => {
  it("devolve a meta quando a dieta está exata", () => {
    const animal = perfil({ peso: 300 });
    const exigencia = calcular(animal, 0.7);
    const ganho = ganhoPorEnergia(animal, exigencia.consumoMateriaSeca, exigencia.ndtKg);

    perto(ganho, 0.7, 0.005);
  });

  it("dieta pobre limita o ganho", () => {
    // Somente pasto de baixa qualidade: 6 kg de MS com 55% de NDT.
    const ganho = ganhoPorEnergia(perfil({ peso: 300 }), 6.0, 3.3);

    expect(ganho).toBeLessThan(0.4);
    expect(ganho).toBeGreaterThan(0);
  });

  it("dieta abaixo da mantença não gera ganho", () => {
    perto(ganhoPorEnergia(perfil({ peso: 300 }), 2.0, 1.0), 0, 0.0001);
  });

  it("aponta a proteína como limitante", () => {
    // Energia sobrando e proteína muito baixa.
    const r = ganhoEsperado(perfil({ peso: 300 }), 7.0, 5.0, 0.45);

    expect(r.nutrienteLimitante).toBe("Proteína (PB)");
    perto(r.ganho, r.porProteina, 0.0001);
  });
});

describe("fase sugerida por peso", () => {
  it.each([
    [180, "desmama"],
    [240, "recriaInicial"],
    [320, "recriaFinal"],
    [420, "terminacao"],
  ])("%i kg é %s", (peso, esperada) => {
    expect(faseSugerida(peso as number)).toBe(esperada);
  });
});
