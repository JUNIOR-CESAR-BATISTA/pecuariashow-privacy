/**
 * Converte quantidades de insumo em quilos para sacas ou toneladas.
 *
 * Porte de `Core/Calculo/ConversorSacas.swift`.
 */
import { numero } from "./formatadores.js";
import {
  TAMANHOS_PADRAO,
  kgPorUnidade,
  nomeUnidade as nomeDaUnidade,
  nomeUnidadePlural as nomePluralDaUnidade,
  type Embalagem,
} from "./insumo.js";

export interface ConversaoSacas {
  totalKg: number;
  kgPorUnidade: number;
  nomeUnidade: string;
  nomeUnidadePlural: string;
  /** Número fracionário de unidades (ex.: 12,4 sacas). */
  unidadesExatas: number;
  /** Unidades completas. */
  unidadesInteiras: number;
  /** Sobra em quilos além das unidades completas. */
  sobraKg: number;
  /** Unidades a comprar, sempre arredondando para cima. */
  unidadesParaCompra: number;
  toneladas: number;
}

/**
 * Converte uma quantidade em quilos usando um tamanho de embalagem livre.
 *
 * O `1e-9` nos arredondamentos existe para o caso exato: 100 kg em sacas de
 * 50 kg têm de dar 2 sacas cheias e 2 sacas a comprar, não 1 e 3, e a divisão
 * em ponto flutuante nem sempre cai redonda.
 */
export function converter(
  kg: number,
  kgPorUnidadeInformado: number,
  nomeUnidade = "saca",
  nomeUnidadePlural = "sacas",
): ConversaoSacas | null {
  if (!(kgPorUnidadeInformado > 0) || !Number.isFinite(kg) || kg < 0) return null;

  const unidadesExatas = kg / kgPorUnidadeInformado;
  const unidadesInteiras = Math.floor(unidadesExatas + 1e-9);
  const sobraKg = Math.max(0, kg - unidadesInteiras * kgPorUnidadeInformado);
  const unidadesParaCompra = Math.ceil(unidadesExatas - 1e-9);

  return {
    totalKg: kg,
    kgPorUnidade: kgPorUnidadeInformado,
    nomeUnidade,
    nomeUnidadePlural,
    unidadesExatas,
    unidadesInteiras,
    sobraKg,
    unidadesParaCompra,
    toneladas: kg / 1000,
  };
}

/**
 * Converte usando a embalagem cadastrada no insumo.
 * Devolve `null` para insumos que não são adquiridos (pastejo).
 */
export function converterPelaEmbalagem(kg: number, e: Embalagem): ConversaoSacas | null {
  const porUnidade = kgPorUnidade(e);
  if (porUnidade === null) return null;
  return converter(kg, porUnidade, nomeDaUnidade(e), nomePluralDaUnidade(e));
}

/** Converte a mesma quantidade para todos os tamanhos de saca de mercado. */
export function equivalencias(kg: number): ConversaoSacas[] {
  return TAMANHOS_PADRAO.map((tamanho) => converter(kg, tamanho)).filter(
    (c): c is ConversaoSacas => c !== null,
  );
}

/** "12 sacas de 50 kg + 20,0 kg" */
export function descricao(c: ConversaoSacas): string {
  const nome = c.unidadesInteiras === 1 ? c.nomeUnidade : c.nomeUnidadePlural;
  const base = `${c.unidadesInteiras} ${nome} de ${numero(c.kgPorUnidade, 0)} kg`;
  if (c.sobraKg >= 0.05) return `${base} + ${numero(c.sobraKg, 1)} kg`;
  return base;
}

export function descricaoCompra(c: ConversaoSacas): string {
  const nome = c.unidadesParaCompra === 1 ? c.nomeUnidade : c.nomeUnidadePlural;
  return `${c.unidadesParaCompra} ${nome}`;
}
