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
  type FaseAnimal,
  type GrupoGenetico,
  type ModoCompra,
  type SistemaCriacao,
} from "./classificacoes.js";
import { RESTRICOES_PADRAO, type RestricoesFormulacao } from "./formuladorRacao.js";
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
  dataEntrada: Date;

  /** Planejamento de abate. */
  pesoAlvoAbate: number;
  rendimentoCarcaca: number;
  /** Peso de acabamento usado no cálculo de peso equivalente. */
  pesoFinalMaturidade: number;
  diasPorPeriodo: number;

  /** Calibração do consumo previsto (0,85 a 1,15). */
  ajusteConsumo: number;

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
    dataEntrada: new Date(),
    pesoAlvoAbate: 420,
    rendimentoCarcaca: 0.53,
    pesoFinalMaturidade: 430,
    diasPorPeriodo: 30,
    ajusteConsumo: 1.0,
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
    pesoFinal: lote.pesoFinalMaturidade,
    ajusteConsumo: lote.ajusteConsumo,
  });
}

export function perfilAtual(lote: Lote): PerfilAnimal {
  return perfilParaPeso(lote, pesoAtual(lote));
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
