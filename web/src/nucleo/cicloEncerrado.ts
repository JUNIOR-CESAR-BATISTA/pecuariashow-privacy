/**
 * Um lote que já foi abatido, com o que foi planejado e o que de fato aconteceu.
 *
 * Porte de `Core/Modelos/CicloEncerrado.swift`. É a memória da fazenda: cada
 * ciclo encerrado vira base de comparação e calibração para os lotes seguintes.
 */
import type { GrupoGenetico, SistemaCriacao } from "./classificacoes.js";

export interface CicloEncerrado {
  id: string;
  loteID: string;
  nome: string;
  grupoGenetico: GrupoGenetico;
  sistema: SistemaCriacao;

  // Plano, fotografado no momento do encerramento.
  dataInicio: Date;
  pesoInicial: number;
  ganhoMeta: number;
  pesoAlvo: number;
  animaisIniciais: number;
  pesoAcabamentoPlanejado: number;
  /** Consumo médio previsto, em kg de matéria seca por animal por dia. */
  consumoPrevistoDiario: number;
  /** Teores médios da dieta planejada (% da matéria seca). */
  ndtDietaMedia: number;
  pbDietaMedia: number;
  /** Concentrado previsto para o ciclo inteiro, em kg de matéria natural. */
  concentradoPrevisto: number;
  custoPrevisto: number;
  volumosoNome: string;
  energeticoNome: string;
  proteicoNome: string;

  // Realizado.
  dataAbate: Date;
  pesoFinalReal: number;
  animaisAbatidos: number;
  /** Peso médio de carcaça, em kg. Zero quando não informado. */
  pesoCarcacaReal: number;
  /** Concentrado realmente fornecido no ciclo, em kg de matéria natural. */
  concentradoReal: number;
  custoReal: number;
  /** Preço recebido por arroba. Zero quando não informado. */
  precoArroba: number;
  observacoes: string;
}

type Obrigatorios =
  | "loteID"
  | "nome"
  | "grupoGenetico"
  | "sistema"
  | "dataInicio"
  | "pesoInicial"
  | "ganhoMeta"
  | "pesoAlvo"
  | "animaisIniciais"
  | "pesoAcabamentoPlanejado"
  | "consumoPrevistoDiario"
  | "ndtDietaMedia"
  | "pbDietaMedia"
  | "concentradoPrevisto"
  | "custoPrevisto"
  | "volumosoNome"
  | "energeticoNome"
  | "proteicoNome"
  | "dataAbate"
  | "pesoFinalReal"
  | "animaisAbatidos";

export function criarCiclo(
  entrada: Pick<CicloEncerrado, Obrigatorios> & Partial<CicloEncerrado>,
): CicloEncerrado {
  return {
    id: crypto.randomUUID(),
    pesoCarcacaReal: 0,
    concentradoReal: 0,
    custoReal: 0,
    precoArroba: 0,
    observacoes: "",
    ...entrada,
  };
}

// ------------------------------------------------------- desempenho observado

/** Duração real do ciclo, em dias. */
export function diasReais(c: CicloEncerrado): number {
  return Math.max((c.dataAbate.getTime() - c.dataInicio.getTime()) / 86_400_000, 0);
}

export function diasPlanejados(c: CicloEncerrado): number {
  return c.ganhoMeta > 0 ? Math.max(0, c.pesoAlvo - c.pesoInicial) / c.ganhoMeta : 0;
}

export const ganhoTotalPorAnimal = (c: CicloEncerrado) =>
  Math.max(0, c.pesoFinalReal - c.pesoInicial);

export const ganhoTotalLote = (c: CicloEncerrado) =>
  ganhoTotalPorAnimal(c) * c.animaisAbatidos;

/** Ganho médio diário observado (kg/dia). */
export function ganhoRealDiario(c: CicloEncerrado): number {
  const dias = diasReais(c);
  return dias >= 1 ? ganhoTotalPorAnimal(c) / dias : 0;
}

/** Quanto do ganho planejado foi entregue. 1,0 = exatamente a meta. */
export function aderenciaGanho(c: CicloEncerrado): number {
  return c.ganhoMeta > 0 ? ganhoRealDiario(c) / c.ganhoMeta : 0;
}

/** Peso médio do animal ao longo do ciclo, usado nas contas de calibração. */
export const pesoMedioCiclo = (c: CicloEncerrado) => (c.pesoInicial + c.pesoFinalReal) / 2;

/** Rendimento de carcaça observado (fração). Nulo quando não informado. */
export function rendimentoReal(c: CicloEncerrado): number | null {
  if (!(c.pesoCarcacaReal > 0) || !(c.pesoFinalReal > 0)) return null;
  return c.pesoCarcacaReal / c.pesoFinalReal;
}

export const arrobasPorAnimal = (c: CicloEncerrado) =>
  c.pesoCarcacaReal > 0 ? c.pesoCarcacaReal / 15 : 0;

export const arrobasLote = (c: CicloEncerrado) => arrobasPorAnimal(c) * c.animaisAbatidos;

/** Arrobas produzidas no ciclo, descontando a carcaça de entrada. */
export function arrobasProduzidasLote(c: CicloEncerrado): number {
  const rendimento = rendimentoReal(c);
  if (rendimento === null) return 0;
  const carcacaInicial = c.pesoInicial * rendimento;
  return ((c.pesoCarcacaReal - carcacaInicial) / 15) * c.animaisAbatidos;
}

export const animaisPerdidos = (c: CicloEncerrado) =>
  Math.max(0, c.animaisIniciais - c.animaisAbatidos);

export function taxaPerda(c: CicloEncerrado): number {
  return c.animaisIniciais > 0 ? animaisPerdidos(c) / c.animaisIniciais : 0;
}

// ------------------------------------------------------------------- custo

export const temCusto = (c: CicloEncerrado) => c.custoReal > 0;

export function custoPorArroba(c: CicloEncerrado): number | null {
  const arrobas = arrobasProduzidasLote(c);
  if (!(c.custoReal > 0) || !(arrobas > 0)) return null;
  return c.custoReal / arrobas;
}

export function custoPorKgGanho(c: CicloEncerrado): number | null {
  const ganho = ganhoTotalLote(c);
  if (!(c.custoReal > 0) || !(ganho > 0)) return null;
  return c.custoReal / ganho;
}

export function custoPorAnimalDia(c: CicloEncerrado): number | null {
  const base = diasReais(c) * c.animaisAbatidos;
  if (!(c.custoReal > 0) || !(base > 0)) return null;
  return c.custoReal / base;
}

export function receita(c: CicloEncerrado): number | null {
  const arrobas = arrobasLote(c);
  if (!(c.precoArroba > 0) || !(arrobas > 0)) return null;
  return c.precoArroba * arrobas;
}

export function margem(c: CicloEncerrado): number | null {
  const r = receita(c);
  if (r === null || !(c.custoReal > 0)) return null;
  return r - c.custoReal;
}

/** Quanto do concentrado planejado foi de fato fornecido. */
export function aderenciaConcentrado(c: CicloEncerrado): number | null {
  if (!(c.concentradoPrevisto > 0) || !(c.concentradoReal > 0)) return null;
  return c.concentradoReal / c.concentradoPrevisto;
}

/** Desvio do custo em relação ao previsto. */
export function desvioCusto(c: CicloEncerrado): number | null {
  if (!(c.custoPrevisto > 0) || !(c.custoReal > 0)) return null;
  return c.custoReal / c.custoPrevisto - 1;
}
