/**
 * O conteúdo completo guardado pelo aplicativo, e a tradução dele para JSON.
 *
 * Porte de `Persistencia/BancoLocal.swift`, com uma exigência a mais: o
 * arquivo tem de ser o mesmo dos dois lados. Um backup exportado no iPhone
 * precisa abrir aqui, e um exportado aqui precisa abrir lá.
 *
 * Duas armadilhas de formato foram resolvidas de propósito:
 *
 * 1. Datas. O Swift grava em ISO 8601 **sem** fração de segundo, e o decodificador
 *    dele recusa a fração. O `toISOString()` do JavaScript sempre inclui os
 *    milissegundos, então eles são removidos na escrita. Na leitura aceitamos
 *    as duas formas.
 *
 * 2. Campos ausentes. A leitura é tolerante, como no Swift, para que arquivos
 *    da versão 1 continuem abrindo. Mas tolerância demais aceitaria qualquer
 *    JSON como um backup vazio - e restaurar vazio apaga tudo. Por isso
 *    `desserializar` exige as marcas que o próprio aplicativo grava.
 */
import { CATALOGO_PADRAO } from "./catalogoInsumos.js";
import type { CicloEncerrado } from "./cicloEncerrado.js";
import { RESTRICOES_PADRAO } from "./formuladorRacao.js";
import type { Insumo } from "./insumo.js";
import type { Lote } from "./lote.js";

export interface DadosApp {
  versao: number;
  lotes: Lote[];
  insumos: Insumo[];
  /** Ciclos já abatidos, que servem de base para os próximos lotes. */
  ciclos: CicloEncerrado[];
  /** Se os novos lotes nascem calibrados pelo histórico. */
  usarCalibracao: boolean;
}

export const VERSAO_ATUAL = 2;

export function dadosIniciais(): DadosApp {
  return {
    versao: VERSAO_ATUAL,
    lotes: [],
    insumos: CATALOGO_PADRAO.map((i) => ({ ...i })),
    ciclos: [],
    usarCalibracao: true,
  };
}

export class ErroBackup extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroBackup";
  }
}

// ------------------------------------------------------------------ datas

/** ISO 8601 sem milissegundos, que é o que o aplicativo de iPhone lê. */
export function paraISO(data: Date): string {
  return data.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function paraData(valor: unknown, campo: string): Date {
  if (typeof valor !== "string") {
    throw new ErroBackup(`O campo ${campo} deveria ser uma data em texto.`);
  }
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw new ErroBackup(`A data em ${campo} não pôde ser lida: "${valor}".`);
  }
  return data;
}

// ------------------------------------------------------------- serialização

type Bruto = Record<string, unknown>;

function loteParaBruto(lote: Lote): Bruto {
  const bruto: Bruto = {
    ...lote,
    dataEntrada: paraISO(lote.dataEntrada),
    pesagens: lote.pesagens.map((p) => ({ ...p, data: paraISO(p.data) })),
  };
  // O Swift omite opcionais nulos; o JSON.stringify faz o mesmo com undefined.
  for (const chave of ["volumosoID", "energeticoID", "proteicoID", "mineralID"]) {
    if (bruto[chave] === undefined) delete bruto[chave];
  }
  if (lote.restricoes.volumosoFixo === undefined) {
    const { volumosoFixo, ...resto } = lote.restricoes;
    void volumosoFixo;
    bruto["restricoes"] = resto;
  }
  return bruto;
}

function cicloParaBruto(ciclo: CicloEncerrado): Bruto {
  return {
    ...ciclo,
    dataInicio: paraISO(ciclo.dataInicio),
    dataAbate: paraISO(ciclo.dataAbate),
  };
}

export function serializar(dados: DadosApp): string {
  return JSON.stringify(
    {
      versao: dados.versao,
      lotes: dados.lotes.map(loteParaBruto),
      insumos: dados.insumos,
      ciclos: dados.ciclos.map(cicloParaBruto),
      usarCalibracao: dados.usarCalibracao,
    },
    null,
    2,
  );
}

// --------------------------------------------------------------- leitura

function comoLista(valor: unknown): Bruto[] {
  return Array.isArray(valor) ? (valor as Bruto[]) : [];
}

function lerLote(bruto: Bruto): Lote {
  return {
    ...(bruto as unknown as Lote),
    dataEntrada: paraData(bruto["dataEntrada"], "lote.dataEntrada"),
    restricoes: { ...RESTRICOES_PADRAO, ...(bruto["restricoes"] as object | undefined) },
    pesagens: comoLista(bruto["pesagens"]).map((p) => ({
      ...(p as unknown as Lote["pesagens"][number]),
      data: paraData(p["data"], "pesagem.data"),
    })),
  };
}

function lerCiclo(bruto: Bruto): CicloEncerrado {
  return {
    ...(bruto as unknown as CicloEncerrado),
    dataInicio: paraData(bruto["dataInicio"], "ciclo.dataInicio"),
    dataAbate: paraData(bruto["dataAbate"], "ciclo.dataAbate"),
  };
}

/**
 * Lê um backup escolhido pelo usuário.
 *
 * Exige as marcas do aplicativo antes de decodificar: sem isso, qualquer JSON
 * viraria um backup vazio, e restaurar um backup vazio apaga o rebanho.
 */
export function desserializar(texto: string): DadosApp {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new ErroBackup("Este arquivo não é um JSON válido.");
  }

  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) {
    throw new ErroBackup("Este arquivo não é um backup do NovilhaNutri.");
  }

  const objeto = bruto as Bruto;
  const temVersao = typeof objeto["versao"] === "number";
  const temConteudo = objeto["lotes"] !== undefined || objeto["insumos"] !== undefined;
  if (!temVersao || !temConteudo) {
    throw new ErroBackup("Este arquivo não é um backup do NovilhaNutri.");
  }

  const insumos = comoLista(objeto["insumos"]) as unknown as Insumo[];

  return {
    versao: objeto["versao"] as number,
    lotes: comoLista(objeto["lotes"]).map(lerLote),
    // Catálogo vazio volta ao padrão, como no aplicativo de iPhone.
    insumos: insumos.length > 0 ? insumos : CATALOGO_PADRAO.map((i) => ({ ...i })),
    ciclos: comoLista(objeto["ciclos"]).map(lerCiclo),
    usarCalibracao:
      typeof objeto["usarCalibracao"] === "boolean" ? objeto["usarCalibracao"] : true,
  };
}
