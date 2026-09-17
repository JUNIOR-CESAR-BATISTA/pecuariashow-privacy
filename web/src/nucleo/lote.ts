/**
 * Lote de novilhas em semiconfinamento.
 *
 * Porte de `Core/Modelos/Lote.swift`, do antigo aplicativo de iPhone. As
 * datas viajam como texto ISO no
 * arquivo gravado, para o backup continuar legível e para não depender de
 * fuso na leitura; dentro do programa circulam como `Date`.
 */
import {
  faseSugerida,
  type CategoriaAnimal,
  type FaseAnimal,
  type GrupoGenetico,
  type ModoCompra,
  type SistemaCriacao,
} from "./classificacoes.js";
import {
  RESTRICOES_PADRAO,
  type RestricoesFormulacao,
  type SelecaoInsumos,
} from "./formuladorRacao.js";
import type { Insumo } from "./insumo.js";
import { perfilAnimal, type PerfilAnimal } from "./motorExigencias.js";

/** Pesagem registrada do lote (peso médio dos animais). */
export interface Pesagem {
  id: string;
  data: Date;
  pesoMedio: number;
  observacao: string;
}

export function criarPesagem(entrada: { pesoMedio: number; data?: Date; observacao?: string }): Pesagem {
  return {
    id: crypto.randomUUID(),
    data: entrada.data ?? new Date(),
    pesoMedio: entrada.pesoMedio,
    observacao: entrada.observacao ?? "",
  };
}

/**
 * Etapa de dieta dentro de um mesmo ciclo.
 *
 * Não confundir com `FaseAnimal` (desmama, recria, terminação), que é a faixa
 * de peso usada pelas equações do NRC e muda sozinha conforme o animal cresce.
 * A etapa aqui é decisão de manejo: o mesmo lote come uma dieta de
 * crescimento até um peso de virada e uma de engorda daí ao abate, com metas
 * de ganho, alimentos e limites de volumoso diferentes.
 */
export type EtapaDieta = "crescimento" | "engorda";

export const NOME_ETAPA: Record<EtapaDieta, string> = {
  crescimento: "Crescimento",
  engorda: "Engorda",
};

/**
 * Como o ciclo se divide em etapas.
 *
 * `automatico` é a regra de campo: bezerro desmamado, garrote e novilha ainda
 * crescem, então fazem recria e depois engorda; animal que já entra em
 * terminação só tem engorda pela frente. As outras três forçam o plano para
 * quem quiser decidir na mão.
 */
export type PlanoEtapas = "automatico" | "duas" | "soCrescimento" | "soEngorda";

export const NOME_PLANO: Record<PlanoEtapas, string> = {
  automatico: "Automático, pela fase do lote",
  duas: "Crescimento e engorda",
  soCrescimento: "Só crescimento",
  soEngorda: "Só engorda",
};

export const TODOS_OS_PLANOS: readonly PlanoEtapas[] = [
  "automatico",
  "duas",
  "soCrescimento",
  "soEngorda",
];

/** O que muda de uma etapa para a outra. */
export interface DietaEtapa {
  ganhoMetaDiario: number;
  volumosoID?: string;
  energeticoID?: string;
  proteicoID?: string;
  mineralID?: string;
  restricoes: RestricoesFormulacao;
}

/**
 * Limites de volumoso típicos da terminação: menos volumoso e mais
 * concentrado que na recria, que é o que sustenta ganho alto e acabamento.
 */
export const RESTRICOES_ENGORDA: RestricoesFormulacao = {
  volumosoMinimo: 0.25,
  volumosoMaximo: 0.55,
  mineralGramasDia: 120,
};

export interface Lote {
  id: string;
  nome: string;
  quantidadeAnimais: number;
  pesoMedioInicial: number;
  /** Meta de ganho médio diário (kg/dia). */
  ganhoMetaDiario: number;
  fase: FaseAnimal;
  grupoGenetico: GrupoGenetico;
  sistema: SistemaCriacao;
  /** Fêmea, macho castrado ou macho inteiro: muda as equações de energia. */
  categoriaAnimal: CategoriaAnimal;
  dataEntrada: Date;

  /** Planejamento de abate. */
  pesoAlvoAbate: number;
  rendimentoCarcaca: number;
  /** Peso de acabamento usado no cálculo de peso equivalente. */
  pesoFinalMaturidade: number;
  diasPorPeriodo: number;

  /** Calibração do consumo previsto (0,85 a 1,15). */
  ajusteConsumo: number;

  /** Como o ciclo se divide entre crescimento e engorda. */
  planoEtapas: PlanoEtapas;
  /** Peso vivo em que a dieta de crescimento dá lugar à de engorda. */
  pesoTrocaEtapa: number;
  /** A dieta da engorda. A de crescimento são os campos de sempre do lote. */
  engorda: DietaEtapa;

  /** Compra e venda, para a previsão de resultado. */
  modoCompra: ModoCompra;
  /**
   * Preço pago pelo animal, na unidade do `modoCompra`: reais por arroba de
   * carcaça no peso de entrada, ou reais por cabeça. Zero quer dizer que não
   * houve compra (animal de cria própria) ou que o valor ainda não foi
   * informado - nos dois casos o resultado sai contando só a dieta.
   */
  precoCompra: number;
  /** Preço esperado da arroba na venda (R$/@). */
  precoArrobaVenda: number;

  /** Insumos que compõem a ração. */
  volumosoID?: string;
  energeticoID?: string;
  proteicoID?: string;
  mineralID?: string;
  restricoes: RestricoesFormulacao;

  pesagens: Pesagem[];
  observacoes: string;
}

export function criarLote(entrada: Partial<Lote> = {}): Lote {
  return {
    id: crypto.randomUUID(),
    nome: "",
    quantidadeAnimais: 50,
    pesoMedioInicial: 240,
    ganhoMetaDiario: 0.7,
    fase: "recriaInicial",
    grupoGenetico: "zebuino",
    sistema: "semiconfinamento",
    categoriaAnimal: "femea",
    dataEntrada: new Date(),
    pesoAlvoAbate: 420,
    rendimentoCarcaca: 0.53,
    pesoFinalMaturidade: 430,
    diasPorPeriodo: 30,
    ajusteConsumo: 1.0,
    planoEtapas: "automatico",
    pesoTrocaEtapa: 330,
    engorda: {
      ganhoMetaDiario: 1.1,
      restricoes: { ...RESTRICOES_ENGORDA },
    },
    modoCompra: "porArroba",
    precoCompra: 0,
    precoArrobaVenda: 0,
    restricoes: RESTRICOES_PADRAO,
    pesagens: [],
    observacoes: "",
    ...entrada,
  };
}

// --------------------------------------------------------- leituras do lote

/** Pesagens em ordem cronológica. */
export function pesagensOrdenadas(lote: Lote): Pesagem[] {
  return [...lote.pesagens].sort((a, b) => a.data.getTime() - b.data.getTime());
}

export function ultimaPesagem(lote: Lote): Pesagem | undefined {
  const lista = pesagensOrdenadas(lote);
  return lista[lista.length - 1];
}

/** Peso médio atual: última pesagem registrada ou o peso de entrada. */
export function pesoAtual(lote: Lote): number {
  return ultimaPesagem(lote)?.pesoMedio ?? lote.pesoMedioInicial;
}

export function dataReferencia(lote: Lote): Date {
  return ultimaPesagem(lote)?.data ?? lote.dataEntrada;
}

/** Ganho médio diário observado entre a entrada e a última pesagem. */
export function ganhoRealDiario(lote: Lote): number | null {
  const ultima = ultimaPesagem(lote);
  if (!ultima) return null;
  const dias = (ultima.data.getTime() - lote.dataEntrada.getTime()) / 86_400_000;
  if (dias < 1) return null;
  return (ultima.pesoMedio - lote.pesoMedioInicial) / dias;
}

export function pesoTotalLote(lote: Lote): number {
  return pesoAtual(lote) * lote.quantidadeAnimais;
}

/** Perfil para o cálculo de exigências em um determinado peso. */
export function perfilParaPeso(lote: Lote, peso: number, faseAutomatica = false): PerfilAnimal {
  return perfilAnimal({
    pesoVivo: peso,
    fase: faseAutomatica ? faseSugerida(peso) : lote.fase,
    grupoGenetico: lote.grupoGenetico,
    sistema: lote.sistema,
    categoria: lote.categoriaAnimal,
    pesoFinal: lote.pesoFinalMaturidade,
    ajusteConsumo: lote.ajusteConsumo,
  });
}

export function perfilAtual(lote: Lote): PerfilAnimal {
  return perfilParaPeso(lote, pesoAtual(lote));
}

/** A meta de ganho que vale hoje, pela etapa em que o lote está. */
export function ganhoMetaAtual(lote: Lote): number {
  return dietaAtual(lote).ganhoMetaDiario;
}

/** Peso ainda a ganhar por animal até o abate. */
export function ganhoRestante(lote: Lote): number {
  return Math.max(0, lote.pesoAlvoAbate - pesoAtual(lote));
}

/** Arrobas de carcaça no peso atual. */
export function arrobasAtuais(lote: Lote): number {
  return (pesoAtual(lote) * lote.rendimentoCarcaca) / 15;
}

/** Arrobas de carcaça previstas no abate. */
export function arrobasNoAbate(lote: Lote): number {
  return (lote.pesoAlvoAbate * lote.rendimentoCarcaca) / 15;
}

// ------------------------------------------------------------ etapas da dieta

/**
 * O plano de verdade, com o `automatico` já resolvido.
 *
 * A regra segue a fase de entrada: terminação é animal que só engorda daqui
 * para a frente; desmama e recria ainda têm crescimento pela frente, então
 * ganham as duas dietas.
 */
export function planoResolvido(lote: Lote): Exclude<PlanoEtapas, "automatico"> {
  if (lote.planoEtapas !== "automatico") return lote.planoEtapas;
  return lote.fase === "terminacao" ? "soEngorda" : "duas";
}

/** A etapa de um ciclo que não se divide. */
function etapaUnica(lote: Lote): EtapaDieta {
  return planoResolvido(lote) === "soEngorda" ? "engorda" : "crescimento";
}

/**
 * Se a virada de etapa acontece mesmo dentro deste ciclo.
 *
 * Um peso de troca abaixo do peso de entrada quer dizer que o lote já entrou
 * em engorda; acima do peso de abate, que a engorda não chega a começar. Nos
 * dois casos o ciclo tem uma etapa só, e é assim que as contas tratam.
 */
export function trocaDentroDoCiclo(lote: Lote, pesoPartida = pesoAtual(lote)): boolean {
  return (
    planoResolvido(lote) === "duas" &&
    lote.pesoTrocaEtapa > pesoPartida &&
    lote.pesoTrocaEtapa < lote.pesoAlvoAbate
  );
}

/** Qual dieta vale num dado peso vivo. */
export function etapaNoPeso(lote: Lote, peso: number): EtapaDieta {
  if (planoResolvido(lote) !== "duas") return etapaUnica(lote);
  return peso >= lote.pesoTrocaEtapa ? "engorda" : "crescimento";
}

/**
 * A dieta de uma etapa, com o que não foi escolhido herdado do crescimento.
 *
 * Herdar é o caso comum: quem entra na engorda costuma manter o mesmo
 * volumoso e o mesmo proteico, e mexer só na proporção e na meta de ganho.
 * Obrigar a recadastrar os quatro alimentos seria trabalho sem ganho.
 */
export function dietaDaEtapa(lote: Lote, etapa: EtapaDieta): DietaEtapa {
  if (etapa === "crescimento") {
    return {
      ganhoMetaDiario: lote.ganhoMetaDiario,
      volumosoID: lote.volumosoID,
      energeticoID: lote.energeticoID,
      proteicoID: lote.proteicoID,
      mineralID: lote.mineralID,
      restricoes: lote.restricoes,
    };
  }
  const e = lote.engorda;
  return {
    /*
     * Só os alimentos são herdados: em branco quer dizer "não escolhi". A meta
     * de ganho é a da própria etapa - zero ali é erro de preenchimento, e o
     * planejador recusa em vez de adivinhar.
     *
     * A exceção é o ciclo que só tem engorda: ali não existe segunda etapa, e
     * o campo "Meta de ganho" do cadastro é o único que o usuário vê. Ler a
     * meta escondida da engorda deixaria aquele campo sem efeito nenhum.
     */
    ganhoMetaDiario:
      planoResolvido(lote) === "soEngorda" ? lote.ganhoMetaDiario : e.ganhoMetaDiario,
    volumosoID: e.volumosoID ?? lote.volumosoID,
    energeticoID: e.energeticoID ?? lote.energeticoID,
    proteicoID: e.proteicoID ?? lote.proteicoID,
    mineralID: e.mineralID ?? lote.mineralID,
    restricoes: e.restricoes,
  };
}

/** A dieta que vale num dado peso vivo. */
export function dietaNoPeso(lote: Lote, peso: number): DietaEtapa {
  return dietaDaEtapa(lote, etapaNoPeso(lote, peso));
}

/** A dieta de hoje, pelo peso da última pesagem. */
export function dietaAtual(lote: Lote): DietaEtapa {
  return dietaNoPeso(lote, pesoAtual(lote));
}

/** Os alimentos de uma dieta, se os três obrigatórios existirem. */
export function selecaoDaDieta(
  dieta: DietaEtapa,
  insumos: readonly Insumo[],
): SelecaoInsumos | null {
  const achar = (id?: string) => insumos.find((i) => i.id === id);
  const volumoso = achar(dieta.volumosoID);
  const energetico = achar(dieta.energeticoID);
  const proteico = achar(dieta.proteicoID);
  if (!volumoso || !energetico || !proteico) return null;
  return { volumoso, energetico, proteico, mineral: achar(dieta.mineralID) };
}

// ------------------------------------------------------------ compra do lote

/**
 * Arrobas de carcaça consideradas na compra.
 *
 * Usa o peso de **entrada**, não o de hoje: é o peso pelo qual o animal foi
 * pago. O rendimento é o mesmo cadastrado para o abate - na prática o
 * rendimento do magro é menor, então quem negocia com rendimentos diferentes
 * deve informar o preço já por cabeça.
 */
export function arrobasCompra(lote: Lote): number {
  return (lote.pesoMedioInicial * lote.rendimentoCarcaca) / 15;
}

/** O que cada animal custou na entrada, seja qual for o modo de compra. */
export function custoCompraPorAnimal(lote: Lote): number {
  if (!(lote.precoCompra > 0)) return 0;
  return lote.modoCompra === "porArroba"
    ? lote.precoCompra * arrobasCompra(lote)
    : lote.precoCompra;
}

export function custoCompraLote(lote: Lote): number {
  return custoCompraPorAnimal(lote) * lote.quantidadeAnimais;
}

export function estaPronto(lote: Lote): boolean {
  return pesoAtual(lote) >= lote.pesoAlvoAbate;
}

export function loteExemplo(): Lote {
  return criarLote({
    nome: "Lote 1 - Novilhas Nelore",
    quantidadeAnimais: 40,
    pesoMedioInicial: 260,
    ganhoMetaDiario: 0.75,
    fase: "recriaInicial",
    pesoAlvoAbate: 430,
    pesoFinalMaturidade: 430,
  });
}
