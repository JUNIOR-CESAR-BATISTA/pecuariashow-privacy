/**
 * Lê os ciclos encerrados e transforma em calibração e recomendações.
 *
 * Porte de `Core/Calculo/AnalisadorHistorico.swift`. É o que faz a fazenda
 * aprender com ela mesma: cada lote abatido corrige a previsão do próximo.
 */
import { GRUPOS, faseSugerida, type CategoriaInsumo } from "./classificacoes.js";
import {
  aderenciaConcentrado,
  aderenciaGanho,
  animaisPerdidos,
  arrobasProduzidasLote,
  desvioCusto,
  diasPlanejados,
  diasReais,
  ganhoRealDiario,
  ganhoTotalLote,
  pesoMedioCiclo,
  rendimentoReal,
  type CicloEncerrado,
} from "./cicloEncerrado.js";
import { moeda, numero, percentual } from "./formatadores.js";
import { ganhoPorEnergia, perfilAnimal } from "./motorExigencias.js";

// -------------------------------------------------------------- confiança

export type Confianca = "indicativa" | "moderada" | "consistente";

export const DADOS_CONFIANCA: Record<Confianca, { nome: string; explicacao: string }> = {
  indicativa: {
    nome: "Indicativa",
    explicacao: "Base de 1 ciclo. Serve de indício, ainda não de regra.",
  },
  moderada: {
    nome: "Moderada",
    explicacao: "Base de 2 a 3 ciclos. Já mostra tendência.",
  },
  consistente: {
    nome: "Consistente",
    explicacao: "Base de 4 ciclos ou mais. Padrão bem estabelecido da fazenda.",
  },
};

export function confiancaPara(ciclos: number): Confianca {
  if (ciclos < 2) return "indicativa";
  if (ciclos <= 3) return "moderada";
  return "consistente";
}

// ------------------------------------------------------------- calibração

export interface FatoresCalibracao {
  /** Multiplicador do consumo previsto que explica o ganho observado. */
  ajusteConsumo: number;
  rendimentoCarcaca: number;
  pesoAcabamento: number;
  ganhoRealMedio: number;
  aderenciaGanhoMedia: number;
  ciclos: number;
}

export const FATORES_VAZIOS: FatoresCalibracao = {
  ajusteConsumo: 1.0,
  rendimentoCarcaca: 0.53,
  pesoAcabamento: 430,
  ganhoRealMedio: 0,
  aderenciaGanhoMedia: 0,
  ciclos: 0,
};

export const confiancaDosFatores = (f: FatoresCalibracao) => confiancaPara(f.ciclos);
export const calibracaoDisponivel = (f: FatoresCalibracao) => f.ciclos > 0;

// ----------------------------------------------------------- por alimento

export interface DesempenhoInsumo {
  nome: string;
  categoria: CategoriaInsumo;
  ciclos: number;
  aderenciaGanho: number;
  ganhoDiario: number;
  custoPorArroba: number | null;
  arrobasProduzidas: number;
}

// --------------------------------------------------------- recomendações

export type Severidade = "bom" | "atencao" | "critico";

export const NOME_SEVERIDADE: Record<Severidade, string> = {
  bom: "No rumo",
  atencao: "Atenção",
  critico: "Corrigir",
};

export interface Recomendacao {
  id: string;
  titulo: string;
  detalhe: string;
  severidade: Severidade;
  simbolo: string;
}

function recomendacao(
  titulo: string,
  detalhe: string,
  severidade: Severidade,
  simbolo: string,
): Recomendacao {
  return { id: crypto.randomUUID(), titulo, detalhe, severidade, simbolo };
}

// -------------------------------------------------------------- a análise

export interface AnaliseHistorica {
  ciclos: CicloEncerrado[];
  fatores: FatoresCalibracao;
  porProteico: DesempenhoInsumo[];
  porEnergetico: DesempenhoInsumo[];
  porVolumoso: DesempenhoInsumo[];
  recomendacoes: Recomendacao[];
}

export const ANALISE_VAZIA: AnaliseHistorica = {
  ciclos: [],
  fatores: FATORES_VAZIOS,
  porProteico: [],
  porEnergetico: [],
  porVolumoso: [],
  recomendacoes: [],
};

export const temHistorico = (a: AnaliseHistorica) => a.ciclos.length > 0;
export const totalCiclos = (a: AnaliseHistorica) => a.ciclos.length;
export const totalAnimais = (a: AnaliseHistorica) =>
  a.ciclos.reduce((t, c) => t + c.animaisAbatidos, 0);
export const totalArrobas = (a: AnaliseHistorica) =>
  a.ciclos.reduce((t, c) => t + arrobasProduzidasLote(c), 0);
export const totalGanho = (a: AnaliseHistorica) =>
  a.ciclos.reduce((t, c) => t + ganhoTotalLote(c), 0);
export const custoTotal = (a: AnaliseHistorica) => a.ciclos.reduce((t, c) => t + c.custoReal, 0);
export const ganhoRealMedio = (a: AnaliseHistorica) => a.fatores.ganhoRealMedio;

export function custoMedioPorArroba(a: AnaliseHistorica): number | null {
  const comCusto = a.ciclos.filter((c) => c.custoReal > 0);
  const arrobas = comCusto.reduce((t, c) => t + arrobasProduzidasLote(c), 0);
  if (!(arrobas > 0)) return null;
  return comCusto.reduce((t, c) => t + c.custoReal, 0) / arrobas;
}

export function diasMedios(a: AnaliseHistorica): number {
  if (a.ciclos.length === 0) return 0;
  return a.ciclos.reduce((t, c) => t + diasReais(c), 0) / a.ciclos.length;
}

// ------------------------------------------------------- fator de consumo

/**
 * Multiplicador de consumo que, no modelo, produziria o ganho observado.
 *
 * Mantidos os teores informados da dieta, procura o fator que faz a previsão
 * bater com o que a balança mostrou. Abaixo de 1,0 significa que a fazenda
 * entregou menos do que o papel prometia.
 */
export function fatorConsumo(ciclo: CicloEncerrado): number | null {
  const ganhoObservado = ganhoRealDiario(ciclo);
  if (!(ganhoObservado > 0) || !(ciclo.consumoPrevistoDiario > 0) || !(ciclo.ndtDietaMedia > 0)) {
    return null;
  }

  const pesoMedio = pesoMedioCiclo(ciclo);
  const perfil = perfilAnimal({
    pesoVivo: pesoMedio,
    fase: faseSugerida(pesoMedio),
    grupoGenetico: ciclo.grupoGenetico,
    sistema: ciclo.sistema,
    pesoFinal: ciclo.pesoAcabamentoPlanejado,
  });

  const ganho = (fator: number) => {
    const consumo = fator * ciclo.consumoPrevistoDiario;
    return ganhoPorEnergia(perfil, consumo, (consumo * ciclo.ndtDietaMedia) / 100);
  };

  const minimo = 0.5;
  const maximo = 1.6;
  if (ganho(minimo) >= ganhoObservado) return minimo;
  if (ganho(maximo) <= ganhoObservado) return maximo;

  let baixo = minimo;
  let alto = maximo;
  for (let i = 0; i < 60; i += 1) {
    const meio = (baixo + alto) / 2;
    if (ganho(meio) < ganhoObservado) baixo = meio;
    else alto = meio;
  }
  return (baixo + alto) / 2;
}

/**
 * Combina os ciclos em um único conjunto de parâmetros, dando mais peso aos
 * ciclos com mais animais e mais dias.
 */
export function calibrar(ciclos: readonly CicloEncerrado[]): FatoresCalibracao {
  if (ciclos.length === 0) return FATORES_VAZIOS;

  let somaPesos = 0;
  let somaFator = 0;
  let somaGanho = 0;
  let somaAderencia = 0;
  let somaPesoFinal = 0;
  let somaRendimento = 0;
  let pesosRendimento = 0;

  for (const ciclo of ciclos) {
    const peso = Math.max(1, ciclo.animaisAbatidos) * Math.max(1, diasReais(ciclo));
    somaPesos += peso;
    somaFator += (fatorConsumo(ciclo) ?? 1.0) * peso;
    somaGanho += ganhoRealDiario(ciclo) * peso;
    somaAderencia += aderenciaGanho(ciclo) * peso;
    somaPesoFinal += ciclo.pesoFinalReal * peso;

    const rendimento = rendimentoReal(ciclo);
    if (rendimento !== null) {
      somaRendimento += rendimento * peso;
      pesosRendimento += peso;
    }
  }

  const rendimento =
    pesosRendimento > 0
      ? somaRendimento / pesosRendimento
      : (ciclos[0] ? GRUPOS[ciclos[0].grupoGenetico].rendimentoCarcacaSugerido : 0.53);

  return {
    ajusteConsumo: Math.min(Math.max(somaFator / somaPesos, 0.7), 1.3),
    rendimentoCarcaca: Math.min(Math.max(rendimento, 0.4), 0.62),
    pesoAcabamento: Math.max(250, somaPesoFinal / somaPesos),
    ganhoRealMedio: somaGanho / somaPesos,
    aderenciaGanhoMedia: somaAderencia / somaPesos,
    ciclos: ciclos.length,
  };
}

// ------------------------------------------------------ ranking por alimento

export function desempenho(
  ciclos: readonly CicloEncerrado[],
  categoria: CategoriaInsumo,
): DesempenhoInsumo[] {
  const nomeDoCiclo = (c: CicloEncerrado) => {
    if (categoria === "proteico") return c.proteicoNome;
    if (categoria === "energetico") return c.energeticoNome;
    return c.volumosoNome;
  };

  const ordem: string[] = [];
  const grupos = new Map<string, CicloEncerrado[]>();

  for (const ciclo of ciclos) {
    const chave = nomeDoCiclo(ciclo).trim();
    if (chave === "") continue;
    if (!grupos.has(chave)) {
      ordem.push(chave);
      grupos.set(chave, []);
    }
    grupos.get(chave)!.push(ciclo);
  }

  const lista = ordem.flatMap((chave): DesempenhoInsumo[] => {
    const doGrupo = grupos.get(chave);
    if (!doGrupo || doGrupo.length === 0) return [];

    const n = doGrupo.length;
    const comCusto = doGrupo.filter((c) => c.custoReal > 0);
    const arrobasComCusto = comCusto.reduce((t, c) => t + arrobasProduzidasLote(c), 0);

    return [
      {
        nome: chave,
        categoria,
        ciclos: n,
        aderenciaGanho: doGrupo.reduce((t, c) => t + aderenciaGanho(c), 0) / n,
        ganhoDiario: doGrupo.reduce((t, c) => t + ganhoRealDiario(c), 0) / n,
        custoPorArroba:
          arrobasComCusto > 0
            ? comCusto.reduce((t, c) => t + c.custoReal, 0) / arrobasComCusto
            : null,
        arrobasProduzidas: doGrupo.reduce((t, c) => t + arrobasProduzidasLote(c), 0),
      },
    ];
  });

  return lista.sort((a, b) => b.aderenciaGanho - a.aderenciaGanho);
}

// --------------------------------------------------------- recomendações

export function recomendacoes(
  ciclos: readonly CicloEncerrado[],
  fatores: FatoresCalibracao,
  proteicos: readonly DesempenhoInsumo[],
): Recomendacao[] {
  if (ciclos.length === 0) return [];
  const lista: Recomendacao[] = [];

  // 1. Ganho contra a meta, cruzado com o fornecimento de concentrado.
  const aderencia = fatores.aderenciaGanhoMedia;
  const concentrados = ciclos
    .map((c) => aderenciaConcentrado(c))
    .filter((v): v is number => v !== null);
  const aderenciaConc =
    concentrados.length === 0
      ? null
      : concentrados.reduce((t, v) => t + v, 0) / concentrados.length;

  if (aderencia < 0.9) {
    if (aderenciaConc !== null && aderenciaConc < 0.92) {
      lista.push(
        recomendacao(
          "Faltou concentrado no cocho",
          `O ganho ficou ${percentual((1 - aderencia) * 100, 0)} abaixo da meta e só ` +
            `${percentual(aderenciaConc * 100, 0)} do concentrado planejado foi fornecido. ` +
            "Antes de mexer na formulação, feche o fornecimento: a dieta no papel estava certa.",
          "critico",
          "tray.and.arrow.down",
        ),
      );
    } else {
      lista.push(
        recomendacao(
          "Dieta entregou menos do que prometia",
          "O concentrado foi fornecido como planejado, mas o ganho ficou " +
            `${percentual((1 - aderencia) * 100, 0)} abaixo da meta. O caminho é rever os ` +
            "teores dos alimentos, principalmente o NDT e a PB do volumoso, com análise " +
            `bromatológica. O aplicativo já reduziu o consumo previsto para ` +
            `${numero(fatores.ajusteConsumo, 2)}x nos próximos lotes.`,
          "critico",
          "chart.line.downtrend.xyaxis",
        ),
      );
    }
  } else if (aderencia > 1.1) {
    lista.push(
      recomendacao(
        "Sobrou dieta",
        `O ganho ficou ${percentual((aderencia - 1) * 100, 0)} acima da meta. Dá para elevar ` +
          "a meta dos próximos lotes ou reduzir o concentrado e baixar o custo por arroba.",
        "atencao",
        "arrow.down.circle",
      ),
    );
  } else {
    lista.push(
      recomendacao(
        "Ganho dentro do planejado",
        `A média observada foi de ${numero(fatores.ganhoRealMedio, 3)} kg/dia, ` +
          `${percentual(aderencia * 100, 0)} da meta. Mantenha o manejo e a formulação.`,
        "bom",
        "checkmark.seal",
      ),
    );
  }

  // 2. Comparação entre proteicos: onde reforçar e onde economizar.
  const comparaveis = proteicos.filter((p) => p.ciclos >= 1);
  const melhor = comparaveis[0];
  const pior = comparaveis[comparaveis.length - 1];

  if (comparaveis.length >= 2 && melhor && pior && melhor.nome !== pior.nome) {
    const diferenca = (melhor.aderenciaGanho - pior.aderenciaGanho) * 100;
    let detalhe =
      `Com ${melhor.nome} o ganho ficou ${numero(diferenca, 0)} pontos percentuais mais ` +
      `perto da meta do que com ${pior.nome} (${numero(melhor.ganhoDiario, 3)} contra ` +
      `${numero(pior.ganhoDiario, 3)} kg/dia).`;

    if (melhor.custoPorArroba !== null && pior.custoPorArroba !== null) {
      if (melhor.custoPorArroba <= pior.custoPorArroba) {
        detalhe +=
          ` E ainda saiu mais barato: ${moeda(melhor.custoPorArroba)} contra ` +
          `${moeda(pior.custoPorArroba)} por arroba. Padronize no ${melhor.nome}.`;
      } else {
        detalhe +=
          ` Custa mais caro, ${moeda(melhor.custoPorArroba)} contra ` +
          `${moeda(pior.custoPorArroba)} por arroba: use ${melhor.nome} quando quiser ` +
          `encurtar o ciclo e ${pior.nome} quando o preço da arroba estiver apertado.`;
      }
    }

    lista.push(
      recomendacao(`Proteico: ${melhor.nome} rendeu mais`, detalhe, "atencao", "arrow.up.arrow.down"),
    );
  } else if (melhor) {
    if (melhor.aderenciaGanho < 0.95) {
      lista.push(
        recomendacao(
          "Reforce a fonte proteica",
          `Todos os ciclos usaram ${melhor.nome} e o ganho ficou abaixo da meta. Vale ` +
            "aumentar a participação do proteico na ração ou testar outra fonte no próximo " +
            "lote para ter comparação.",
          "atencao",
          "bolt.badge.clock",
        ),
      );
    } else {
      lista.push(
        recomendacao(
          "Sem comparação de proteico ainda",
          `Todos os ciclos usaram ${melhor.nome}, que está entregando ` +
            `${percentual(melhor.aderenciaGanho * 100, 0)} da meta. Registrar um ciclo com ` +
            "outra fonte proteica permitiria comparar custo e desempenho.",
          "bom",
          "questionmark.circle",
        ),
      );
    }
  }

  // 3. Acabamento e rendimento de carcaça.
  const comRendimento = ciclos
    .map((c) => rendimentoReal(c))
    .filter((v): v is number => v !== null);
  const primeiro = ciclos[0]!;

  if (comRendimento.length > 0) {
    const medio = comRendimento.reduce((t, v) => t + v, 0) / comRendimento.length;
    const referencia = GRUPOS[primeiro.grupoGenetico].rendimentoCarcacaSugerido;
    if (medio < referencia - 0.015) {
      lista.push(
        recomendacao(
          "Acabamento aquém do esperado",
          `O rendimento médio de carcaça foi ${percentual(medio * 100)} contra ` +
            `${percentual(referencia * 100)} esperados para ` +
            `${GRUPOS[primeiro.grupoGenetico].nomeCurto.toLowerCase()}. Alongue a terminação ` +
            "ou eleve a densidade energética nos últimos 60 dias.",
          "atencao",
          "scalemass",
        ),
      );
    }
  } else {
    lista.push(
      recomendacao(
        "Registre o peso de carcaça",
        "Sem o peso de carcaça do frigorífico não dá para calcular rendimento, arrobas " +
          "produzidas nem custo por arroba. É o dado que mais falta para fechar a conta.",
        "atencao",
        "doc.badge.plus",
      ),
    );
  }

  // 4. Prazo: ciclo mais longo que o planejado prende pasto e capital.
  const atrasos = ciclos
    .filter((c) => diasPlanejados(c) > 0)
    .map((c) => diasReais(c) / diasPlanejados(c));
  if (atrasos.length > 0) {
    const medio = atrasos.reduce((t, v) => t + v, 0) / atrasos.length;
    if (medio > 1.15) {
      lista.push(
        recomendacao(
          "Ciclo mais longo que o previsto",
          `Os lotes levaram em média ${percentual((medio - 1) * 100, 0)} mais dias que o ` +
            "planejado. Cada dia a mais é pasto ocupado e capital parado: ou a meta de ganho " +
            "precisa ser mais realista, ou o abate precisa acontecer no peso combinado.",
          "atencao",
          "calendar.badge.exclamationmark",
        ),
      );
    }
  }

  // 5. Perda de animais.
  const perdidos = ciclos.reduce((t, c) => t + animaisPerdidos(c), 0);
  const iniciais = ciclos.reduce((t, c) => t + c.animaisIniciais, 0);
  if (perdidos > 0 && iniciais > 0) {
    const taxa = perdidos / iniciais;
    lista.push(
      recomendacao(
        `Perda de ${perdidos} ${perdidos === 1 ? "animal" : "animais"}`,
        `Representa ${percentual(taxa * 100)} do rebanho que entrou nos ciclos. Acima de 2% ` +
          "costuma indicar problema sanitário ou de adaptação à dieta.",
        taxa > 0.02 ? "critico" : "atencao",
        "cross.case",
      ),
    );
  }

  // 6. Custo real contra o previsto.
  const desvios = ciclos.map((c) => desvioCusto(c)).filter((v): v is number => v !== null);
  if (desvios.length > 0) {
    const medio = desvios.reduce((t, v) => t + v, 0) / desvios.length;
    if (medio > 0.1) {
      lista.push(
        recomendacao(
          "Custo estourou o orçamento",
          `O gasto real ficou ${percentual(medio * 100, 0)} acima do previsto. Confira os ` +
            "preços cadastrados dos insumos: se estiverem defasados, todo o planejamento " +
            "seguinte sai errado.",
          "critico",
          "banknote",
        ),
      );
    } else if (medio < -0.1) {
      lista.push(
        recomendacao(
          "Gasto abaixo do previsto",
          `O custo real ficou ${percentual(Math.abs(medio) * 100, 0)} abaixo do planejado. ` +
            "Atualize os preços dos insumos para o planejamento ficar mais fiel.",
          "bom",
          "banknote",
        ),
      );
    }
  }

  return lista;
}

// --------------------------------------------------------- entrada principal

export function analisar(ciclos: readonly CicloEncerrado[]): AnaliseHistorica {
  if (ciclos.length === 0) return ANALISE_VAZIA;

  const ordenados = [...ciclos].sort((a, b) => b.dataAbate.getTime() - a.dataAbate.getTime());
  const fatores = calibrar(ordenados);
  const proteicos = desempenho(ordenados, "proteico");

  return {
    ciclos: ordenados,
    fatores,
    porProteico: proteicos,
    porEnergetico: desempenho(ordenados, "energetico"),
    porVolumoso: desempenho(ordenados, "volumoso"),
    recomendacoes: recomendacoes(ordenados, fatores, proteicos),
  };
}
