/**
 * Duas etapas de dieta no mesmo ciclo: crescimento até o peso de virada,
 * engorda daí ao abate.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { desserializar } from "../src/nucleo/dadosApp.js";
import type { SelecaoInsumos } from "../src/nucleo/formuladorRacao.js";
import { PASTEJO, SACA_25, SACA_50, SACA_60, criarInsumo } from "../src/nucleo/insumo.js";
import {
  criarLote,
  dietaDaEtapa,
  planoResolvido,
  etapaNoPeso,
  ganhoMetaAtual,
  trocaDentroDoCiclo,
  type Lote,
} from "../src/nucleo/lote.js";
import {
  custoTotal,
  materiaSecaTotal,
  projetar,
  resumosPorEtapa,
  temDuasEtapas,
} from "../src/nucleo/planejadorAbate.js";
import { gerar } from "../src/nucleo/relatorioTexto.js";

function perto(valor: number, esperado: number, tolerancia = 0.01) {
  expect(Math.abs(valor - esperado)).toBeLessThanOrEqual(tolerancia);
}

let selecao: SelecaoInsumos;
let silagem: SelecaoInsumos;

function loteBase(extra: Partial<Lote> = {}): Lote {
  return criarLote({
    nome: "Lote teste",
    quantidadeAnimais: 40,
    pesoMedioInicial: 240,
    ganhoMetaDiario: 0.7,
    fase: "recriaInicial",
    dataEntrada: new Date(0),
    pesoAlvoAbate: 440,
    rendimentoCarcaca: 0.53,
    pesoFinalMaturidade: 440,
    diasPorPeriodo: 30,
    planoEtapas: "soCrescimento",
    ...extra,
  });
}

/** Crescimento até 340 kg a 0,7 kg/d; engorda daí a 440 kg a 1,2 kg/d. */
function loteDuasEtapas(extra: Partial<Lote> = {}): Lote {
  return loteBase({
    planoEtapas: "duas",
    pesoTrocaEtapa: 340,
    engorda: {
      ganhoMetaDiario: 1.2,
      restricoes: { volumosoMinimo: 0.25, volumosoMaximo: 0.55, mineralGramasDia: 120 },
    },
    ...extra,
  });
}

beforeEach(() => {
  const comuns = {
    energetico: criarInsumo({
      nome: "Milho",
      categoria: "energetico" as const,
      materiaSeca: 88,
      proteinaBruta: 9,
      ndt: 87,
      embalagem: SACA_60,
      precoUnitario: 60,
    }),
    proteico: criarInsumo({
      nome: "Farelo de soja",
      categoria: "proteico" as const,
      materiaSeca: 89,
      proteinaBruta: 48,
      ndt: 82,
      embalagem: SACA_50,
      precoUnitario: 150,
    }),
    mineral: criarInsumo({
      nome: "Núcleo",
      categoria: "mineral" as const,
      materiaSeca: 99,
      proteinaBruta: 0,
      ndt: 0,
      embalagem: SACA_25,
      precoUnitario: 100,
    }),
  };
  selecao = {
    volumoso: criarInsumo({
      nome: "Pasto",
      categoria: "volumoso",
      materiaSeca: 28,
      proteinaBruta: 9,
      ndt: 58,
      embalagem: PASTEJO,
    }),
    ...comuns,
  };
  silagem = {
    volumoso: criarInsumo({
      nome: "Silagem de milho",
      categoria: "volumoso",
      materiaSeca: 33,
      proteinaBruta: 7.5,
      ndt: 68,
      embalagem: PASTEJO,
    }),
    ...comuns,
  };
});

describe("qual dieta vale em cada peso", () => {
  it("no plano de só crescimento, é sempre crescimento", () => {
    const lote = loteBase();
    expect(etapaNoPeso(lote, 240)).toBe("crescimento");
    expect(etapaNoPeso(lote, 430)).toBe("crescimento");
    expect(trocaDentroDoCiclo(lote)).toBe(false);
  });

  it("vira para engorda a partir do peso de troca, e não antes", () => {
    const lote = loteDuasEtapas();
    expect(etapaNoPeso(lote, 339.9)).toBe("crescimento");
    expect(etapaNoPeso(lote, 340)).toBe("engorda");
    expect(etapaNoPeso(lote, 400)).toBe("engorda");
  });

  it("a meta de ganho de hoje é a da etapa em que o lote está", () => {
    expect(ganhoMetaAtual(loteDuasEtapas())).toBe(0.7);
    expect(ganhoMetaAtual(loteDuasEtapas({ pesoMedioInicial: 360 }))).toBe(1.2);
  });

  it("a engorda herda os alimentos do crescimento quando não escolhe os seus", () => {
    const lote = loteDuasEtapas({
      volumosoID: "v1",
      energeticoID: "e1",
      proteicoID: "p1",
      mineralID: "m1",
    });
    const engorda = dietaDaEtapa(lote, "engorda");
    expect(engorda.volumosoID).toBe("v1");
    expect(engorda.proteicoID).toBe("p1");
    // O que ela escolhe, vale.
    const trocado = dietaDaEtapa(
      { ...lote, engorda: { ...lote.engorda, volumosoID: "v2" } },
      "engorda",
    );
    expect(trocado.volumosoID).toBe("v2");
    expect(trocado.energeticoID).toBe("e1");
  });

  it("troca fora do intervalo do ciclo vira etapa única", () => {
    // Peso de troca abaixo do peso de entrada: o lote já entrou em engorda.
    expect(trocaDentroDoCiclo(loteDuasEtapas({ pesoTrocaEtapa: 200 }))).toBe(false);
    // Acima do peso de abate: a engorda não chega a começar.
    expect(trocaDentroDoCiclo(loteDuasEtapas({ pesoTrocaEtapa: 500 }))).toBe(false);
  });
});

describe("projeção com as duas etapas", () => {
  it("nenhum período atravessa a virada", () => {
    const r = projetar(loteDuasEtapas(), selecao, silagem);

    for (const p of r.periodos) {
      const dentro = p.pesoInicial >= 340 - 1e-6 === p.pesoFinal >= 340 + 1e-6;
      expect(
        dentro || Math.abs(p.pesoFinal - 340) < 1e-6 || Math.abs(p.pesoInicial - 340) < 1e-6,
      ).toBe(true);
    }
    // O último período do crescimento termina exatamente no peso de virada.
    const ultimoCrescimento = r.periodos.filter((p) => p.etapa === "crescimento").at(-1)!;
    perto(ultimoCrescimento.pesoFinal, 340, 1e-6);
    expect(r.periodos.find((p) => p.etapa === "engorda")!.pesoInicial).toBeCloseTo(340, 6);
  });

  it("cada etapa anda na sua própria meta de ganho", () => {
    const r = projetar(loteDuasEtapas(), selecao, silagem);
    for (const p of r.periodos) {
      perto(p.ganhoDiario, p.etapa === "crescimento" ? 0.7 : 1.2, 1e-9);
      perto((p.pesoFinal - p.pesoInicial) / p.dias, p.ganhoDiario, 1e-6);
    }
  });

  it("os dias somam os dois trechos, cada um na sua velocidade", () => {
    const r = projetar(loteDuasEtapas(), selecao, silagem);
    // (340 - 240) / 0,7 = 142,857 dias; (440 - 340) / 1,2 = 83,333 dias.
    perto(r.diasTotais, 100 / 0.7 + 100 / 1.2, 0.01);
    perto(r.dataAbate.getTime() / 86_400_000 - r.dataInicio.getTime() / 86_400_000, r.diasTotais, 0.01);

    const [crescimento, engorda] = resumosPorEtapa(r);
    perto(crescimento!.dias, 100 / 0.7, 0.01);
    perto(engorda!.dias, 100 / 1.2, 0.01);
    perto(crescimento!.dias + engorda!.dias, r.diasTotais, 0.01);
  });

  it("chega ao peso de abate", () => {
    const r = projetar(loteDuasEtapas(), selecao, silagem);
    perto(r.periodos.at(-1)!.pesoFinal, 440, 0.01);
  });

  it("os produtos de cada etapa somam os produtos do ciclo", () => {
    const r = projetar(loteDuasEtapas(), selecao, silagem);
    const resumos = resumosPorEtapa(r);
    expect(temDuasEtapas(r)).toBe(true);

    for (const total of r.totais) {
      const soma = resumos
        .flatMap((e) => e.totais)
        .filter((c) => c.insumo.id === total.insumo.id)
        .reduce((s, c) => s + c.kgMateriaNatural, 0);
      perto(soma, total.kgMateriaNatural, 0.01);
    }
    perto(
      resumos.reduce((s, e) => s + e.custo, 0),
      custoTotal(r),
      0.01,
    );
    perto(
      resumos.reduce((s, e) => s + e.materiaSeca, 0),
      materiaSecaTotal(r),
      0.01,
    );
  });

  it("cada etapa compra o seu volumoso", () => {
    const r = projetar(loteDuasEtapas(), selecao, silagem);
    const [crescimento, engorda] = resumosPorEtapa(r);

    expect(crescimento!.totais.map((c) => c.insumo.nome)).toContain("Pasto");
    expect(crescimento!.totais.map((c) => c.insumo.nome)).not.toContain("Silagem de milho");
    expect(engorda!.totais.map((c) => c.insumo.nome)).toContain("Silagem de milho");
    expect(engorda!.totais.map((c) => c.insumo.nome)).not.toContain("Pasto");
    // E o ciclo lista os dois volumosos, que é o que se compra de verdade.
    expect(r.totais.map((c) => c.insumo.nome)).toEqual(
      expect.arrayContaining(["Pasto", "Silagem de milho"]),
    );
  });

  it("a engorda come mais concentrado que a recria", () => {
    const r = projetar(loteDuasEtapas(), selecao, silagem);
    const [crescimento, engorda] = resumosPorEtapa(r);

    const fatiaVolumoso = (etapa: typeof crescimento) => {
      const volumoso = etapa!.totais.find((c) => c.insumo.categoria === "volumoso")!;
      return volumoso.kgMateriaSeca / etapa!.materiaSeca;
    };
    expect(fatiaVolumoso(engorda)).toBeLessThan(fatiaVolumoso(crescimento));
  });

  it("ligar a segunda etapa não muda nada antes da virada", () => {
    const uma = projetar(loteBase(), selecao, selecao);
    const duas = projetar(loteDuasEtapas(), selecao, selecao);

    // Só os períodos cheios: a virada acrescenta ao crescimento um período
    // parcial, que termina exatamente em 340 kg e não tem par do outro lado.
    const cheios = (r: typeof uma) =>
      r.periodos.filter((p) => p.pesoFinal <= 340 + 1e-6 && p.dias === 30);
    const a = cheios(uma);
    const b = cheios(duas);

    expect(b.length).toBe(a.length);
    expect(b.length).toBeGreaterThan(2);
    for (let i = 0; i < b.length; i += 1) {
      perto(a[i]!.pesoFinal, b[i]!.pesoFinal, 1e-9);
      perto(a[i]!.exigencia.consumoMateriaSeca, b[i]!.exigencia.consumoMateriaSeca, 1e-9);
      perto(a[i]!.exigencia.ndtKg, b[i]!.exigencia.ndtKg, 1e-9);
    }
    // E o crescimento de duas etapas termina onde a virada manda, não onde o
    // período calharia de cair.
    perto(duas.periodos.filter((p) => p.etapa === "crescimento").at(-1)!.pesoFinal, 340, 1e-6);
  });

  it("etapa única devolve um resumo só", () => {
    const r = projetar(loteBase(), selecao);
    const resumos = resumosPorEtapa(r);
    expect(resumos).toHaveLength(1);
    expect(resumos[0]!.etapa).toBe("crescimento");
    expect(temDuasEtapas(r)).toBe(false);
    perto(resumos[0]!.dias, r.diasTotais, 0.01);
  });

  it("lote que já passou do peso de virada faz o ciclo inteiro em engorda", () => {
    const r = projetar(loteDuasEtapas({ pesoMedioInicial: 360 }), selecao, silagem);
    const resumos = resumosPorEtapa(r);

    expect(resumos).toHaveLength(1);
    expect(resumos[0]!.etapa).toBe("engorda");
    perto(r.diasTotais, (440 - 360) / 1.2, 0.01);
    expect(r.totais.map((c) => c.insumo.nome)).toContain("Silagem de milho");
  });

  it("sem meta de ganho na engorda, avisa em vez de projetar errado", () => {
    const r = projetar(
      loteDuasEtapas({ engorda: { ganhoMetaDiario: 0, restricoes: { volumosoMinimo: 0.25, volumosoMaximo: 0.55, mineralGramasDia: 120 } } }),
      selecao,
    );
    expect(r.periodos).toHaveLength(0);
    expect(r.alertas[0]).toContain("meta de ganho da engorda");
  });
});

describe("plano automático pela fase do lote", () => {
  it("desmama, recria inicial e recria final ganham as duas dietas", () => {
    for (const fase of ["desmama", "recriaInicial", "recriaFinal"] as const) {
      const lote = criarLote({ fase });
      expect(lote.planoEtapas).toBe("automatico");
      expect(planoResolvido(lote)).toBe("duas");
    }
  });

  it("lote adulto em terminação só tem engorda", () => {
    const lote = criarLote({ fase: "terminacao" });
    expect(planoResolvido(lote)).toBe("soEngorda");
    expect(etapaNoPeso(lote, 260)).toBe("engorda");
    expect(etapaNoPeso(lote, 460)).toBe("engorda");
    expect(trocaDentroDoCiclo(lote)).toBe(false);
  });

  it("no automático, a virada da recria acontece no peso de troca", () => {
    const lote = loteBase({
      planoEtapas: "automatico",
      pesoTrocaEtapa: 340,
      engorda: {
        ganhoMetaDiario: 1.2,
        restricoes: { volumosoMinimo: 0.25, volumosoMaximo: 0.55, mineralGramasDia: 120 },
      },
    });
    expect(trocaDentroDoCiclo(lote)).toBe(true);
    expect(etapaNoPeso(lote, 339)).toBe("crescimento");
    expect(etapaNoPeso(lote, 340)).toBe("engorda");
    expect(temDuasEtapas(projetar(lote, selecao, silagem))).toBe(true);
  });

  it("no ciclo só de engorda, a meta que vale é a do campo do lote", () => {
    const lote = loteBase({
      planoEtapas: "automatico",
      fase: "terminacao",
      pesoMedioInicial: 360,
      pesoTrocaEtapa: 400,
      engorda: {
        ganhoMetaDiario: 1.2,
        restricoes: { volumosoMinimo: 0.25, volumosoMaximo: 0.55, mineralGramasDia: 120 },
      },
    });
    const relatorio = projetar(lote, selecao, silagem);
    expect(temDuasEtapas(relatorio)).toBe(false);
    // Sem segunda etapa não existe campo "Ganho na engorda" na tela: quem
    // manda é a meta do lote, e o 1,2 guardado na engorda fica dormindo.
    expect(ganhoMetaAtual(lote)).toBe(0.7);
    for (const p of relatorio.periodos) expect(p.etapa).toBe("engorda");
  });

  it("o ciclo só de engorda mantém os limites de volumoso da terminação", () => {
    const lote = loteBase({ planoEtapas: "soEngorda" });
    const dieta = dietaDaEtapa(lote, etapaNoPeso(lote, 300));
    perto(dieta.restricoes.volumosoMinimo, 0.25);
    perto(dieta.restricoes.volumosoMaximo, 0.55);
    perto(dieta.restricoes.mineralGramasDia, 120);
    // E os alimentos continuam sendo os do cadastro, que é o que o usuário vê.
    expect(dieta.volumosoID).toBe(lote.volumosoID);
    expect(dieta.energeticoID).toBe(lote.energeticoID);
  });

  it("escolher o plano na mão manda mais que a fase", () => {
    expect(planoResolvido(criarLote({ fase: "terminacao", planoEtapas: "duas" }))).toBe("duas");
    expect(planoResolvido(criarLote({ fase: "desmama", planoEtapas: "soEngorda" }))).toBe(
      "soEngorda",
    );
    expect(planoResolvido(criarLote({ fase: "desmama", planoEtapas: "soCrescimento" }))).toBe(
      "soCrescimento",
    );
  });
});

describe("compatibilidade do arquivo", () => {
  it("backup antigo abre com a segunda etapa desligada", () => {
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

    const lote = desserializar(antigo).lotes[0]!;
    expect(lote.planoEtapas).toBe("soCrescimento");
    expect(lote.pesoTrocaEtapa).toBe(330);
    expect(lote.engorda.ganhoMetaDiario).toBe(1.1);
    expect(lote.engorda.restricoes.volumosoMaximo).toBe(0.55);
    expect(etapaNoPeso(lote, 400)).toBe("crescimento");
  });
});

describe("relatório em texto", () => {
  it("lista as duas etapas e o que cada uma consome", () => {
    const texto = gerar(projetar(loteDuasEtapas(), selecao, silagem));

    expect(texto).toContain("ETAPAS DA DIETA");
    expect(texto).toContain("Crescimento:");
    expect(texto).toContain("Engorda:");
    expect(texto).toContain("Silagem de milho");
    // E o bloco do ciclo completo continua lá, com os dois volumosos somados.
    expect(texto).toContain("INSUMOS DO CICLO COMPLETO");
  });

  it("omite o bloco quando o ciclo tem uma etapa só", () => {
    expect(gerar(projetar(loteBase(), selecao))).not.toContain("ETAPAS DA DIETA");
  });
});
