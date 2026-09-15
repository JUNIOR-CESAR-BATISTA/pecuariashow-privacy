/**
 * Formatação numérica e de datas no padrão brasileiro.
 *
 * Porte de `Core/Formatadores.swift`. O `Intl` do navegador ocupa o lugar do
 * `NumberFormatter`, com a mesma localidade, para os textos saírem idênticos
 * aos do aplicativo de iPhone.
 */

const LOCALE = "pt-BR";

const cacheDecimal = new Map<number, Intl.NumberFormat>();

function decimal(casas: number): Intl.NumberFormat {
  let formatador = cacheDecimal.get(casas);
  if (!formatador) {
    formatador = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    });
    cacheDecimal.set(casas, formatador);
  }
  return formatador;
}

const formatadorMoeda = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "BRL",
});

export function numero(valor: number, casas = 2): string {
  if (!Number.isFinite(valor)) return "-";
  return decimal(casas).format(valor);
}

/** Quilos com duas casas abaixo de 100 kg e sem casas acima disso. */
export function kg(valor: number): string {
  if (!Number.isFinite(valor)) return "-";
  return `${numero(valor, Math.abs(valor) < 100 ? 2 : 0)} kg`;
}

export function gramas(valor: number): string {
  return `${numero(valor, 0)} g`;
}

export function percentual(valor: number, casas = 1): string {
  return `${numero(valor, casas)}%`;
}

export function moeda(valor: number): string {
  if (!Number.isFinite(valor)) return "-";
  return formatadorMoeda.format(valor);
}

export function data(valor: Date): string {
  const dia = String(valor.getDate()).padStart(2, "0");
  const mes = String(valor.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${valor.getFullYear()}`;
}

export function arroba(valor: number): string {
  return `${numero(valor, 2)} @`;
}

/** "8 meses e 12 dias" a partir de uma contagem de dias. */
export function duracao(dias: number): string {
  const total = Math.round(dias);
  if (total <= 0) return "0 dias";
  const meses = Math.floor(total / 30);
  const resto = total % 30;
  const plurializar = (n: number, singular: string, plural: string) =>
    `${n} ${n === 1 ? singular : plural}`;

  if (meses === 0) return plurializar(resto, "dia", "dias");
  if (resto === 0) return plurializar(meses, "mês", "meses");
  return `${plurializar(meses, "mês", "meses")} e ${plurializar(resto, "dia", "dias")}`;
}
