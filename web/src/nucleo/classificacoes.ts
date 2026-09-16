/**
 * Classificações do domínio.
 *
 * Porte de `Core/Modelos/Classificacoes.swift`. Onde o Swift usa `enum` com
 * propriedades calculadas, aqui há um tipo de união e uma tabela de dados: os
 * valores gravados em disco continuam sendo as mesmas cadeias de texto, então
 * um backup do aplicativo de iPhone é lido por esta versão sem conversão.
 */

// ---------------------------------------------------------------- fase

export type FaseAnimal = "desmama" | "recriaInicial" | "recriaFinal" | "terminacao";

export interface DadosFase {
  readonly nome: string;
  readonly descricao: string;
  readonly pesoMinimo: number;
  readonly pesoMaximo: number;
  /** Piso prático de proteína bruta na matéria seca (%). */
  readonly proteinaMinimaDieta: number;
  /** Participação de volumoso sugerida na matéria seca (fração). */
  readonly volumosoSugerido: number;
  readonly gmdSugerido: number;
}

export const FASES: Record<FaseAnimal, DadosFase> = {
  desmama: {
    nome: "Desmama",
    descricao: "Pós-desmame, 150 a 210 kg",
    pesoMinimo: 150,
    pesoMaximo: 210,
    proteinaMinimaDieta: 13.0,
    volumosoSugerido: 0.65,
    gmdSugerido: 0.55,
  },
  recriaInicial: {
    nome: "Recria inicial",
    descricao: "Crescimento, 210 a 280 kg",
    pesoMinimo: 210,
    pesoMaximo: 280,
    proteinaMinimaDieta: 12.0,
    volumosoSugerido: 0.65,
    gmdSugerido: 0.65,
  },
  recriaFinal: {
    nome: "Recria final",
    descricao: "Crescimento, 280 a 360 kg",
    pesoMinimo: 280,
    pesoMaximo: 360,
    proteinaMinimaDieta: 11.0,
    volumosoSugerido: 0.6,
    gmdSugerido: 0.75,
  },
  terminacao: {
    nome: "Terminação",
    descricao: "Acabamento, acima de 360 kg",
    pesoMinimo: 360,
    pesoMaximo: 600,
    proteinaMinimaDieta: 11.0,
    volumosoSugerido: 0.45,
    gmdSugerido: 0.9,
  },
};

export const TODAS_AS_FASES: readonly FaseAnimal[] = [
  "desmama",
  "recriaInicial",
  "recriaFinal",
  "terminacao",
];

export function faseSugerida(peso: number): FaseAnimal {
  if (peso < 210) return "desmama";
  if (peso < 280) return "recriaInicial";
  if (peso < 360) return "recriaFinal";
  return "terminacao";
}

// ------------------------------------------------------- grupo genético

export type GrupoGenetico = "zebuino" | "cruzado" | "taurino";

export interface DadosGrupo {
  readonly nome: string;
  readonly nomeCurto: string;
  /** Ajuste da exigência de mantença em relação ao padrão taurino. */
  readonly fatorMantenca: number;
  /** Peso de terminação típico das fêmeas, usado no peso equivalente. */
  readonly pesoFinalSugerido: number;
  readonly rendimentoCarcacaSugerido: number;
}

export const GRUPOS: Record<GrupoGenetico, DadosGrupo> = {
  zebuino: {
    nome: "Zebuíno (Nelore e similares)",
    nomeCurto: "Zebuíno",
    fatorMantenca: 0.9,
    pesoFinalSugerido: 430,
    rendimentoCarcacaSugerido: 0.53,
  },
  cruzado: {
    nome: "Cruzado (F1 e compostos)",
    nomeCurto: "Cruzado",
    fatorMantenca: 0.95,
    pesoFinalSugerido: 470,
    rendimentoCarcacaSugerido: 0.54,
  },
  taurino: {
    nome: "Taurino (Angus e similares)",
    nomeCurto: "Taurino",
    fatorMantenca: 1.0,
    pesoFinalSugerido: 500,
    rendimentoCarcacaSugerido: 0.55,
  },
};

export const TODOS_OS_GRUPOS: readonly GrupoGenetico[] = ["zebuino", "cruzado", "taurino"];

// ------------------------------------------------------ sistema de criação

export type SistemaCriacao = "confinamento" | "semiconfinamento" | "pasto";

export interface DadosSistema {
  readonly nome: string;
  readonly descricao: string;
  /** Fator de atividade aplicado à exigência de mantença. */
  readonly fatorAtividade: number;
}

export const SISTEMAS: Record<SistemaCriacao, DadosSistema> = {
  confinamento: {
    nome: "Confinamento",
    descricao: "Animais em curral, sem deslocamento",
    fatorAtividade: 1.0,
  },
  semiconfinamento: {
    nome: "Semiconfinamento",
    descricao: "Pastejo com ração no cocho",
    fatorAtividade: 1.1,
  },
  pasto: {
    nome: "Pasto com suplemento",
    descricao: "Pastejo extensivo, maior deslocamento",
    fatorAtividade: 1.2,
  },
};

export const TODOS_OS_SISTEMAS: readonly SistemaCriacao[] = [
  "confinamento",
  "semiconfinamento",
  "pasto",
];

// ------------------------------------------------------ categoria de insumo

export type CategoriaInsumo = "volumoso" | "energetico" | "proteico" | "mineral";

export const CATEGORIAS: Record<CategoriaInsumo, { readonly nome: string }> = {
  volumoso: { nome: "Volumoso" },
  energetico: { nome: "Energético" },
  proteico: { nome: "Proteico" },
  mineral: { nome: "Mineral / núcleo" },
};

export const TODAS_AS_CATEGORIAS: readonly CategoriaInsumo[] = [
  "volumoso",
  "energetico",
  "proteico",
  "mineral",
];

// --------------------------------------------------------- modo de compra

/** Como o animal foi comprado: por arroba de carcaça ou por cabeça. */
export type ModoCompra = "porArroba" | "porCabeca";

export const MODOS_COMPRA: Record<
  ModoCompra,
  {
    readonly nome: string;
    /** Sufixo do campo de entrada, onde só vai o número. */
    readonly unidade: string;
    /** Para frases: "R$ 300,00 <por arroba de carcaça na entrada>". */
    readonly porQue: string;
    readonly descricao: string;
  }
> = {
  porArroba: {
    nome: "Por arroba",
    unidade: "R$/@",
    porQue: "por arroba de carcaça na entrada",
    descricao: "O preço combinado vale por arroba de carcaça no peso de entrada.",
  },
  porCabeca: {
    nome: "Por cabeça",
    unidade: "R$/cab",
    porQue: "por cabeça",
    descricao: "O preço combinado vale por animal, qualquer que seja o peso.",
  },
};

export const TODOS_OS_MODOS_COMPRA: readonly ModoCompra[] = ["porArroba", "porCabeca"];
