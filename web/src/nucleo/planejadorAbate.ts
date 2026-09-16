/**
 * Projeta o consumo de insumos e a data de abate, período a período.
 *
 * Porte de `Core/Calculo/PlanejadorAbate.swift`, do antigo aplicativo de iPhone.
 *
 * A cada período o peso médio avança conforme a meta de ganho, as exigências
 * são recalculadas no peso médio do intervalo e a ração é reformulada - por
 * isso o consumo cresce ao longo do ciclo.
 */
import { converterPelaEmbalagem, type ConversaoSacas } from "./conversorSacas.js";
import { numero } from "./formatadores.js";
import type { Insumo } from "./insumo.js";
import {
  consumoMateriaSeca as msDaComposicao,
  formular,
  itemCustoDiario,
  itemMateriaNatural,
  type ComposicaoRacao,
  type SelecaoInsumos,
} from "./formuladorRacao.js";
import {
  custoCompraLote as compraDoLote,
  custoCompraPorAnimal as compraPorCabeca,
  dataReferencia,
  perfilParaPeso,
  pesoAtual,
  type Lote,
} from "./lote.js";
import { calcular, type ExigenciaDiaria } from "./motorExigencias.js";

/** Quantidade de um insumo consumida em um período. */
export interface ConsumoInsumo {
  insumo: Insumo;
  kgMateriaNatural: number;
  kgMateriaSeca: number;
  custo: number;
}

export const consumoConversao = (c: ConsumoInsumo): ConversaoSacas | null =>
  converterPelaEmbalagem(c.kgMateriaNatural, c.insumo.embalagem);

export const consumoToneladas = (c: ConsumoInsumo) => c.kgMateriaNatural / 1000;

/** Um período do planejamento (por padrão 30 dias). */
export interface PeriodoPlano {
  id: number;
  dataInicio: Date;
  dataFim: Date;
  dias: number;
  pesoInicial: number;
  pesoFinal: number;
  pesoMedio: number;
  exigencia: ExigenciaDiaria;
  composicao: ComposicaoRacao;
  consumos: ConsumoInsumo[];
  animais: number;
}

export const tituloPeriodo = (p: PeriodoPlano) => `Período ${p.id}`;
export const ganhoNoPeriodo = (p: PeriodoPlano) => p.pesoFinal - p.pesoInicial;
export const custoPeriodo = (p: PeriodoPlano) => p.consumos.reduce((t, c) => t + c.custo, 0);
export const materiaSecaPeriodo = (p: PeriodoPlano) =>
  p.exigencia.consumoMateriaSeca * p.dias * p.animais;
export const materiaNaturalPeriodo = (p: PeriodoPlano) =>
  p.consumos.reduce((t, c) => t + c.kgMateriaNatural, 0);

export function custoPorAnimalDiaPeriodo(p: PeriodoPlano): number {
  const base = p.dias * p.animais;
  return base > 0 ? custoPeriodo(p) / base : 0;
}

/** Planejamento completo do lote até o abate. */
export interface RelatorioPlanejamento {
  lote: Lote;
  periodos: PeriodoPlano[];
  totais: ConsumoInsumo[];
  alertas: string[];

  pesoInicial: number;
  pesoAlvo: number;
  dataInicio: Date;
  dataAbate: Date;
  diasTotais: number;
  animais: number;
}

// -------------------------------------------------- leituras do planejamento

export const viavel = (r: RelatorioPlanejamento) => r.diasTotais > 0 && r.periodos.length > 0;

export const ganhoPorAnimal = (r: RelatorioPlanejamento) => Math.max(0, r.pesoAlvo - r.pesoInicial);
export const ganhoTotalLote = (r: RelatorioPlanejamento) => ganhoPorAnimal(r) * r.animais;

export const pesoCarcacaInicial = (r: RelatorioPlanejamento) =>
  r.pesoInicial * r.lote.rendimentoCarcaca;
export const pesoCarcacaFinal = (r: RelatorioPlanejamento) => r.pesoAlvo * r.lote.rendimentoCarcaca;
export const arrobasIniciais = (r: RelatorioPlanejamento) => pesoCarcacaInicial(r) / 15;
export const arrobasFinais = (r: RelatorioPlanejamento) => pesoCarcacaFinal(r) / 15;
export const arrobasProduzidasPorAnimal = (r: RelatorioPlanejamento) =>
  arrobasFinais(r) - arrobasIniciais(r);
export const arrobasProduzidasLote = (r: RelatorioPlanejamento) =>
  arrobasProduzidasPorAnimal(r) * r.animais;
export const arrobasTotaisLote = (r: RelatorioPlanejamento) => arrobasFinais(r) * r.animais;

export const materiaSecaTotal = (r: RelatorioPlanejamento) =>
  r.periodos.reduce((t, p) => t + materiaSecaPeriodo(p), 0);
export const materiaNaturalTotal = (r: RelatorioPlanejamento) =>
  r.totais.reduce((t, c) => t + c.kgMateriaNatural, 0);
export const custoTotal = (r: RelatorioPlanejamento) => r.totais.reduce((t, c) => t + c.custo, 0);

export const custoPorAnimal = (r: RelatorioPlanejamento) =>
  r.animais > 0 ? custoTotal(r) / r.animais : 0;

export function custoPorAnimalDia(r: RelatorioPlanejamento): number {
  const base = r.diasTotais * r.animais;
  return base > 0 ? custoTotal(r) / base : 0;
}

export function custoPorArroba(r: RelatorioPlanejamento): number {
  const arrobas = arrobasProduzidasLote(r);
  return arrobas > 0 ? custoTotal(r) / arrobas : 0;
}

export function custoPorKgGanho(r: RelatorioPlanejamento): number {
  const ganho = ganhoTotalLote(r);
  return ganho > 0 ? custoTotal(r) / ganho : 0;
}

// ------------------------------------------------- previsão de resultado
//
// A conta é a do pecuarista: o que saiu do bolso na compra, mais o que a
// dieta vai custar até o abate, contra o que o animal vale na venda. Nada
// além disso entra aqui - sanidade, transporte, pastagem, mão de obra e
// impostos ficam de fora, e é por isso que o resultado se chama previsto.

/** Se dá para projetar resultado: sem preço de venda não há receita. */
export const temPrecos = (r: RelatorioPlanejamento) => r.lote.precoArrobaVenda > 0;

/** O que foi pago por animal na entrada do lote. */
export const compraPorAnimal = (r: RelatorioPlanejamento) => compraPorCabeca(r.lote);
export const compraTotal = (r: RelatorioPlanejamento) => compraDoLote(r.lote);

/** Compra mais dieta: o dinheiro investido no animal até o abate. */
export const investimentoPorAnimal = (r: RelatorioPlanejamento) =>
  compraPorAnimal(r) + custoPorAnimal(r);
export const investimentoTotal = (r: RelatorioPlanejamento) => compraTotal(r) + custoTotal(r);

/** Receita da venda, pelo preço de arroba informado no lote. */
export const receitaPorAnimal = (r: RelatorioPlanejamento) =>
  arrobasFinais(r) * r.lote.precoArrobaVenda;
export const receitaTotal = (r: RelatorioPlanejamento) => receitaPorAnimal(r) * r.animais;

export const lucroPorAnimal = (r: RelatorioPlanejamento) =>
  receitaPorAnimal(r) - investimentoPorAnimal(r);
export const lucroTotal = (r: RelatorioPlanejamento) => receitaTotal(r) - investimentoTotal(r);

/** Lucro como fatia da venda (%). */
export function margemSobreReceita(r: RelatorioPlanejamento): number {
  const receita = receitaTotal(r);
  return receita > 0 ? (lucroTotal(r) / receita) * 100 : 0;
}

/** Lucro sobre o dinheiro investido (%), que é o retorno do ciclo. */
export function retornoSobreInvestimento(r: RelatorioPlanejamento): number {
  const investido = investimentoTotal(r);
  return investido > 0 ? (lucroTotal(r) / investido) * 100 : 0;
}

export function lucroPorArrobaProduzida(r: RelatorioPlanejamento): number {
  const arrobas = arrobasProduzidasLote(r);
  return arrobas > 0 ? lucroTotal(r) / arrobas : 0;
}

/**
 * Preço de arroba em que o ciclo empata.
 *
 * Abaixo dele a venda não paga a compra mais a dieta. É o número que decide
 * se vale segurar o lote ou vender antes.
 */
export function precoArrobaEquilibrio(r: RelatorioPlanejamento): number {
  const arrobas = arrobasTotaisLote(r);
  return arrobas > 0 ? investimentoTotal(r) / arrobas : 0;
}

/**
 * Resultado só da engorda: as arrobas que a dieta produziu, ao preço de
 * venda, menos o que a dieta custou.
 *
 * Separa o mérito da ração do mérito da compra. Pode dar positivo num lote
 * que perde dinheiro no todo (compra cara) e negativo num que ganha (compra
 * barata), e é o número que responde se a dieta se paga.
 */
export const receitaDaEngorda = (r: RelatorioPlanejamento) =>
  arrobasProduzidasLote(r) * r.lote.precoArrobaVenda;
export const margemDaEngorda = (r: RelatorioPlanejamento) =>
  receitaDaEngorda(r) - custoTotal(r);
export function margemDaEngordaPorAnimal(r: RelatorioPlanejamento): number {
  return r.animais > 0 ? margemDaEngorda(r) / r.animais : 0;
}

/** Preço de arroba em que a dieta apenas se paga, ignorando a compra. */
export function precoArrobaEquilibrioEngorda(r: RelatorioPlanejamento): number {
  const arrobas = arrobasProduzidasLote(r);
  return arrobas > 0 ? custoTotal(r) / arrobas : 0;
}

/** Quilos de matéria seca por quilo de peso vivo ganho. */
export function conversaoAlimentar(r: RelatorioPlanejamento): number {
  const ganho = ganhoTotalLote(r);
  return ganho > 0 ? materiaSecaTotal(r) / ganho : 0;
}

export function consumoMedioMateriaSeca(r: RelatorioPlanejamento): number {
  const base = r.diasTotais * r.animais;
  return base > 0 ? materiaSecaTotal(r) / base : 0;
}

/** Média ponderada pela matéria seca de cada período. */
function mediaPonderada(
  r: RelatorioPlanejamento,
  leitura: (p: PeriodoPlano) => number,
): number {
  const materiaSeca = r.periodos.reduce(
    (t, p) => t + p.exigencia.consumoMateriaSeca * p.dias * p.animais,
    0,
  );
  if (!(materiaSeca > 0)) return 0;
  const soma = r.periodos.reduce((t, p) => t + leitura(p) * p.dias * p.animais, 0);
  return (soma / materiaSeca) * 100;
}

/** Teor médio de NDT da dieta planejada (% da matéria seca). */
export const ndtMedioDieta = (r: RelatorioPlanejamento) =>
  mediaPonderada(r, (p) => p.exigencia.ndtKg);

/** Teor médio de proteína bruta da dieta planejada (% da matéria seca). */
export const pbMedioDieta = (r: RelatorioPlanejamento) =>
  mediaPonderada(r, (p) => p.exigencia.proteinaBrutaKg);

/** Concentrado previsto para o ciclo, em kg de matéria natural. */
export const concentradoTotalMN = (r: RelatorioPlanejamento) =>
  r.totais
    .filter((c) => c.insumo.categoria === "energetico" || c.insumo.categoria === "proteico")
    .reduce((t, c) => t + c.kgMateriaNatural, 0);

export function relatorioVazio(lote: Lote, alertas: string[]): RelatorioPlanejamento {
  return {
    lote,
    periodos: [],
    totais: [],
    alertas,
    pesoInicial: pesoAtual(lote),
    pesoAlvo: lote.pesoAlvoAbate,
    dataInicio: dataReferencia(lote),
    dataAbate: dataReferencia(lote),
    diasTotais: 0,
    animais: lote.quantidadeAnimais,
  };
}

// ---------------------------------------------------------------- projeção

export const MAXIMO_PERIODOS = 120;

export function somarDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * 86_400_000);
}

/** Soma os consumos de todos os períodos, insumo a insumo. */
export function consolidarTotais(periodos: readonly PeriodoPlano[]): ConsumoInsumo[] {
  const ordem: string[] = [];
  const acumulado = new Map<string, ConsumoInsumo>();

  for (const periodo of periodos) {
    for (const consumo of periodo.consumos) {
      const chave = consumo.insumo.id;
      const existente = acumulado.get(chave);
      if (existente) {
        existente.kgMateriaNatural += consumo.kgMateriaNatural;
        existente.kgMateriaSeca += consumo.kgMateriaSeca;
        existente.custo += consumo.custo;
      } else {
        ordem.push(chave);
        acumulado.set(chave, { ...consumo });
      }
    }
  }

  return ordem.flatMap((id) => {
    const c = acumulado.get(id);
    return c ? [c] : [];
  });
}

export function projetar(lote: Lote, selecao: SelecaoInsumos): RelatorioPlanejamento {
  const alertas: string[] = [];

  if (!(lote.quantidadeAnimais > 0)) {
    return relatorioVazio(lote, ["Informe a quantidade de animais do lote."]);
  }
  if (!(lote.ganhoMetaDiario > 0)) {
    return relatorioVazio(lote, [
      "Defina uma meta de ganho maior que zero para projetar o abate.",
    ]);
  }

  const pesoInicial = pesoAtual(lote);
  if (!(lote.pesoAlvoAbate > pesoInicial)) {
    return relatorioVazio(lote, ["O lote já atingiu o peso alvo de abate."]);
  }

  const ganho = lote.ganhoMetaDiario;
  const diasTotais = (lote.pesoAlvoAbate - pesoInicial) / ganho;
  const diasPorPeriodo = Math.max(1, lote.diasPorPeriodo);
  const dataInicio = dataReferencia(lote);

  const periodos: PeriodoPlano[] = [];
  let peso = pesoInicial;
  let diasAcumulados = 0;
  let indice = 1;

  while (diasAcumulados < diasTotais - 0.001 && indice <= MAXIMO_PERIODOS) {
    const dias = Math.min(diasPorPeriodo, diasTotais - diasAcumulados);
    const pesoFinal = peso + ganho * dias;
    const pesoMedio = peso + (ganho * dias) / 2;

    const perfil = perfilParaPeso(lote, pesoMedio, true);
    const exigencia = calcular(perfil, ganho);
    const composicao = formular(exigencia, selecao, lote.restricoes);

    const fator = dias * lote.quantidadeAnimais;
    const consumos: ConsumoInsumo[] = composicao.itens.map((item) => ({
      insumo: item.insumo,
      kgMateriaNatural: itemMateriaNatural(item) * fator,
      kgMateriaSeca: item.kgMateriaSeca * fator,
      custo: itemCustoDiario(item) * fator,
    }));

    periodos.push({
      id: indice,
      dataInicio: somarDias(dataInicio, diasAcumulados),
      dataFim: somarDias(dataInicio, diasAcumulados + dias),
      dias,
      pesoInicial: peso,
      pesoFinal,
      pesoMedio,
      exigencia,
      composicao,
      consumos,
      animais: lote.quantidadeAnimais,
    });

    if (!exigencia.metaAtingivel) {
      alertas.push(
        `No período ${indice} (peso médio ${numero(pesoMedio, 0)} kg) a meta de ganho ` +
          "não é alcançável com dieta prática.",
      );
    }

    peso = pesoFinal;
    diasAcumulados += dias;
    indice += 1;
  }

  if (indice > MAXIMO_PERIODOS && diasAcumulados < diasTotais - 0.001) {
    alertas.push(
      `Projeção limitada a ${MAXIMO_PERIODOS} períodos. ` +
        "Aumente os dias por período para ver o ciclo completo.",
    );
  }

  const totais = consolidarTotais(periodos);
  const alertasComposicao = [...new Set(periodos.flatMap((p) => p.composicao.alertas))];
  if (periodos.some((p) => p.composicao.status === "restrita")) {
    alertas.push(
      "A ração de pelo menos um período foi ajustada aos limites de volumoso. " +
        "Confira a aba Ração.",
    );
  }
  alertas.push(...alertasComposicao.sort().slice(0, 3));

  return {
    lote,
    periodos,
    totais,
    alertas,
    pesoInicial,
    pesoAlvo: lote.pesoAlvoAbate,
    dataInicio,
    dataAbate: somarDias(dataInicio, diasTotais),
    diasTotais,
    animais: lote.quantidadeAnimais,
  };
}

// Reexportado para quem só precisa da leitura da composição do período.
export { msDaComposicao as materiaSecaDaComposicao };
