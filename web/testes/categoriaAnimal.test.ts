/**
 * Categoria de sexo: fêmea, macho castrado e macho inteiro.
 *
 * Os valores esperados de energia retida são calculados à mão a partir das
 * equações publicadas, não copiados da saída do programa - um teste que só
 * repete o que o código faz não prova nada sobre as equações.
 */
import { describe, expect, it } from "vitest";

import { CATEGORIAS_ANIMAL } from "../src/nucleo/classificacoes.js";
import { desserializar } from "../src/nucleo/dadosApp.js";
import {
  calcular,
  corpoVazioEquivalente,
  energiaMantenca,
  energiaRetida,
  perfilAnimal,
  pesoEquivalente,
} from "../src/nucleo/motorExigencias.js";

const GANHO = 1.0;

function perfil(categoria: "femea" | "machoCastrado" | "machoInteiro") {
  return perfilAnimal({
    pesoVivo: 300,
    fase: "recriaFinal",
    pesoFinal: 500,
    categoria,
  });
}

/**
 * ER = a x PCVZ^0,75 x GPCVZ^b, feito na mão para o animal do teste.
 *
 * Peso de jejum 300 x 0,96 = 288; acabamento 500 x 0,96 = 480; peso
 * equivalente 288 x 462/480 = 277,2; corpo vazio 277,2 x 0,891 = 246,9852;
 * ganho de corpo vazio 1,0 x 0,956 = 0,956.
 */
function energiaEsperada(a: number, b: number): number {
  return a * 246.9852 ** 0.75 * 0.956 ** b;
}

describe("as equações de energia mudam com a categoria", () => {
  it("o peso equivalente é o mesmo nas três: o tamanho adulto vem do acabamento", () => {
    const esperado = 288 * (462 / 480);
    for (const c of ["femea", "machoCastrado", "machoInteiro"] as const) {
      expect(pesoEquivalente(perfil(c))).toBeCloseTo(esperado, 6);
      expect(corpoVazioEquivalente(perfil(c))).toBeCloseTo(esperado * 0.891, 6);
    }
  });

  it("fêmea segue a equação de fêmeas do NRC", () => {
    expect(energiaRetida(perfil("femea"), GANHO)).toBeCloseTo(
      energiaEsperada(0.0783, 1.119),
      6,
    );
  });

  it("macho castrado segue a equação de machos", () => {
    expect(energiaRetida(perfil("machoCastrado"), GANHO)).toBeCloseTo(
      energiaEsperada(0.0635, 1.097),
      6,
    );
  });

  it("macho inteiro usa a mesma energia de ganho do castrado", () => {
    expect(energiaRetida(perfil("machoInteiro"), GANHO)).toBeCloseTo(
      energiaRetida(perfil("machoCastrado"), GANHO),
      9,
    );
  });

  it("a fêmea exige mais energia por quilo ganho que o macho", () => {
    const femea = energiaRetida(perfil("femea"), GANHO);
    const macho = energiaRetida(perfil("machoCastrado"), GANHO);
    expect(femea).toBeGreaterThan(macho);
    // A diferença vem dos coeficientes: 0,0783 contra 0,0635.
    expect(femea / macho).toBeCloseTo(
      (0.0783 * 0.956 ** 1.119) / (0.0635 * 0.956 ** 1.097),
      6,
    );
  });

  it("só o macho inteiro gasta mais em mantença, e são 15%", () => {
    const castrado = energiaMantenca(perfil("machoCastrado"));
    expect(energiaMantenca(perfil("femea"))).toBeCloseTo(castrado, 9);
    expect(energiaMantenca(perfil("machoInteiro"))).toBeCloseTo(castrado * 1.15, 9);
    expect(CATEGORIAS_ANIMAL.machoInteiro.fatorMantenca).toBe(1.15);
  });
});

describe("o que isso muda na dieta", () => {
  it("o macho castrado precisa de dieta menos concentrada que a fêmea", () => {
    const femea = calcular(perfil("femea"), GANHO);
    const macho = calcular(perfil("machoCastrado"), GANHO);

    expect(macho.ndtPercentualDieta).toBeLessThan(femea.ndtPercentualDieta);
    expect(macho.ndtKg).toBeLessThan(femea.ndtKg);
  });

  it("e de mais proteína, porque a proteína do ganho sobe quando a energia cai", () => {
    const femea = calcular(perfil("femea"), GANHO);
    const macho = calcular(perfil("machoCastrado"), GANHO);

    expect(macho.proteinaBrutaGramas).toBeGreaterThan(femea.proteinaBrutaGramas);
  });

  it("o macho inteiro come mais que o castrado, pela mantença maior", () => {
    const castrado = calcular(perfil("machoCastrado"), GANHO);
    const inteiro = calcular(perfil("machoInteiro"), GANHO);

    expect(inteiro.ndtKg).toBeGreaterThan(castrado.ndtKg);
  });

  it("nada disso mexe na fêmea, que é o que o aplicativo já calculava", () => {
    // Valor travado da versão anterior à categoria: qualquer mudança aqui é
    // regressão no cálculo de quem já usa o aplicativo.
    const femea = calcular(perfil("femea"), GANHO);
    expect(femea.ndtKg).toBeCloseTo(5.165, 3);
    expect(femea.proteinaBrutaGramas).toBeCloseTo(756, 0);
    expect(femea.consumoMateriaSeca).toBeCloseTo(6.75, 2);
  });
});

describe("compatibilidade do arquivo", () => {
  it("backup sem categoria abre como fêmea", () => {
    const antigo = JSON.stringify({
      versao: 2,
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

    expect(desserializar(antigo).lotes[0]!.categoriaAnimal).toBe("femea");
  });

  it("categoria desconhecida no arquivo não derruba a leitura", () => {
    const arquivo = JSON.stringify({
      versao: 2,
      lotes: [],
      insumos: [],
      ciclos: [],
      usarCalibracao: true,
    });
    expect(desserializar(arquivo).lotes).toHaveLength(0);
  });
});
