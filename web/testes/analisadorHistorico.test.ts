/** Porte de `NovilhaNutriTests/AnalisadorHistoricoTests.swift`, do antigo aplicativo de iPhone. */
import { describe, expect, it } from "vitest";

import {
  analisar,
  calibrar,
  calibracaoDisponivel,
  confiancaDosFatores,
  confiancaPara,
  custoMedioPorArroba,
  custoTotal,
  desempenho,
  fatorConsumo,
  temHistorico,
  totalAnimais,
  totalArrobas,
  totalCiclos,
  type AnaliseHistorica,
} from "../src/nucleo/analisadorHistorico.js";
import {
  aderenciaGanho,
  animaisPerdidos,
  arrobasLote,
  arrobasPorAnimal,
  arrobasProduzidasLote,
  criarCiclo,
  custoPorArroba,
  desvioCusto,
  diasReais,
  ganhoRealDiario,
  ganhoTotalLote,
  margem,
  pesoMedioCiclo,
  receita,
  rendimentoReal,
  taxaPerda,
  type CicloEncerrado,
} from "../src/nucleo/cicloEncerrado.js";
import { ganhoPorEnergia, perfilAnimal } from "../src/nucleo/motorExigencias.js";

const INICIO = new Date(0);

function perto(valor: number, esperado: number, tolerancia: number) {
  expect(Math.abs(valor - esperado)).toBeLessThanOrEqual(tolerancia);
}

/**
 * Ciclo de referência: 260 a 430 kg com meta de 0,750 kg/dia.
 * A dieta planejada tem 67% de NDT e consumo previsto de 7,9 kg de MS.
 */
function ciclo(opcoes: {
  ganhoReal: number;
  dias?: number;
  animais?: number;
  proteico?: string;
  carcaca?: number;
  concentradoReal?: number;
  custoReal?: number;
}): CicloEncerrado {
  const dias = opcoes.dias ?? 226;
  const animais = opcoes.animais ?? 40;
  return criarCiclo({
    loteID: crypto.randomUUID(),
    nome: "Lote teste",
    grupoGenetico: "zebuino",
    sistema: "semiconfinamento",
    dataInicio: INICIO,
    pesoInicial: 260,
    ganhoMeta: 0.75,
    pesoAlvo: 430,
    animaisIniciais: animais,
    pesoAcabamentoPlanejado: 430,
    consumoPrevistoDiario: 7.9,
    ndtDietaMedia: 67,
    pbDietaMedia: 11,
    concentradoPrevisto: 40_000,
    custoPrevisto: 50_000,
    volumosoNome: "Pasto",
    energeticoNome: "Milho",
    proteicoNome: opcoes.proteico ?? "Farelo de soja",
    dataAbate: new Date(INICIO.getTime() + dias * 86_400_000),
    pesoFinalReal: 260 + opcoes.ganhoReal * dias,
    animaisAbatidos: animais,
    pesoCarcacaReal: opcoes.carcaca ?? 0,
    concentradoReal: opcoes.concentradoReal ?? 0,
    custoReal: opcoes.custoReal ?? 0,
  });
}

const titulos = (a: AnaliseHistorica) => a.recomendacoes.map((r) => r.titulo);

describe("contas do ciclo", () => {
  it("ganho real e aderência", () => {
    const c = ciclo({ ganhoReal: 0.75 });

    perto(diasReais(c), 226, 0.01);
    perto(ganhoRealDiario(c), 0.75, 0.001);
    perto(aderenciaGanho(c), 1.0, 0.001);
    perto(ganhoTotalLote(c), 0.75 * 226 * 40, 0.1);
  });

  it("rendimento e arrobas produzidas", () => {
    const c = ciclo({ ganhoReal: 0.75, carcaca: 228 });

    perto(rendimentoReal(c) ?? 0, 228 / c.pesoFinalReal, 0.0001);
    perto(arrobasPorAnimal(c), 228 / 15, 0.001);
    // Arrobas produzidas descontam a carcaça que entrou no lote.
    const carcacaInicial = 260 * (228 / c.pesoFinalReal);
    perto(arrobasProduzidasLote(c), ((228 - carcacaInicial) / 15) * 40, 0.01);
  });

  it("custo por arroba e margem", () => {
    const c = { ...ciclo({ ganhoReal: 0.75, carcaca: 228, custoReal: 60_000 }), precoArroba: 300 };

    perto(custoPorArroba(c) ?? 0, 60_000 / arrobasProduzidasLote(c), 0.01);
    perto(receita(c) ?? 0, 300 * arrobasLote(c), 0.01);
    perto(margem(c) ?? 0, (receita(c) ?? 0) - 60_000, 0.01);
    perto(desvioCusto(c) ?? 0, 60_000 / 50_000 - 1, 0.0001);
  });

  it("perda de animais", () => {
    const c = { ...ciclo({ ganhoReal: 0.75 }), animaisAbatidos: 38 };

    expect(animaisPerdidos(c)).toBe(2);
    perto(taxaPerda(c), 2 / 40, 0.0001);
  });
});

describe("fator de consumo", () => {
  it("fica em um quando o ganho bate com o previsto", () => {
    // O ganho que o modelo prevê para o consumo planejado.
    const perfil = perfilAnimal({
      pesoVivo: 345,
      fase: "recriaFinal",
      grupoGenetico: "zebuino",
      sistema: "semiconfinamento",
      pesoFinal: 430,
    });
    const ganhoDoModelo = ganhoPorEnergia(perfil, 7.9, 7.9 * 0.67);

    // Constrói um ciclo cujo peso médio é 345 kg e que entregou esse ganho.
    const dias = (430 - 260) / ganhoDoModelo;
    const c = ciclo({ ganhoReal: ganhoDoModelo, dias });
    perto(pesoMedioCiclo(c), 345, 1.0);

    perto(fatorConsumo(c) ?? 0, 1.0, 0.03);
  });

  it("ganho abaixo do previsto derruba o fator", () => {
    const fatorBom = fatorConsumo(ciclo({ ganhoReal: 0.75 }));
    const fatorFraco = fatorConsumo(ciclo({ ganhoReal: 0.6 }));

    expect(fatorBom).not.toBeNull();
    expect(fatorFraco).not.toBeNull();
    expect(fatorFraco!).toBeLessThan(fatorBom!);
    expect(fatorFraco!).toBeLessThan(1.0);
    // O ganho cai mais rápido que o consumo: 20% menos ganho não significa
    // 20% menos consumo.
    expect(fatorFraco!).toBeGreaterThan(0.75);
  });

  it("ganho acima do previsto eleva o fator", () => {
    const fator = fatorConsumo(ciclo({ ganhoReal: 0.95 }));
    expect(fator).not.toBeNull();
    expect(fator!).toBeGreaterThan(1.0);
  });

  it("ciclo sem dados de dieta não gera fator", () => {
    expect(fatorConsumo({ ...ciclo({ ganhoReal: 0.75 }), consumoPrevistoDiario: 0 })).toBeNull();
  });
});

describe("calibração", () => {
  it("sem ciclos é neutra", () => {
    const fatores = calibrar([]);

    perto(fatores.ajusteConsumo, 1.0, 0.0001);
    expect(calibracaoDisponivel(fatores)).toBe(false);
  });

  it("média os ciclos", () => {
    const fatores = calibrar([
      ciclo({ ganhoReal: 0.7, carcaca: 220 }),
      ciclo({ ganhoReal: 0.6, carcaca: 210 }),
    ]);

    expect(fatores.ciclos).toBe(2);
    expect(calibracaoDisponivel(fatores)).toBe(true);
    expect(fatores.ajusteConsumo).toBeLessThan(1.0);
    perto(fatores.aderenciaGanhoMedia, (0.7 + 0.6) / 2 / 0.75, 0.02);
    expect(confiancaDosFatores(fatores)).toBe("moderada");
  });

  it("fica dentro de limites razoáveis", () => {
    const fatores = calibrar([ciclo({ ganhoReal: 0.05 })]);

    expect(fatores.ajusteConsumo).toBeGreaterThanOrEqual(0.7);
    expect(fatores.ajusteConsumo).toBeLessThanOrEqual(1.3);
    expect(fatores.rendimentoCarcaca).toBeGreaterThanOrEqual(0.4);
    expect(fatores.rendimentoCarcaca).toBeLessThanOrEqual(0.62);
  });

  it("confiança cresce com os ciclos", () => {
    expect(confiancaPara(1)).toBe("indicativa");
    expect(confiancaPara(3)).toBe("moderada");
    expect(confiancaPara(6)).toBe("consistente");
  });

  it("rendimento vem dos ciclos quando informado", () => {
    const fatores = calibrar([ciclo({ ganhoReal: 0.75, carcaca: 240 })]);
    perto(fatores.rendimentoCarcaca, 240 / (260 + 0.75 * 226), 0.005);
  });
});

describe("comparação entre alimentos", () => {
  it("ranking de proteicos ordena pelo desempenho", () => {
    const ranking = desempenho(
      [
        ciclo({ ganhoReal: 0.78, proteico: "Farelo de soja" }),
        ciclo({ ganhoReal: 0.62, proteico: "Farelo de algodão" }),
      ],
      "proteico",
    );

    expect(ranking).toHaveLength(2);
    expect(ranking[0]?.nome).toBe("Farelo de soja");
    expect(ranking[1]?.nome).toBe("Farelo de algodão");
    expect(ranking[0]!.aderenciaGanho).toBeGreaterThan(ranking[1]!.aderenciaGanho);
  });

  it("agrupa ciclos do mesmo alimento", () => {
    const ranking = desempenho(
      [
        ciclo({ ganhoReal: 0.8, proteico: "Farelo de soja" }),
        ciclo({ ganhoReal: 0.7, proteico: "Farelo de soja" }),
      ],
      "proteico",
    );

    expect(ranking).toHaveLength(1);
    expect(ranking[0]?.ciclos).toBe(2);
    perto(ranking[0]?.ganhoDiario ?? 0, 0.75, 0.001);
  });
});

describe("recomendações", () => {
  it("ganho baixo com concentrado entregue aponta a formulação", () => {
    const analise = analisar([
      ciclo({ ganhoReal: 0.6, carcaca: 220, concentradoReal: 40_000 }),
    ]);

    expect(titulos(analise)).toContain("Dieta entregou menos do que prometia");
    expect(analise.recomendacoes[0]?.severidade).toBe("critico");
  });

  it("ganho baixo com concentrado faltando aponta o fornecimento", () => {
    // Mesmo ganho baixo, mas só 70% do concentrado foi fornecido.
    const analise = analisar([
      ciclo({ ganhoReal: 0.6, carcaca: 220, concentradoReal: 28_000 }),
    ]);

    expect(titulos(analise)).toContain("Faltou concentrado no cocho");
  });

  it("ganho dentro da meta não alarma", () => {
    const analise = analisar([ciclo({ ganhoReal: 0.75, carcaca: 228 })]);

    expect(titulos(analise)).toContain("Ganho dentro do planejado");
    expect(analise.recomendacoes.some((r) => r.severidade === "critico")).toBe(false);
  });

  it("ganho acima da meta sugere economia", () => {
    expect(titulos(analisar([ciclo({ ganhoReal: 0.9, carcaca: 240 })]))).toContain("Sobrou dieta");
  });

  it("compara proteicos quando há mais de um", () => {
    const analise = analisar([
      ciclo({ ganhoReal: 0.78, proteico: "Farelo de soja", carcaca: 232 }),
      ciclo({ ganhoReal: 0.62, proteico: "Ureia pecuária", carcaca: 214 }),
    ]);

    expect(titulos(analise).some((t) => t.includes("Farelo de soja rendeu mais"))).toBe(true);
  });

  it("proteico único com ganho baixo pede reforço", () => {
    expect(titulos(analisar([ciclo({ ganhoReal: 0.65, carcaca: 220 })]))).toContain(
      "Reforce a fonte proteica",
    );
  });

  it("sem carcaça pede o registro", () => {
    expect(titulos(analisar([ciclo({ ganhoReal: 0.75 })]))).toContain(
      "Registre o peso de carcaça",
    );
  });

  it("perda de animais entra no diagnóstico", () => {
    const c = { ...ciclo({ ganhoReal: 0.75, carcaca: 228 }), animaisAbatidos: 36 };
    expect(titulos(analisar([c])).some((t) => t.includes("Perda de 4"))).toBe(true);
  });

  it("custo acima do previsto alerta", () => {
    const analise = analisar([ciclo({ ganhoReal: 0.75, carcaca: 228, custoReal: 70_000 })]);
    expect(titulos(analise)).toContain("Custo estourou o orçamento");
  });
});

describe("análise completa", () => {
  it("vazia não quebra", () => {
    const analise = analisar([]);

    expect(temHistorico(analise)).toBe(false);
    expect(analise.recomendacoes).toHaveLength(0);
    expect(totalCiclos(analise)).toBe(0);
    expect(custoMedioPorArroba(analise)).toBeNull();
  });

  it("totais da análise", () => {
    const analise = analisar([
      ciclo({ ganhoReal: 0.75, carcaca: 228, custoReal: 50_000 }),
      ciclo({ ganhoReal: 0.7, animais: 30, carcaca: 220, custoReal: 30_000 }),
    ]);

    expect(totalCiclos(analise)).toBe(2);
    expect(totalAnimais(analise)).toBe(70);
    perto(custoTotal(analise), 80_000, 0.01);
    expect(totalArrobas(analise)).toBeGreaterThan(0);
    expect(custoMedioPorArroba(analise)).not.toBeNull();
  });

  it("ciclos são ordenados do mais recente para o mais antigo", () => {
    const antigo = {
      ...ciclo({ ganhoReal: 0.75 }),
      dataAbate: new Date(INICIO.getTime() + 100 * 86_400_000),
    };
    const recente = {
      ...ciclo({ ganhoReal: 0.7 }),
      dataAbate: new Date(INICIO.getTime() + 400 * 86_400_000),
    };

    const analise = analisar([antigo, recente]);
    expect(analise.ciclos[0]?.dataAbate.getTime()).toBe(recente.dataAbate.getTime());
  });
});
