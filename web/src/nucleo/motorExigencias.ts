/**
 * Motor de exigências nutricionais para bovinos em crescimento.
 *
 * Porte de `Core/Calculo/MotorExigencias.swift`, do antigo aplicativo de
 * iPhone, equação por equação. Segue o
 * sistema de energia líquida e proteína metabolizável do NRC (Nutrient
 * Requirements of Beef Cattle), com ajustes de grupo genético e de atividade
 * usuais em condições brasileiras.
 *
 * As equações de energia retida e o peso de referência vêm da categoria de
 * sexo do lote, em `CATEGORIAS_ANIMAL`: o NRC publica fórmulas distintas para
 * fêmea e para macho, não um fator de correção sobre uma delas.
 *
 * As constantes ficam reunidas em `CONSTANTES` para facilitar auditoria e
 * calibração, e os testes fixam os mesmos números esperados da versão Swift.
 */
import {
  CATEGORIAS_ANIMAL,
  FASES,
  GRUPOS,
  SISTEMAS,
  type CategoriaAnimal,
  type FaseAnimal,
  type GrupoGenetico,
  type SistemaCriacao,
} from "./classificacoes.js";
import { numero, percentual } from "./formatadores.js";

export interface PerfilAnimal {
  pesoVivo: number;
  fase: FaseAnimal;
  grupoGenetico: GrupoGenetico;
  sistema: SistemaCriacao;
  /** Fêmea, macho castrado ou macho inteiro. Muda as equações de energia. */
  categoria: CategoriaAnimal;
  /** Peso vivo em que o animal atinge o acabamento. */
  pesoFinal: number;
  /** Calibração do consumo previsto (1,0 = previsão padrão). */
  ajusteConsumo: number;
}

export function perfilAnimal(entrada: Partial<PerfilAnimal> & { pesoVivo: number; fase: FaseAnimal }): PerfilAnimal {
  return {
    grupoGenetico: "zebuino",
    sistema: "semiconfinamento",
    categoria: "femea",
    pesoFinal: 430,
    ajusteConsumo: 1.0,
    ...entrada,
  };
}

export interface ExigenciaDiaria {
  pesoVivo: number;
  /** Ganho usado no cálculo. Pode ser menor que a meta quando ela é inviável. */
  ganhoDiario: number;
  ganhoDiarioMeta: number;
  metaAtingivel: boolean;

  consumoMateriaSeca: number;
  consumoPercentualPeso: number;

  ndtKg: number;
  ndtPercentualDieta: number;

  proteinaBrutaKg: number;
  proteinaBrutaPercentualDieta: number;
  proteinaBrutaGramas: number;
  /** A PB foi elevada até o piso prático da fase. */
  proteinaAjustadaAoPiso: boolean;

  energiaLiquidaMantenca: number;
  energiaLiquidaGanho: number;
  energiaMetabolizavel: number;
  proteinaMetabolizavelMantenca: number;
  proteinaMetabolizavelGanho: number;
  proteinaMetabolizavelTotal: number;

  alertas: string[];
}

export interface GanhoEsperado {
  porEnergia: number;
  porProteina: number;
  nutrienteLimitante: string;
  /** O menor dos dois: quem limita manda. */
  ganho: number;
}

export const CONSTANTES = {
  /** Peso vivo -> peso vivo de jejum. */
  fatorPesoJejum: 0.96,
  /** Peso vivo de jejum -> peso de corpo vazio. */
  fatorCorpoVazio: 0.891,
  /** Ganho de peso vivo -> ganho de corpo vazio. */
  fatorGanhoCorpoVazio: 0.956,
  /** Exigência basal de energia líquida de mantença (Mcal/kg PCJ^0,75). */
  energiaMantencaBase: 0.077,
  /**
   * Peso do animal de referência, para o grau de maturidade. Não muda por
   * sexo: o tamanho adulto de cada categoria entra pelo peso de acabamento
   * informado no lote, e ajustar os dois contaria a diferença duas vezes.
   */
  pesoReferencia: 462.0,
  /** Proteína metabolizável de mantença (g/kg PCJ^0,75). */
  proteinaMantenca: 3.8,
  /** Energia metabolizável como fração da energia digestível. */
  emSobreEd: 0.82,
  /** Mcal de energia digestível por quilo de NDT. */
  mcalPorKgNDT: 4.409,
  /** Proteína microbiana produzida por quilo de NDT (g). */
  proteinaMicrobianaPorNDT: 130.0,
  /** Eficiência de uso da proteína microbiana e da PNDR. */
  eficienciaProteinaMicrobiana: 0.64,
  eficienciaProteinaNaoDegradavel: 0.8,
  /** Faixa de densidade energética considerada praticável (% NDT na MS). */
  ndtMinimo: 40.0,
  ndtMaximo: 85.0,
} as const;

// ------------------------------------------------------- energia da dieta

/** Energia metabolizável da dieta (Mcal/kg MS) a partir do teor de NDT. */
export function energiaMetabolizavelDieta(ndtPercentual: number): number {
  return CONSTANTES.emSobreEd * 0.04409 * ndtPercentual;
}

/** Concentração de energia líquida de mantença da dieta (Mcal/kg MS). */
export function elMantencaDieta(ndtPercentual: number): number {
  const em = energiaMetabolizavelDieta(ndtPercentual);
  return 1.37 * em - 0.138 * em ** 2 + 0.0105 * em ** 3 - 1.12;
}

/** Concentração de energia líquida de ganho da dieta (Mcal/kg MS). */
export function elGanhoDieta(ndtPercentual: number): number {
  const em = energiaMetabolizavelDieta(ndtPercentual);
  return 1.42 * em - 0.174 * em ** 2 + 0.0122 * em ** 3 - 1.65;
}

// ---------------------------------------------------------- pesos derivados

export function pesoJejum(perfil: PerfilAnimal): number {
  return Math.max(perfil.pesoVivo, 1) * CONSTANTES.fatorPesoJejum;
}

/**
 * Peso equivalente: corrige o grau de maturidade do animal em relação ao
 * animal de referência. Animais mais precoces exigem mais energia por quilo
 * ganho no mesmo peso.
 */
export function pesoEquivalente(perfil: PerfilAnimal): number {
  const pesoFinalJejum = Math.max(perfil.pesoFinal, 200) * CONSTANTES.fatorPesoJejum;
  return pesoJejum(perfil) * (CONSTANTES.pesoReferencia / pesoFinalJejum);
}

export function corpoVazioEquivalente(perfil: PerfilAnimal): number {
  return pesoEquivalente(perfil) * CONSTANTES.fatorCorpoVazio;
}

// ------------------------------------------------------ exigências de energia

/** Energia líquida de mantença (Mcal/dia). */
export function energiaMantenca(perfil: PerfilAnimal): number {
  return (
    CONSTANTES.energiaMantencaBase *
    GRUPOS[perfil.grupoGenetico].fatorMantenca *
    CATEGORIAS_ANIMAL[perfil.categoria].fatorMantenca *
    SISTEMAS[perfil.sistema].fatorAtividade *
    pesoJejum(perfil) ** 0.75
  );
}

/** Energia retida no ganho (Mcal/dia). */
export function energiaRetida(perfil: PerfilAnimal, ganhoDiario: number): number {
  const ganhoCorpoVazio = CONSTANTES.fatorGanhoCorpoVazio * Math.max(ganhoDiario, 0);
  if (ganhoCorpoVazio <= 0) return 0;
  return (
    CATEGORIAS_ANIMAL[perfil.categoria].energiaRetidaA *
    corpoVazioEquivalente(perfil) ** 0.75 *
    ganhoCorpoVazio ** CATEGORIAS_ANIMAL[perfil.categoria].energiaRetidaB
  );
}

// ------------------------------------------------------------------ consumo

/** Consumo potencial de matéria seca previsto (kg/dia) para a densidade da dieta. */
export function consumoPotencial(perfil: PerfilAnimal, ndtPercentual: number): number {
  const elm = elMantencaDieta(ndtPercentual);
  if (elm <= 0) return 0;
  const base = (pesoJejum(perfil) ** 0.75 * (0.2435 * elm - 0.0466 * elm ** 2 - 0.1128)) / elm;
  return Math.max(base * perfil.ajusteConsumo, 0);
}

/**
 * Consumo de matéria seca necessário (kg/dia) para o ganho desejado numa
 * dieta com a densidade informada.
 */
export function consumoNecessario(
  perfil: PerfilAnimal,
  ganhoDiario: number,
  ndtPercentual: number,
): number {
  const elmDieta = elMantencaDieta(ndtPercentual);
  const elgDieta = elGanhoDieta(ndtPercentual);
  if (elmDieta <= 0 || elgDieta <= 0) return Number.POSITIVE_INFINITY;
  return energiaMantenca(perfil) / elmDieta + energiaRetida(perfil, ganhoDiario) / elgDieta;
}

/**
 * Densidade energética (% de NDT na MS) em que o consumo necessário iguala o
 * consumo potencial. Devolve `null` quando a meta é inviável.
 */
export function densidadeAlvo(perfil: PerfilAnimal, ganhoDiario: number): number | null {
  const diferenca = (ndt: number) =>
    consumoNecessario(perfil, ganhoDiario, ndt) - consumoPotencial(perfil, ndt);

  if (diferenca(CONSTANTES.ndtMaximo) > 0) return null;

  // Anotados como number de propósito: o `as const` de CONSTANTES daria a
  // estas variáveis o tipo literal 40 e 85, e a busca binária não poderia
  // atribuir mais nada a elas.
  let baixo: number = CONSTANTES.ndtMinimo;
  let alto: number = CONSTANTES.ndtMaximo;
  if (diferenca(baixo) < 0) return baixo;

  for (let i = 0; i < 80; i += 1) {
    const meio = (baixo + alto) / 2;
    if (diferenca(meio) > 0) baixo = meio;
    else alto = meio;
  }
  return (baixo + alto) / 2;
}

/** Inverte a equação de energia retida para obter o ganho de peso vivo. */
export function ganhoAPartirDaEnergiaRetida(perfil: PerfilAnimal, energia: number): number {
  if (energia <= 0) return 0;
  const base =
    CATEGORIAS_ANIMAL[perfil.categoria].energiaRetidaA * corpoVazioEquivalente(perfil) ** 0.75;
  if (base <= 0) return 0;
  const ganhoCorpoVazio =
    (energia / base) ** (1 / CATEGORIAS_ANIMAL[perfil.categoria].energiaRetidaB);
  return ganhoCorpoVazio / CONSTANTES.fatorGanhoCorpoVazio;
}

/** Maior ganho diário sustentável dentro da faixa prática de densidade. */
export function ganhoMaximo(perfil: PerfilAnimal): number {
  const ndt = CONSTANTES.ndtMaximo;
  const consumo = consumoPotencial(perfil, ndt);
  const sobra = consumo - energiaMantenca(perfil) / elMantencaDieta(ndt);
  if (sobra <= 0) return 0;
  return ganhoAPartirDaEnergiaRetida(perfil, sobra * elGanhoDieta(ndt));
}

// ----------------------------------------------------- exigências de proteína

/** Proteína metabolizável de mantença (g/dia). */
export function proteinaMetabolizavelMantenca(perfil: PerfilAnimal): number {
  return CONSTANTES.proteinaMantenca * pesoJejum(perfil) ** 0.75;
}

/** Eficiência de conversão de proteína metabolizável em proteína retida. */
export function eficienciaProteinaGanho(perfil: PerfilAnimal): number {
  return Math.max(0.492, 0.834 - 0.00114 * pesoEquivalente(perfil));
}

/** Proteína metabolizável para ganho (g/dia). */
export function proteinaMetabolizavelGanho(perfil: PerfilAnimal, ganhoDiario: number): number {
  const ganhoCorpoVazio = CONSTANTES.fatorGanhoCorpoVazio * Math.max(ganhoDiario, 0);
  if (ganhoCorpoVazio <= 0) return 0;
  const energia = energiaRetida(perfil, ganhoDiario);
  const liquidaPorKg = Math.max(0, 268.0 - 29.4 * (energia / ganhoCorpoVazio));
  const proteinaLiquida = ganhoCorpoVazio * liquidaPorKg;
  return proteinaLiquida / eficienciaProteinaGanho(perfil);
}

// --------------------------------------------------------- cálculo principal

/** Calcula as necessidades diárias de PB e NDT para a meta de ganho informada. */
export function calcular(perfil: PerfilAnimal, ganhoMeta: number): ExigenciaDiaria {
  const alertas: string[] = [];
  let ganho = Math.max(ganhoMeta, 0);
  let atingivel = true;
  let ndtPercentual: number;

  const densidade = densidadeAlvo(perfil, ganho);
  if (densidade !== null) {
    ndtPercentual = densidade;
  } else {
    atingivel = false;
    const maximo = ganhoMaximo(perfil);
    alertas.push(
      `Meta de ${numero(ganho, 3)} kg/dia acima do possível neste peso. ` +
        `O cálculo usa ${numero(maximo, 3)} kg/dia.`,
    );
    ganho = maximo;
    ndtPercentual = CONSTANTES.ndtMaximo;
  }

  const consumo = consumoNecessario(perfil, ganho, ndtPercentual);
  const consumoFinal = Number.isFinite(consumo)
    ? consumo
    : consumoPotencial(perfil, ndtPercentual);
  const ndtKg = (consumoFinal * ndtPercentual) / 100;

  const pmMantenca = proteinaMetabolizavelMantenca(perfil);
  const pmGanho = proteinaMetabolizavelGanho(perfil, ganho);
  const pmTotal = pmMantenca + pmGanho;

  // Proteína bruta pelo sistema PDR/PNDR: a proteína microbiana produzida a
  // partir do NDT cobre parte da exigência; o restante vem de proteína não
  // degradável no rúmen.
  const proteinaMicrobiana = CONSTANTES.proteinaMicrobianaPorNDT * ndtKg;
  const pmMicrobiana = CONSTANTES.eficienciaProteinaMicrobiana * proteinaMicrobiana;
  const pndr = Math.max(0, (pmTotal - pmMicrobiana) / CONSTANTES.eficienciaProteinaNaoDegradavel);
  let pbGramas = proteinaMicrobiana + pndr;
  if (pndr <= 0) {
    alertas.push(
      "A proteína microbiana da própria dieta cobre a exigência de proteína metabolizável.",
    );
  }

  let pbPercentual = consumoFinal > 0 ? (pbGramas / (consumoFinal * 1000)) * 100 : 0;
  let ajustadaAoPiso = false;
  const piso = FASES[perfil.fase].proteinaMinimaDieta;
  if (pbPercentual < piso && consumoFinal > 0) {
    pbGramas = (piso / 100) * consumoFinal * 1000;
    pbPercentual = piso;
    ajustadaAoPiso = true;
    alertas.push(
      `PB elevada ao piso prático de ${percentual(piso, 0)} da MS para a fase ` +
        `${FASES[perfil.fase].nome.toLowerCase()}.`,
    );
  }

  return {
    pesoVivo: perfil.pesoVivo,
    ganhoDiario: ganho,
    ganhoDiarioMeta: ganhoMeta,
    metaAtingivel: atingivel,
    consumoMateriaSeca: consumoFinal,
    consumoPercentualPeso: perfil.pesoVivo > 0 ? (consumoFinal / perfil.pesoVivo) * 100 : 0,
    ndtKg,
    ndtPercentualDieta: ndtPercentual,
    proteinaBrutaKg: pbGramas / 1000,
    proteinaBrutaPercentualDieta: pbPercentual,
    proteinaBrutaGramas: pbGramas,
    proteinaAjustadaAoPiso: ajustadaAoPiso,
    energiaLiquidaMantenca: energiaMantenca(perfil),
    energiaLiquidaGanho: energiaRetida(perfil, ganho),
    energiaMetabolizavel: ndtKg * CONSTANTES.mcalPorKgNDT * CONSTANTES.emSobreEd,
    proteinaMetabolizavelMantenca: pmMantenca,
    proteinaMetabolizavelGanho: pmGanho,
    proteinaMetabolizavelTotal: pmTotal,
    alertas,
  };
}

// ------------------------------------------- ganho esperado de uma dieta pronta

/** Ganho diário sustentado pela energia de uma dieta já definida. */
export function ganhoPorEnergia(perfil: PerfilAnimal, consumoMS: number, ndtKg: number): number {
  if (consumoMS <= 0) return 0;
  const bruto = (ndtKg / consumoMS) * 100;
  const ndtPercentual = Math.min(Math.max(bruto, CONSTANTES.ndtMinimo), CONSTANTES.ndtMaximo);
  const elmDieta = elMantencaDieta(ndtPercentual);
  const elgDieta = elGanhoDieta(ndtPercentual);
  if (elmDieta <= 0 || elgDieta <= 0) return 0;
  const sobra = consumoMS - energiaMantenca(perfil) / elmDieta;
  if (sobra <= 0) return 0;
  return ganhoAPartirDaEnergiaRetida(perfil, sobra * elgDieta);
}

/** Ganho diário sustentado pela proteína de uma dieta já definida. */
export function ganhoPorProteina(
  perfil: PerfilAnimal,
  ndtKg: number,
  proteinaBrutaKg: number,
): number {
  const pbGramas = proteinaBrutaKg * 1000;
  const microbiana = CONSTANTES.proteinaMicrobianaPorNDT * ndtKg;
  const pdrUsada = Math.min(pbGramas, microbiana);
  const pndr = Math.max(0, pbGramas - microbiana);
  const pmDisponivel =
    CONSTANTES.eficienciaProteinaMicrobiana * pdrUsada +
    CONSTANTES.eficienciaProteinaNaoDegradavel * pndr;
  const sobra = pmDisponivel - proteinaMetabolizavelMantenca(perfil);
  if (sobra <= 0) return 0;

  // A exigência de PM cresce com o ganho, então o ganho compatível sai de
  // uma busca binária.
  let baixo = 0.0;
  let alto = 3.0;
  for (let i = 0; i < 60; i += 1) {
    const meio = (baixo + alto) / 2;
    if (proteinaMetabolizavelGanho(perfil, meio) < sobra) baixo = meio;
    else alto = meio;
  }
  return (baixo + alto) / 2;
}

/** Avalia uma dieta pronta e indica qual nutriente limita o desempenho. */
export function ganhoEsperado(
  perfil: PerfilAnimal,
  consumoMS: number,
  ndtKg: number,
  proteinaBrutaKg: number,
): GanhoEsperado {
  const porEnergia = ganhoPorEnergia(perfil, consumoMS, ndtKg);
  const porProteina = ganhoPorProteina(perfil, ndtKg, proteinaBrutaKg);

  let nutrienteLimitante: string;
  if (Math.abs(porEnergia - porProteina) < 0.02) {
    nutrienteLimitante = "Energia e proteína equilibradas";
  } else if (porEnergia < porProteina) {
    nutrienteLimitante = "Energia (NDT)";
  } else {
    nutrienteLimitante = "Proteína (PB)";
  }

  return {
    porEnergia,
    porProteina,
    nutrienteLimitante,
    ganho: Math.min(porEnergia, porProteina),
  };
}
