import Foundation

/// Gera a versao em texto do planejamento, para compartilhar ou imprimir.
enum RelatorioTexto {

    static func gerar(_ relatorio: RelatorioPlanejamento) -> String {
        let lote = relatorio.lote
        var linhas: [String] = []

        linhas.append("PLANEJAMENTO NUTRICIONAL E DE ABATE")
        linhas.append(String(repeating: "=", count: 42))
        linhas.append("Lote: \(lote.nome)")
        linhas.append("Animais: \(relatorio.animais) cabecas")
        linhas.append("Categoria: novilhas - \(lote.fase.nome) - \(lote.grupoGenetico.nomeCurto)")
        linhas.append("Sistema: \(lote.sistema.nome)")
        linhas.append("")

        guard relatorio.viavel else {
            linhas.append("Sem projecao disponivel.")
            linhas.append(contentsOf: relatorio.alertas.map { "- " + $0 })
            return linhas.joined(separator: "\n")
        }

        linhas.append("METAS")
        linhas.append("Peso atual: \(Formatadores.kg(relatorio.pesoInicial))")
        linhas.append("Peso alvo de abate: \(Formatadores.kg(relatorio.pesoAlvo))")
        linhas.append("Ganho medio diario: \(Formatadores.numero(lote.ganhoMetaDiario, casas: 3)) kg/dia")
        linhas.append("Periodo: \(Formatadores.duracao(dias: relatorio.diasTotais)) (\(Formatadores.numero(relatorio.diasTotais, casas: 0)) dias)")
        linhas.append("Inicio: \(Formatadores.data(relatorio.dataInicio))")
        linhas.append("Abate previsto: \(Formatadores.data(relatorio.dataAbate))")
        linhas.append("")

        linhas.append("PRODUCAO PREVISTA")
        linhas.append("Ganho por animal: \(Formatadores.kg(relatorio.ganhoPorAnimal))")
        linhas.append("Ganho do lote: \(Formatadores.kg(relatorio.ganhoTotalLote))")
        linhas.append("Rendimento de carcaca: \(Formatadores.percentual(lote.rendimentoCarcaca * 100))")
        linhas.append("Carcaca por animal: \(Formatadores.kg(relatorio.pesoCarcacaFinal)) (\(Formatadores.arroba(relatorio.arrobasFinais)))")
        linhas.append("Arrobas produzidas por animal: \(Formatadores.arroba(relatorio.arrobasProduzidasPorAnimal))")
        linhas.append("Arrobas produzidas no lote: \(Formatadores.arroba(relatorio.arrobasProduzidasLote))")
        linhas.append("Arrobas totais no abate: \(Formatadores.arroba(relatorio.arrobasTotaisLote))")
        linhas.append("Conversao alimentar: \(Formatadores.numero(relatorio.conversaoAlimentar)) kg MS por kg de ganho")
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

        linhas.append("PERIODOS")
        for periodo in relatorio.periodos {
            linhas.append("\(periodo.titulo): \(Formatadores.data(periodo.dataInicio)) a \(Formatadores.data(periodo.dataFim)) (\(Formatadores.numero(periodo.dias, casas: 0)) dias)")
            linhas.append("  Peso \(Formatadores.numero(periodo.pesoInicial, casas: 0)) a \(Formatadores.numero(periodo.pesoFinal, casas: 0)) kg")
            linhas.append("  Exigencia diaria por animal: MS \(Formatadores.kg(periodo.exigencia.consumoMateriaSeca)), PB \(Formatadores.gramas(periodo.exigencia.proteinaBrutaGramas)), NDT \(Formatadores.kg(periodo.exigencia.ndtKg))")
            linhas.append("  Dieta: \(Formatadores.percentual(periodo.exigencia.proteinaBrutaPercentualDieta)) PB e \(Formatadores.percentual(periodo.exigencia.ndtPercentualDieta)) NDT na materia seca")
            for consumo in periodo.consumos {
                var texto = "  - \(consumo.insumo.nome): \(Formatadores.numero(consumo.kgMateriaNatural, casas: 0)) kg"
                if let conversao = consumo.conversao {
                    texto += " = \(conversao.descricao)"
                }
                linhas.append(texto)
            }
            if periodo.custo > 0 {
                linhas.append("  Custo do periodo: \(Formatadores.moeda(periodo.custo))")
            }
        }

        if !relatorio.alertas.isEmpty {
            linhas.append("")
            linhas.append("OBSERVACOES")
            linhas.append(contentsOf: relatorio.alertas.map { "- " + $0 })
        }

        linhas.append("")
        linhas.append("Gerado pelo NovilhaNutri. Calculos de referencia; ajuste conforme o desempenho observado e a orientacao do responsavel tecnico.")
        return linhas.joined(separator: "\n")
    }
}
