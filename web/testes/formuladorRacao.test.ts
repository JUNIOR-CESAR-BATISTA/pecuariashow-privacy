/** Porte de `NovilhaNutriTests/FormuladorRacaoTests.swift`, do antigo aplicativo de iPhone. */
import { beforeEach, describe, expect, it } from "vitest";

import {
  PASTEJO,
  SACA_25,
  SACA_50,
  SACA_60,
  criarInsumo,
  precoPorKg,
  type Insumo,
} from "../src/nucleo/insumo.js";
import {
  RESTRICOES_PADRAO,
  avaliar,
  balancoNDT,
  consumoMateriaSeca,
  custoDiario,
  formular,
  gaussJordan,
  itemMateriaNatural,
  ndtFornecidoKg,
  percentualConcentrado,
  percentualVolumoso,
  proteinaFornecidaKg,
  type SelecaoInsumos,
} from "../src/nucleo/formuladorRacao.js";
import {
  calcular,
  ganhoEsperado,
  perfilAnimal,
  type ExigenciaDiaria,
  type PerfilAnimal,
} from "../src/nucleo/motorExigencias.js";

function perto(valor: number, esperado: number, tolerancia: number) {
  expect(Math.abs(valor - esperado)).toBeLessThanOrEqual(tolerancia);
}

let pasto: Insumo;
let milho: Insumo;
let soja: Insumo;
let mineral: Insumo;
let perfil: PerfilAnimal;
let exigencia: ExigenciaDiaria;
let selecao: SelecaoInsumos;

beforeEach(() => {
  pasto = criarInsumo({
    nome: "Pasto",
    categoria: "volumoso",
    materiaSeca: 28,
    proteinaBruta: 9.0,
    ndt: 58,
    embalagem: PASTEJO,
  });
  milho = criarInsumo({
    nome: "Milho",
    categoria: "energetico",
    materiaSeca: 88,
    proteinaBruta: 9.0,
    ndt: 87,
    embalagem: SACA_60,
    precoUnitario: 60,
  });
  soja = criarInsumo({
    nome: "Farelo de soja",
    categoria: "proteico",
    materiaSeca: 89,
    proteinaBruta: 48.0,
    ndt: 82,
    embalagem: SACA_50,
    precoUnitario: 150,
  });
  mineral = criarInsumo({
    nome: "Núcleo",
    categoria: "mineral",
    materiaSeca: 99,
    proteinaBruta: 0,
    ndt: 0,
    embalagem: SACA_25,
    precoUnitario: 100,
  });

  perfil = perfilAnimal({ pesoVivo: 300, fase: "recriaFinal", pesoFinal: 450 });
  exigencia = calcular(perfil, 0.7);
  selecao = { volumoso: pasto, energetico: milho, proteico: soja, mineral };
});

describe("balanceamento automático", () => {
  it("atende PB e NDT exatamente", () => {
    const racao = formular(exigencia, selecao);

    expect(racao.status).toBe("balanceada");
    perto(proteinaFornecidaKg(racao), exigencia.proteinaBrutaKg, 0.001);
    perto(ndtFornecidoKg(racao), exigencia.ndtKg, 0.001);
    perto(consumoMateriaSeca(racao), exigencia.consumoMateriaSeca, 0.001);
    expect(racao.itens).toHaveLength(4);
  });

  it("quantidades em matéria seca e natural", () => {
    const racao = formular(exigencia, selecao);
    const achar = (nome: string) => racao.itens.find((i) => i.insumo.nome === nome);

    const volumoso = achar("Pasto");
    const energetico = achar("Milho");
    const proteico = achar("Farelo de soja");
    expect(volumoso && energetico && proteico).toBeTruthy();

    perto(volumoso!.kgMateriaSeca, 4.179, 0.02);
    perto(energetico!.kgMateriaSeca, 2.232, 0.02);
    perto(proteico!.kgMateriaSeca, 0.376, 0.02);

    // Matéria natural = matéria seca dividida pelo teor de MS.
    perto(itemMateriaNatural(volumoso!), 14.93, 0.1);
    perto(itemMateriaNatural(energetico!), 2.536, 0.02);
    perto(itemMateriaNatural(proteico!), 0.422, 0.02);
  });

  it("mineral entra com quantidade fixa", () => {
    const racao = formular(exigencia, selecao, { ...RESTRICOES_PADRAO, mineralGramasDia: 120 });
    const item = racao.itens.find((i) => i.insumo.categoria === "mineral");

    expect(item).toBeDefined();
    perto(itemMateriaNatural(item!), 0.12, 0.0005);
  });

  it("ração balanceada devolve o ganho da meta", () => {
    const racao = formular(exigencia, selecao);
    const ganho = ganhoEsperado(
      perfil,
      consumoMateriaSeca(racao),
      ndtFornecidoKg(racao),
      proteinaFornecidaKg(racao),
    );

    perto(ganho.porEnergia, 0.7, 0.01);
    expect(ganho.porProteina).toBeGreaterThanOrEqual(ganho.porEnergia);
  });

  it("custo diário usa o preço por quilo natural", () => {
    const racao = formular(exigencia, selecao);
    const esperado = racao.itens.reduce(
      (total, item) => total + itemMateriaNatural(item) * precoPorKg(item.insumo),
      0,
    );

    perto(custoDiario(racao), esperado, 0.0001);
    // O pasto não tem preço, então não entra no custo.
    expect(custoDiario(racao)).toBeGreaterThan(0);
  });

  it("percentuais de volumoso e concentrado fecham em 100 com o mineral", () => {
    const racao = formular(exigencia, selecao);
    const fatiaMineral = (0.099 / consumoMateriaSeca(racao)) * 100;

    perto(percentualVolumoso(racao) + percentualConcentrado(racao) + fatiaMineral, 100, 0.5);
  });
});

describe("quando os limites de manejo mandam", () => {
  it("volumoso mínimo força ajuste e deixa faltar energia", () => {
    const racao = formular(exigencia, selecao, { ...RESTRICOES_PADRAO, volumosoMinimo: 0.8 });

    expect(racao.status).toBe("restrita");
    // A proteína continua atendida.
    perto(proteinaFornecidaKg(racao), exigencia.proteinaBrutaKg, 0.005);
    // A energia fica abaixo do exigido.
    expect(balancoNDT(racao)).toBeLessThan(-0.1);
    expect(racao.alertas.length).toBeGreaterThan(0);

    const volumoso = racao.itens.find((i) => i.insumo.categoria === "volumoso");
    perto(volumoso?.kgMateriaSeca ?? 0, 5.429, 0.05);
  });

  it("volumoso fixo respeita a proporção escolhida", () => {
    const racao = formular(exigencia, selecao, { ...RESTRICOES_PADRAO, volumosoFixo: 0.5 });
    const disponivel = consumoMateriaSeca(racao) - 0.099;
    const volumoso = racao.itens.find((i) => i.insumo.categoria === "volumoso");

    perto(volumoso?.kgMateriaSeca ?? 0, disponivel * 0.5, 0.01);
    expect(racao.status).toBe("restrita");
  });

  it("sistema linear sem solução não quebra", () => {
    // Três alimentos idênticos deixam o sistema indeterminado.
    const racao = formular(exigencia, {
      volumoso: pasto,
      energetico: pasto,
      proteico: pasto,
    });

    expect(racao.status).toBe("restrita");
    expect(consumoMateriaSeca(racao)).toBeGreaterThan(0);
    expect(racao.alertas.length).toBeGreaterThan(0);
  });
});

describe("avaliação de uma dieta informada à mão", () => {
  it("calcula os totais", () => {
    const racao = avaliar(
      [
        { insumo: pasto, kgMateriaNatural: 15.0 },
        { insumo: milho, kgMateriaNatural: 2.0 },
        { insumo: soja, kgMateriaNatural: 0.5 },
      ],
      exigencia,
    );

    perto(consumoMateriaSeca(racao), 15 * 0.28 + 2 * 0.88 + 0.5 * 0.89, 0.0001);
    expect(racao.itens).toHaveLength(3);
  });

  it("alimento repetido é somado em uma linha só", () => {
    const racao = avaliar(
      [
        { insumo: milho, kgMateriaNatural: 1.0 },
        { insumo: milho, kgMateriaNatural: 2.0 },
      ],
      exigencia,
    );

    expect(racao.itens).toHaveLength(1);
    perto(itemMateriaNatural(racao.itens[0]!), 3.0, 0.0001);
  });
});

describe("Gauss-Jordan", () => {
  it("resolve um sistema conhecido", () => {
    // x + y + z = 6 ; 2y + 5z = -4 ; 2x + 5y - z = 27  ->  (5, 3, -2)
    const solucao = gaussJordan([
      [1, 1, 1, 6],
      [0, 2, 5, -4],
      [2, 5, -1, 27],
    ]);

    expect(solucao).not.toBeNull();
    perto(solucao![0]!, 5, 0.0001);
    perto(solucao![1]!, 3, 0.0001);
    perto(solucao![2]!, -2, 0.0001);
  });

  it("devolve nulo quando o sistema é singular", () => {
    expect(
      gaussJordan([
        [1, 1, 1, 3],
        [2, 2, 2, 6],
        [3, 3, 3, 9],
      ]),
    ).toBeNull();
  });
});
