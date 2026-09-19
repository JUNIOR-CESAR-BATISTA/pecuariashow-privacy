/**
 * Calcula quanto de cada alimento entra na ração diária.
 *
 * Porte de `Core/Calculo/FormuladorRacao.swift`, do antigo aplicativo de iPhone.
 *
 * No modo automático resolve o sistema linear de três equações (matéria seca
 * total, proteína bruta e NDT) com três alimentos. Quando a solução exige uma
 * proporção de volumoso fora dos limites de manejo, o volumoso é fixado no
 * limite e o concentrado passa a atender a proteína, sobrando ou faltando
 * energia - diferença sempre reportada.
 */
import { gramas, kg as formatarKg, percentual } from "./formatadores.js";
import { materiaSecaDe, materiaNatural, precoPorKg, type Insumo } from "./insumo.js";
import type { ExigenciaDiaria } from "./motorExigencias.js";

export interface SelecaoInsumos {
  volumoso: Insumo;
  /**
   * Ausentes no sistema de pasto: sem concentrado no cocho, a dieta é só
   * volumoso e mineral, e o NDT e a PB que ela entrega saem só do pasto.
   */
  energetico?: Insumo;
  proteico?: Insumo;
  mineral?: Insumo;
}

export interface RestricoesFormulacao {
  /** Participação mínima de volumoso na matéria seca (fração de 0 a 1). */
  volumosoMinimo: number;
  /** Participação máxima de volumoso na matéria seca (fração de 0 a 1). */
  volumosoMaximo: number;
  /** Consumo diário de mineral por animal, em gramas de matéria natural. */
  mineralGramasDia: number;
  /** Quando definido, fixa a participação do volumoso em vez de calculá-la. */
  volumosoFixo?: number;
}

export const RESTRICOES_PADRAO: RestricoesFormulacao = {
  volumosoMinimo: 0.3,
  volumosoMaximo: 0.95,
  mineralGramasDia: 100,
};

export interface ItemRacao {
  insumo: Insumo;
  kgMateriaSeca: number;
}

export type StatusFormulacao = "balanceada" | "restrita" | "invalida";

export const NOME_STATUS: Record<StatusFormulacao, string> = {
  balanceada: "Balanceada",
  restrita: "Ajustada aos limites",
  invalida: "Não foi possível formular",
};

export interface ComposicaoRacao {
  itens: ItemRacao[];
  status: StatusFormulacao;
  alertas: string[];
  /** Exigências que serviram de alvo. */
  proteinaExigidaKg: number;
  ndtExigidoKg: number;
}

// --------------------------------------------------- leituras da composição

export const itemMateriaNatural = (i: ItemRacao) => materiaNatural(i.insumo, i.kgMateriaSeca);
export const itemProteinaKg = (i: ItemRacao) => (i.kgMateriaSeca * i.insumo.proteinaBruta) / 100;
export const itemNdtKg = (i: ItemRacao) => (i.kgMateriaSeca * i.insumo.ndt) / 100;
export const itemCustoDiario = (i: ItemRacao) => itemMateriaNatural(i) * precoPorKg(i.insumo);

const somar = (itens: ItemRacao[], leitura: (i: ItemRacao) => number) =>
  itens.reduce((total, item) => total + leitura(item), 0);

export const consumoMateriaSeca = (c: ComposicaoRacao) => somar(c.itens, (i) => i.kgMateriaSeca);
export const totalMateriaNatural = (c: ComposicaoRacao) => somar(c.itens, itemMateriaNatural);
export const proteinaFornecidaKg = (c: ComposicaoRacao) => somar(c.itens, itemProteinaKg);
export const ndtFornecidoKg = (c: ComposicaoRacao) => somar(c.itens, itemNdtKg);
export const custoDiario = (c: ComposicaoRacao) => somar(c.itens, itemCustoDiario);

export const balancoProteina = (c: ComposicaoRacao) => proteinaFornecidaKg(c) - c.proteinaExigidaKg;
export const balancoNDT = (c: ComposicaoRacao) => ndtFornecidoKg(c) - c.ndtExigidoKg;

export function proteinaPercentual(c: ComposicaoRacao): number {
  const ms = consumoMateriaSeca(c);
  return ms > 0 ? (proteinaFornecidaKg(c) / ms) * 100 : 0;
}

export function ndtPercentual(c: ComposicaoRacao): number {
  const ms = consumoMateriaSeca(c);
  return ms > 0 ? (ndtFornecidoKg(c) / ms) * 100 : 0;
}

export const massaVolumoso = (c: ComposicaoRacao) =>
  somar(
    c.itens.filter((i) => i.insumo.categoria === "volumoso"),
    (i) => i.kgMateriaSeca,
  );

export const massaConcentrado = (c: ComposicaoRacao) =>
  somar(
    c.itens.filter((i) => i.insumo.categoria === "energetico" || i.insumo.categoria === "proteico"),
    (i) => i.kgMateriaSeca,
  );

export function percentualVolumoso(c: ComposicaoRacao): number {
  const ms = consumoMateriaSeca(c);
  return ms > 0 ? (massaVolumoso(c) / ms) * 100 : 0;
}

export function percentualConcentrado(c: ComposicaoRacao): number {
  const ms = consumoMateriaSeca(c);
  return ms > 0 ? (massaConcentrado(c) / ms) * 100 : 0;
}

/** Participação de um item na matéria seca total (%). */
export function participacaoMS(c: ComposicaoRacao, item: ItemRacao): number {
  const ms = consumoMateriaSeca(c);
  return ms > 0 ? (item.kgMateriaSeca / ms) * 100 : 0;
}

export function composicaoVazia(): ComposicaoRacao {
  return {
    itens: [],
    status: "invalida",
    alertas: ["Selecione os insumos da ração."],
    proteinaExigidaKg: 0,
    ndtExigidoKg: 0,
  };
}

// ------------------------------------------------------------------- apoio

const PARTICIPACAO_VOLUMOSO_PADRAO = 0.6;

interface Solucao {
  volumoso: number;
  energetico: number;
  proteico: number;
}

/** Eliminação de Gauss-Jordan com pivoteamento parcial para sistemas 3x3. */
export function gaussJordan(entrada: readonly (readonly number[])[]): number[] | null {
  const n = 3;
  if (entrada.length !== n || !entrada.every((linha) => linha.length === n + 1)) return null;
  const m = entrada.map((linha) => [...linha]);

  for (let coluna = 0; coluna < n; coluna += 1) {
    let pivo = coluna;
    for (let linha = coluna + 1; linha < n; linha += 1) {
      if (Math.abs(m[linha]![coluna]!) > Math.abs(m[pivo]![coluna]!)) pivo = linha;
    }
    if (Math.abs(m[pivo]![coluna]!) <= 1e-9) return null;
    [m[coluna], m[pivo]] = [m[pivo]!, m[coluna]!];

    for (let linha = 0; linha < n; linha += 1) {
      if (linha === coluna) continue;
      const fator = m[linha]![coluna]! / m[coluna]![coluna]!;
      if (fator === 0) continue;
      for (let k = coluna; k <= n; k += 1) {
        m[linha]![k]! -= fator * m[coluna]![k]!;
      }
    }
  }

  const resultado = Array.from({ length: n }, (_, i) => m[i]![n]! / m[i]![i]!);
  return resultado.every((v) => Number.isFinite(v)) ? resultado : null;
}

/** Resolve o sistema 3x3: matéria seca, proteína bruta e NDT. */
function resolverSistema(
  disponivel: number,
  proteinaAlvo: number,
  ndtAlvo: number,
  volumoso: Insumo,
  energetico: Insumo,
  proteico: Insumo,
): Solucao | null {
  const x = gaussJordan([
    [1, 1, 1, disponivel],
    [
      volumoso.proteinaBruta / 100,
      energetico.proteinaBruta / 100,
      proteico.proteinaBruta / 100,
      proteinaAlvo,
    ],
    [volumoso.ndt / 100, energetico.ndt / 100, proteico.ndt / 100, ndtAlvo],
  ]);
  if (!x) return null;
  return { volumoso: x[0]!, energetico: x[1]!, proteico: x[2]! };
}

/** Junta quantidades do mesmo alimento para não repetir linhas na ração. */
export function consolidar(candidatos: readonly (readonly [Insumo, number])[]): ItemRacao[] {
  const ordem: string[] = [];
  const somas = new Map<string, number>();
  const insumos = new Map<string, Insumo>();

  for (const [insumo, kg] of candidatos) {
    if (kg <= 1e-6) continue;
    if (!somas.has(insumo.id)) {
      ordem.push(insumo.id);
      insumos.set(insumo.id, insumo);
    }
    somas.set(insumo.id, (somas.get(insumo.id) ?? 0) + kg);
  }

  return ordem.flatMap((id) => {
    const insumo = insumos.get(id);
    const kg = somas.get(id);
    if (!insumo || kg === undefined) return [];
    return [{ insumo, kgMateriaSeca: kg }];
  });
}

function avisosDeBalanco(c: ComposicaoRacao): string[] {
  const avisos: string[] = [];
  const tolerancia = 0.02;

  if (c.proteinaExigidaKg > 0) {
    const balanco = balancoProteina(c);
    const desvio = balanco / c.proteinaExigidaKg;
    if (desvio < -tolerancia) {
      avisos.push(
        `Faltam ${gramas(Math.abs(balanco) * 1000)} de proteína bruta por animal por dia.`,
      );
    } else if (desvio > tolerancia) {
      avisos.push(`Sobram ${gramas(balanco * 1000)} de proteína bruta por animal por dia.`);
    }
  }

  if (c.ndtExigidoKg > 0) {
    const balanco = balancoNDT(c);
    const desvio = balanco / c.ndtExigidoKg;
    if (desvio < -tolerancia) {
      avisos.push(
        `Faltam ${formatarKg(Math.abs(balanco))} de NDT por animal por dia; ` +
          "o ganho tende a ficar abaixo da meta.",
      );
    } else if (desvio > tolerancia) {
      avisos.push(
        `Sobram ${formatarKg(balanco)} de NDT por animal por dia; ` +
          "o ganho tende a superar a meta.",
      );
    }
  }

  return avisos;
}

// --------------------------------------------------------- cálculo principal

export function formular(
  exigencia: ExigenciaDiaria,
  selecao: SelecaoInsumos,
  restricoes: RestricoesFormulacao = RESTRICOES_PADRAO,
): ComposicaoRacao {
  const alertas: string[] = [];
  const consumoTotal = exigencia.consumoMateriaSeca;
  if (!(consumoTotal > 0)) return composicaoVazia();

  // O mineral entra com quantidade fixa e não participa do balanceamento.
  let mineralMS = 0;
  if (selecao.mineral && restricoes.mineralGramasDia > 0) {
    mineralMS = materiaSecaDe(selecao.mineral, restricoes.mineralGramasDia / 1000);
  }

  const disponivel = consumoTotal - mineralMS;
  if (!(disponivel > 0.01)) {
    return {
      itens: [],
      status: "invalida",
      alertas: ["Consumo de matéria seca insuficiente para formular."],
      proteinaExigidaKg: exigencia.proteinaBrutaKg,
      ndtExigidoKg: exigencia.ndtKg,
    };
  }

  const { volumoso, energetico, proteico } = selecao;

  if (!energetico || !proteico) {
    // Sistema de pasto: sem concentrado no cocho. Toda a matéria seca que
    // sobra do mineral é pasto - o NDT e a PB da dieta saem só dele, e não
    // de um alvo perseguido com concentrado que esta dieta não tem.
    const candidatos: [Insumo, number][] = [[volumoso, disponivel]];
    if (selecao.mineral && mineralMS > 0) candidatos.push([selecao.mineral, mineralMS]);
    const composicao: ComposicaoRacao = {
      itens: consolidar(candidatos),
      status: "restrita",
      alertas: [],
      proteinaExigidaKg: exigencia.proteinaBrutaKg,
      ndtExigidoKg: exigencia.ndtKg,
    };
    composicao.alertas = avisosDeBalanco(composicao);
    return composicao;
  }

  let status: StatusFormulacao = "balanceada";
  let kgVolumoso = 0;
  let kgEnergetico = 0;
  let kgProteico = 0;

  const limiteMin = Math.min(Math.max(restricoes.volumosoMinimo, 0), 1) * disponivel;
  const limiteMax = Math.min(Math.max(restricoes.volumosoMaximo, 0), 1) * disponivel;

  if (restricoes.volumosoFixo !== undefined) {
    kgVolumoso = Math.min(Math.max(restricoes.volumosoFixo, 0), 1) * disponivel;
    status = "restrita";
  } else {
    const solucao = resolverSistema(
      disponivel,
      exigencia.proteinaBrutaKg,
      exigencia.ndtKg,
      volumoso,
      energetico,
      proteico,
    );

    if (!solucao) {
      kgVolumoso = Math.min(
        Math.max(disponivel * PARTICIPACAO_VOLUMOSO_PADRAO, limiteMin),
        limiteMax,
      );
      status = "restrita";
      alertas.push(
        "Os teores dos alimentos escolhidos são muito parecidos para um balanceamento exato.",
      );
    } else if (solucao.volumoso < limiteMin - 1e-6) {
      kgVolumoso = limiteMin;
      status = "restrita";
      alertas.push(
        `O balanceamento pediu menos volumoso que o mínimo de ` +
          `${percentual(restricoes.volumosoMinimo * 100, 0)}; a dieta foi ajustada ao limite.`,
      );
    } else if (solucao.volumoso > limiteMax + 1e-6) {
      kgVolumoso = limiteMax;
      status = "restrita";
      alertas.push(
        `O balanceamento pediu mais volumoso que o máximo de ` +
          `${percentual(restricoes.volumosoMaximo * 100, 0)}; a dieta foi ajustada ao limite.`,
      );
    } else if (solucao.energetico < -1e-6 || solucao.proteico < -1e-6) {
      // Um dos concentrados ficaria negativo: mantém o volumoso da solução e
      // deixa o ajuste de proteína resolver o restante.
      kgVolumoso = Math.min(Math.max(solucao.volumoso, limiteMin), limiteMax);
      status = "restrita";
      alertas.push(
        "Os alimentos escolhidos não permitem atingir PB e NDT ao mesmo tempo. " +
          "Confira o balanço abaixo.",
      );
    } else {
      kgVolumoso = solucao.volumoso;
      kgEnergetico = solucao.energetico;
      kgProteico = solucao.proteico;
    }
  }

  if (status === "restrita") {
    // Com o volumoso fixado, ajusta energético e proteico pela proteína.
    const restante = Math.max(0, disponivel - kgVolumoso);
    const proteinaVolumoso = (kgVolumoso * volumoso.proteinaBruta) / 100;
    const faltaProteina = exigencia.proteinaBrutaKg - proteinaVolumoso;
    const diferencaTeor = (proteico.proteinaBruta - energetico.proteinaBruta) / 100;

    if (Math.abs(diferencaTeor) > 1e-6) {
      const bruto = (faltaProteina - (restante * energetico.proteinaBruta) / 100) / diferencaTeor;
      kgProteico = Math.min(Math.max(bruto, 0), restante);
    } else {
      kgProteico = restante / 2;
    }
    kgEnergetico = Math.max(0, restante - kgProteico);
  }

  const candidatos: [Insumo, number][] = [
    [volumoso, kgVolumoso],
    [energetico, kgEnergetico],
    [proteico, kgProteico],
  ];
  if (selecao.mineral && mineralMS > 0) candidatos.push([selecao.mineral, mineralMS]);

  const composicao: ComposicaoRacao = {
    itens: consolidar(candidatos),
    status,
    alertas,
    proteinaExigidaKg: exigencia.proteinaBrutaKg,
    ndtExigidoKg: exigencia.ndtKg,
  };
  composicao.alertas = [...composicao.alertas, ...avisosDeBalanco(composicao)];
  return composicao;
}

/**
 * Monta a composição a partir de quantidades informadas manualmente, em
 * quilos de matéria natural por animal por dia.
 */
export function avaliar(
  quantidades: readonly { insumo: Insumo; kgMateriaNatural: number }[],
  exigencia: ExigenciaDiaria,
): ComposicaoRacao {
  const itens = consolidar(
    quantidades.map(
      (q) => [q.insumo, materiaSecaDe(q.insumo, q.kgMateriaNatural)] as [Insumo, number],
    ),
  );
  const composicao: ComposicaoRacao = {
    itens,
    status: itens.length === 0 ? "invalida" : "restrita",
    alertas: [],
    proteinaExigidaKg: exigencia.proteinaBrutaKg,
    ndtExigidoKg: exigencia.ndtKg,
  };
  composicao.alertas = avisosDeBalanco(composicao);
  return composicao;
}
