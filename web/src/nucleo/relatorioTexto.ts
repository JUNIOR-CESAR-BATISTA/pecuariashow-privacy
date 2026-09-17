/**
 * Gera a versão em texto do planejamento, para compartilhar ou imprimir.
 *
 * Porte de `Core/Calculo/RelatorioTexto.swift`, do antigo aplicativo de iPhone.
 */
import { FASES, GRUPOS, MODOS_COMPRA, SISTEMAS } from "./classificacoes.js";
import { descricao as descricaoConversao, descricaoCompra } from "./conversorSacas.js";
import {
  arroba,
  data as formatarData,
  duracao,
  gramas,
  kg as formatarKg,
  moeda,
  numero,
  percentual,
} from "./formatadores.js";
import { arrobasCompra, custoCompraPorAnimal } from "./lote.js";
import {
  arrobasFinais,
  arrobasProduzidasLote,
  arrobasProduzidasPorAnimal,
  consumoConversao,
  conversaoAlimentar,
  custoPorAnimal,
  custoPorAnimalDia,
  custoPorArroba,
  custoPorKgGanho,
  custoPeriodo,
  custoTotal,
  compraTotal,
  ganhoPorAnimal,
  ganhoTotalLote,
  investimentoPorAnimal,
  investimentoTotal,
  lucroPorAnimal,
  lucroPorArrobaProduzida,
  lucroTotal,
  margemDaEngorda,
  margemSobreReceita,
  pesoCarcacaFinal,
  precoArrobaEquilibrio,
  receitaPorAnimal,
  receitaTotal,
  resumosPorEtapa,
  retornoSobreInvestimento,
  temDuasEtapas,
  temPrecos,
  tituloPeriodo,
  viavel,
  consumoToneladas,
  type RelatorioPlanejamento,
} from "./planejadorAbate.js";

export function gerar(relatorio: RelatorioPlanejamento): string {
  const lote = relatorio.lote;
  const linhas: string[] = [];

  linhas.push("PLANEJAMENTO NUTRICIONAL E DE ABATE");
  linhas.push("=".repeat(42));
  linhas.push(`Lote: ${lote.nome}`);
  linhas.push(`Animais: ${relatorio.animais} cabeças`);
  linhas.push(
    `Categoria: novilhas - ${FASES[lote.fase].nome} - ${GRUPOS[lote.grupoGenetico].nomeCurto}`,
  );
  linhas.push(`Sistema: ${SISTEMAS[lote.sistema].nome}`);
  linhas.push("");

  if (!viavel(relatorio)) {
    linhas.push("Sem projeção disponível.");
    linhas.push(...relatorio.alertas.map((a) => `- ${a}`));
    return linhas.join("\n");
  }

  linhas.push("METAS");
  linhas.push(`Peso atual: ${formatarKg(relatorio.pesoInicial)}`);
  linhas.push(`Peso alvo de abate: ${formatarKg(relatorio.pesoAlvo)}`);
  linhas.push(`Ganho médio diário: ${numero(lote.ganhoMetaDiario, 3)} kg/dia`);
  linhas.push(
    `Período: ${duracao(relatorio.diasTotais)} (${numero(relatorio.diasTotais, 0)} dias)`,
  );
  linhas.push(`Início: ${formatarData(relatorio.dataInicio)}`);
  linhas.push(`Abate previsto: ${formatarData(relatorio.dataAbate)}`);
  linhas.push("");

  linhas.push("PRODUÇÃO PREVISTA");
  linhas.push(`Ganho por animal: ${formatarKg(ganhoPorAnimal(relatorio))}`);
  linhas.push(`Ganho do lote: ${formatarKg(ganhoTotalLote(relatorio))}`);
  linhas.push(`Rendimento de carcaça: ${percentual(lote.rendimentoCarcaca * 100)}`);
  linhas.push(
    `Carcaça por animal: ${formatarKg(pesoCarcacaFinal(relatorio))} ` +
      `(${arroba(arrobasFinais(relatorio))})`,
  );
  linhas.push(
    `Arrobas produzidas por animal: ${arroba(arrobasProduzidasPorAnimal(relatorio))}`,
  );
  linhas.push(`Arrobas produzidas no lote: ${arroba(arrobasProduzidasLote(relatorio))}`);
  linhas.push(`Arrobas totais no abate: ${arroba(arrobasFinais(relatorio) * relatorio.animais)}`);
  linhas.push(
    `Conversão alimentar: ${numero(conversaoAlimentar(relatorio))} kg MS por kg de ganho`,
  );
  linhas.push("");

  if (temDuasEtapas(relatorio)) {
    linhas.push("ETAPAS DA DIETA");
    for (const etapa of resumosPorEtapa(relatorio)) {
      linhas.push(
        `${etapa.nome}: ${formatarKg(etapa.pesoInicial)} a ${formatarKg(etapa.pesoFinal)}, ` +
          `${numero(etapa.ganhoDiario, 3)} kg/dia, ${numero(etapa.dias, 0)} dias`,
      );
      for (const total of etapa.totais) {
        const conversao = consumoConversao(total);
        let texto = `  - ${total.insumo.nome}: ${numero(total.kgMateriaNatural, 0)} kg`;
        if (conversao) texto += ` = ${descricaoCompra(conversao)}`;
        linhas.push(texto);
      }
      if (etapa.custo > 0) linhas.push(`  Custo da etapa: ${moeda(etapa.custo)}`);
    }
    linhas.push("");
  }

  linhas.push("INSUMOS DO CICLO COMPLETO");
  for (const total of relatorio.totais) {
    linhas.push(`- ${total.insumo.nome}`);
    linhas.push(
      `    ${numero(total.kgMateriaNatural, 0)} kg naturais ` +
        `(${numero(consumoToneladas(total), 2)} t)`,
    );
    const conversao = consumoConversao(total);
    if (conversao) {
      linhas.push(
        `    ${descricaoConversao(conversao)} - comprar ${descricaoCompra(conversao)}`,
      );
    } else {
      linhas.push("    fornecido no pastejo");
    }
    if (total.custo > 0) linhas.push(`    custo ${moeda(total.custo)}`);
  }
  linhas.push("");

  if (custoTotal(relatorio) > 0) {
    linhas.push("CUSTOS");
    linhas.push(`Custo total do ciclo: ${moeda(custoTotal(relatorio))}`);
    linhas.push(`Custo por animal: ${moeda(custoPorAnimal(relatorio))}`);
    linhas.push(`Custo por animal por dia: ${moeda(custoPorAnimalDia(relatorio))}`);
    linhas.push(`Custo por quilo ganho: ${moeda(custoPorKgGanho(relatorio))}`);
    linhas.push(`Custo por arroba produzida: ${moeda(custoPorArroba(relatorio))}`);
    linhas.push("");
  }

  if (temPrecos(relatorio)) {
    const modo = MODOS_COMPRA[lote.modoCompra];
    linhas.push("RESULTADO PREVISTO");
    linhas.push(
      `Compra: ${moeda(lote.precoCompra)} ${modo.porQue}` +
        (lote.modoCompra === "porArroba" ? ` (${arroba(arrobasCompra(lote))})` : ""),
    );
    linhas.push(`Venda: ${moeda(lote.precoArrobaVenda)} por arroba`);
    linhas.push("");
    linhas.push(`Compra por animal: ${moeda(custoCompraPorAnimal(lote))}`);
    linhas.push(`Dieta por animal: ${moeda(custoPorAnimal(relatorio))}`);
    linhas.push(`Investido por animal: ${moeda(investimentoPorAnimal(relatorio))}`);
    linhas.push(`Venda por animal: ${moeda(receitaPorAnimal(relatorio))}`);
    linhas.push(`Lucro por animal: ${moeda(lucroPorAnimal(relatorio))}`);
    linhas.push("");
    linhas.push(`Compra do lote: ${moeda(compraTotal(relatorio))}`);
    linhas.push(`Dieta do lote: ${moeda(custoTotal(relatorio))}`);
    linhas.push(`Investido no lote: ${moeda(investimentoTotal(relatorio))}`);
    linhas.push(`Venda do lote: ${moeda(receitaTotal(relatorio))}`);
    linhas.push(`Lucro do lote: ${moeda(lucroTotal(relatorio))}`);
    linhas.push("");
    linhas.push(`Margem sobre a venda: ${percentual(margemSobreReceita(relatorio))}`);
    linhas.push(`Retorno sobre o investido: ${percentual(retornoSobreInvestimento(relatorio))}`);
    linhas.push(`Lucro por arroba produzida: ${moeda(lucroPorArrobaProduzida(relatorio))}`);
    linhas.push(`Arroba de equilíbrio: ${moeda(precoArrobaEquilibrio(relatorio))}`);
    linhas.push(`Resultado só da engorda: ${moeda(margemDaEngorda(relatorio))}`);
    if (!(lote.precoCompra > 0)) {
      linhas.push("Sem preço de compra informado: o resultado conta apenas a dieta.");
    }
    linhas.push(
      "Não entram sanidade, transporte, pastagem, mão de obra nem impostos.",
    );
    linhas.push("");
  }

  linhas.push("PERÍODOS");
  for (const periodo of relatorio.periodos) {
    linhas.push(
      `${tituloPeriodo(periodo)}: ${formatarData(periodo.dataInicio)} a ` +
        `${formatarData(periodo.dataFim)} (${numero(periodo.dias, 0)} dias)`,
    );
    linhas.push(
      `  Peso ${numero(periodo.pesoInicial, 0)} a ${numero(periodo.pesoFinal, 0)} kg`,
    );
    linhas.push(
      `  Exigência diária por animal: MS ${formatarKg(periodo.exigencia.consumoMateriaSeca)}, ` +
        `PB ${gramas(periodo.exigencia.proteinaBrutaGramas)}, ` +
        `NDT ${formatarKg(periodo.exigencia.ndtKg)}`,
    );
    linhas.push(
      `  Dieta: ${percentual(periodo.exigencia.proteinaBrutaPercentualDieta)} PB e ` +
        `${percentual(periodo.exigencia.ndtPercentualDieta)} NDT na matéria seca`,
    );
    for (const consumo of periodo.consumos) {
      let texto = `  - ${consumo.insumo.nome}: ${numero(consumo.kgMateriaNatural, 0)} kg`;
      const conversao = consumoConversao(consumo);
      if (conversao) texto += ` = ${descricaoConversao(conversao)}`;
      linhas.push(texto);
    }
    const custo = custoPeriodo(periodo);
    if (custo > 0) linhas.push(`  Custo do período: ${moeda(custo)}`);
  }

  if (relatorio.alertas.length > 0) {
    linhas.push("");
    linhas.push("OBSERVAÇÕES");
    linhas.push(...relatorio.alertas.map((a) => `- ${a}`));
  }

  linhas.push("");
  linhas.push(
    "Gerado pelo NovilhaNutri. Cálculos de referência; ajuste conforme o desempenho " +
      "observado e a orientação do responsável técnico.",
  );
  return linhas.join("\n");
}
