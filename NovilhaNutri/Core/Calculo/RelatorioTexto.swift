import Foundation

/// Gera a versão em texto do planejamento, para compartilhar ou imprimir.
enum RelatorioTexto {

    static func gerar(_ relatorio: RelatorioPlanejamento) -> String {
        let lote = relatorio.lote
        var linhas: [String] = []

        linhas.append("PLANEJAMENTO NUTRICIONAL E DE ABATE")
        linhas.append(String(repeating: "=", count: 42))
        linhas.append("Lote: \(lote.nome)")
        linhas.append("Animais: \(relatorio.animais) cabeças")
        linhas.append("Categoria: novilhas - \(lote.fase.nome) - \(lote.grupoGenetico.nomeCurto)")
        linhas.append("Sistema: \(lote.sistema.nome)")
        linhas.append("")

        guard relatorio.viavel else {
            linhas.append("Sem projeção disponível.")
            linhas.append(contentsOf: relatorio.alertas.map { "- " + $0 })
            return linhas.joined(separator: "\n")
        }

        linhas.append("METAS")
        linhas.append("Peso atual: \(Formatadores.kg(relatorio.pesoInicial))")
        linhas.append("Peso alvo de abate: \(Formatadores.kg(relatorio.pesoAlvo))")
        linhas.append("Ganho médio diário: \(Formatadores.numero(lote.ganhoMetaDiario, casas: 3)) kg/dia")
        linhas.append("Período: \(Formatadores.duracao(dias: relatorio.diasTotais)) (\(Formatadores.numero(relatorio.diasTotais, casas: 0)) dias)")
        linhas.append("Início: \(Formatadores.data(relatorio.dataInicio))")
        linhas.append("Abate previsto: \(Formatadores.data(relatorio.dataAbate))")
        linhas.append("")

        linhas.append("PRODUÇÃO PREVISTA")
        linhas.append("Ganho por animal: \(Formatadores.kg(relatorio.ganhoPorAnimal))")
        linhas.append("Ganho do lote: \(Formatadores.kg(relatorio.ganhoTotalLote))")
        linhas.append("Rendimento de carcaça: \(Formatadores.percentual(lote.rendimentoCarcaca * 100))")
        linhas.append("Carcaça por animal: \(Formatadores.kg(relatorio.pesoCarcacaFinal)) (\(Formatadores.arroba(relatorio.arrobasFinais)))")
        linhas.append("Arrobas produzidas por animal: \(Formatadores.arroba(relatorio.arrobasProduzidasPorAnimal))")
        linhas.append("Arrobas produzidas no lote: \(Formatadores.arroba(relatorio.arrobasProduzidasLote))")
        linhas.append("Arrobas totais no abate: \(Formatadores.arroba(relatorio.arrobasTotaisLote))")
        linhas.append("Conversão alimentar: \(Formatadores.numero(relatorio.conversaoAlimentar)) kg MS por kg de ganho")
        linhas.append("")

        linhas.append("INSUMOS DO CICLO COMPLETO")
        for total in relatorio.totais {
            linhas.append("- \(total.insumo.nome)")
            linhas.append("    \(Formatadores.numero(total.kgMateriaNatural, casas: 0)) kg naturais (\(Formatadores.numero(total.toneladas, casas: 2)) t)")
            if let conversao = total.conversao {
                linhas.append("    \(conversao.descricao) - comprar \(conversao.descricaoCompra)")
            } else {
                linhas.append("    fornecido no pastejo")
            }
            if total.custo > 0 {
                linhas.append("    custo \(Formatadores.moeda(total.custo))")
            }
        }
        linhas.append("")

        if relatorio.custoTotal > 0 {
            linhas.append("CUSTOS")
            linhas.append("Custo total do ciclo: \(Formatadores.moeda(relatorio.custoTotal))")
            linhas.append("Custo por animal: \(Formatadores.moeda(relatorio.custoPorAnimal))")
            linhas.append("Custo por animal por dia: \(Formatadores.moeda(relatorio.custoPorAnimalDia))")
            linhas.append("Custo por quilo ganho: \(Formatadores.moeda(relatorio.custoPorKgGanho))")
            linhas.append("Custo por arroba produzida: \(Formatadores.moeda(relatorio.custoPorArroba))")
            linhas.append("")
        }

        if relatorio.temPrecos {
            let modo = lote.modoCompra
            linhas.append("RESULTADO PREVISTO")
            var compra = "Compra: \(Formatadores.moeda(lote.precoCompra)) \(modo.porQue)"
            if modo == .porArroba {
                compra += " (\(Formatadores.arroba(lote.arrobasCompra)))"
            }
            linhas.append(compra)
            linhas.append("Venda: \(Formatadores.moeda(lote.precoArrobaVenda)) por arroba")
            linhas.append("")
            linhas.append("Compra por animal: \(Formatadores.moeda(relatorio.compraPorAnimal))")
            linhas.append("Dieta por animal: \(Formatadores.moeda(relatorio.custoPorAnimal))")
            linhas.append("Investido por animal: \(Formatadores.moeda(relatorio.investimentoPorAnimal))")
            linhas.append("Venda por animal: \(Formatadores.moeda(relatorio.receitaPorAnimal))")
            linhas.append("Lucro por animal: \(Formatadores.moeda(relatorio.lucroPorAnimal))")
            linhas.append("")
            linhas.append("Compra do lote: \(Formatadores.moeda(relatorio.compraTotal))")
            linhas.append("Dieta do lote: \(Formatadores.moeda(relatorio.custoTotal))")
            linhas.append("Investido no lote: \(Formatadores.moeda(relatorio.investimentoTotal))")
            linhas.append("Venda do lote: \(Formatadores.moeda(relatorio.receitaTotal))")
            linhas.append("Lucro do lote: \(Formatadores.moeda(relatorio.lucroTotal))")
            linhas.append("")
            linhas.append("Margem sobre a venda: \(Formatadores.percentual(relatorio.margemSobreReceita))")
            linhas.append("Retorno sobre o investido: \(Formatadores.percentual(relatorio.retornoSobreInvestimento))")
            linhas.append("Lucro por arroba produzida: \(Formatadores.moeda(relatorio.lucroPorArrobaProduzida))")
            linhas.append("Arroba de equilíbrio: \(Formatadores.moeda(relatorio.precoArrobaEquilibrio))")
            linhas.append("Resultado só da engorda: \(Formatadores.moeda(relatorio.margemDaEngorda))")
            if lote.precoCompra <= 0 {
                linhas.append("Sem preço de compra informado: o resultado conta apenas a dieta.")
            }
            if relatorio.custoTotal <= 0 {
                linhas.append("Nenhum alimento do lote tem preço cadastrado: a dieta entra como custo zero.")
            }
            linhas.append("Não entram sanidade, transporte, pastagem, mão de obra nem impostos.")
            linhas.append("")
        }

        linhas.append("PERÍODOS")
        for periodo in relatorio.periodos {
            linhas.append("\(periodo.titulo): \(Formatadores.data(periodo.dataInicio)) a \(Formatadores.data(periodo.dataFim)) (\(Formatadores.numero(periodo.dias, casas: 0)) dias)")
            linhas.append("  Peso \(Formatadores.numero(periodo.pesoInicial, casas: 0)) a \(Formatadores.numero(periodo.pesoFinal, casas: 0)) kg")
            linhas.append("  Exigência diária por animal: MS \(Formatadores.kg(periodo.exigencia.consumoMateriaSeca)), PB \(Formatadores.gramas(periodo.exigencia.proteinaBrutaGramas)), NDT \(Formatadores.kg(periodo.exigencia.ndtKg))")
            linhas.append("  Dieta: \(Formatadores.percentual(periodo.exigencia.proteinaBrutaPercentualDieta)) PB e \(Formatadores.percentual(periodo.exigencia.ndtPercentualDieta)) NDT na matéria seca")
            for consumo in periodo.consumos {
                var texto = "  - \(consumo.insumo.nome): \(Formatadores.numero(consumo.kgMateriaNatural, casas: 0)) kg"
                if let conversao = consumo.conversao {
                    texto += " = \(conversao.descricao)"
                }
                linhas.append(texto)
            }
            if periodo.custo > 0 {
                linhas.append("  Custo do período: \(Formatadores.moeda(periodo.custo))")
            }
        }

        if !relatorio.alertas.isEmpty {
            linhas.append("")
            linhas.append("OBSERVAÇÕES")
            linhas.append(contentsOf: relatorio.alertas.map { "- " + $0 })
        }

        linhas.append("")
        linhas.append("Gerado pelo NovilhaNutri. Cálculos de referência; ajuste conforme o desempenho observado e a orientação do responsável técnico.")
        return linhas.joined(separator: "\n")
    }
}
