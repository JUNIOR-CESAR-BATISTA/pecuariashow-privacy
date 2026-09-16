/**
 * Alimento disponível na propriedade e a forma como ele é comprado.
 *
 * Porte de `Core/Modelos/Insumo.swift`, do antigo aplicativo de iPhone.
 * Teores de PB e NDT são sempre
 * percentuais da matéria seca.
 */
import type { CategoriaInsumo } from "./classificacoes.js";
import { numero, percentual } from "./formatadores.js";

// ---------------------------------------------------------------- embalagem

export type TipoEmbalagem = "saca" | "granel" | "pastejo";

export interface Embalagem {
  tipo: TipoEmbalagem;
  /** Peso líquido da saca em quilos. Só importa quando o tipo é "saca". */
  kgPorSaca: number;
}

/** Tamanhos de saca praticados no mercado brasileiro de insumos. */
export const TAMANHOS_PADRAO: readonly number[] = [60, 50, 40, 30, 25, 20];

export function embalagem(tipo: TipoEmbalagem = "saca", kgPorSaca = 50): Embalagem {
  return { tipo, kgPorSaca };
}

export const SACA_60 = embalagem("saca", 60);
export const SACA_50 = embalagem("saca", 50);
export const SACA_40 = embalagem("saca", 40);
export const SACA_30 = embalagem("saca", 30);
export const SACA_25 = embalagem("saca", 25);
export const GRANEL = embalagem("granel", 1000);
export const PASTEJO = embalagem("pastejo", 0);

/**
 * Quilos que correspondem a uma unidade de compra.
 * Devolve `null` quando o insumo não é adquirido (pastejo).
 */
export function kgPorUnidade(e: Embalagem): number | null {
  switch (e.tipo) {
    case "saca":
      return e.kgPorSaca > 0 ? e.kgPorSaca : null;
    case "granel":
      return 1000;
    case "pastejo":
      return null;
  }
}

export function nomeUnidade(e: Embalagem): string {
  switch (e.tipo) {
    case "saca":
      return "saca";
    case "granel":
      return "tonelada";
    case "pastejo":
      return "-";
  }
}

export function nomeUnidadePlural(e: Embalagem): string {
  switch (e.tipo) {
    case "saca":
      return "sacas";
    case "granel":
      return "toneladas";
    case "pastejo":
      return "-";
  }
}

export function descricaoEmbalagem(e: Embalagem): string {
  switch (e.tipo) {
    case "saca":
      return `Saca de ${numero(e.kgPorSaca, 0)} kg`;
    case "granel":
      return "Granel (tonelada)";
    case "pastejo":
      return "Pastejo";
  }
}

// ------------------------------------------------------------------ insumo

export interface Insumo {
  id: string;
  nome: string;
  categoria: CategoriaInsumo;
  /** Matéria seca (% da matéria natural). */
  materiaSeca: number;
  /** Proteína bruta (% da matéria seca). */
  proteinaBruta: number;
  /** Nutrientes digestíveis totais (% da matéria seca). */
  ndt: number;
  embalagem: Embalagem;
  /** Preço por unidade de compra: por saca, ou por tonelada no granel. */
  precoUnitario: number;
  observacao: string;
}

export function criarInsumo(
  entrada: Pick<Insumo, "nome" | "categoria" | "materiaSeca" | "proteinaBruta" | "ndt"> &
    Partial<Insumo>,
): Insumo {
  return {
    id: crypto.randomUUID(),
    embalagem: SACA_50,
    precoUnitario: 0,
    observacao: "",
    ...entrada,
  };
}

/** Fração de matéria seca (0 a 1), protegida contra valores inválidos. */
export function fracaoMateriaSeca(insumo: Insumo): number {
  return Math.min(Math.max(insumo.materiaSeca / 100, 0.01), 1.0);
}

/** Converte quilos de matéria seca em quilos de matéria natural. */
export function materiaNatural(insumo: Insumo, kgMS: number): number {
  return kgMS / fracaoMateriaSeca(insumo);
}

/** Converte quilos de matéria natural em quilos de matéria seca. */
export function materiaSecaDe(insumo: Insumo, kgMN: number): number {
  return kgMN * fracaoMateriaSeca(insumo);
}

/** Preço por quilo de matéria natural. */
export function precoPorKg(insumo: Insumo): number {
  const kg = kgPorUnidade(insumo.embalagem);
  if (kg === null || kg <= 0) return 0;
  return insumo.precoUnitario / kg;
}

/** Preço por quilo de matéria seca, útil para comparar alimentos. */
export function precoPorKgMateriaSeca(insumo: Insumo): number {
  return precoPorKg(insumo) / fracaoMateriaSeca(insumo);
}

export function resumoBromatologico(insumo: Insumo): string {
  return (
    `MS ${percentual(insumo.materiaSeca)} - ` +
    `PB ${percentual(insumo.proteinaBruta)} - ` +
    `NDT ${percentual(insumo.ndt)}`
  );
}
