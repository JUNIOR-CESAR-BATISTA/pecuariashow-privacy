import Foundation

/// Quantidade de um insumo consumida em um periodo, ja convertida para sacas.
struct ConsumoInsumo: Identifiable, Hashable {
    var insumo: Insumo
    var kgMateriaNatural: Double
    var kgMateriaSeca: Double
    var custo: Double

    var id: UUID { insumo.id }
    var conversao: ConversaoSacas? {
        ConversorSacas.converter(kg: kgMateriaNatural, embalagem: insumo.embalagem)
    }
    var toneladas: Double { kgMateriaNatural / 1000 }
}

/// Um periodo do planejamento (por padrao 30 dias).
struct PeriodoPlano: Identifiable, Hashable {
    var id: Int
    var dataInicio: Date
    var dataFim: Date
    var dias: Double
    var pesoInicial: Double
    var pesoFinal: Double
    var pesoMedio: Double
    var exigencia: ExigenciaDiaria
    var composicao: ComposicaoRacao
    var consumos: [ConsumoInsumo]
    var animais: Int

    var titulo: String { "Periodo \(id)" }
    var ganhoNoPeriodo: Double { pesoFinal - pesoInicial }
    var custo: Double { consumos.reduce(0) { $0 + $1.custo } }
    var materiaSecaTotal: Double { exigencia.consumoMateriaSeca * dias * Double(animais) }
    var materiaNaturalTotal: Double { consumos.reduce(0) { $0 + $1.kgMateriaNatural } }
    var custoPorAnimalDia: Double {
        let base = dias * Double(animais)
        return base > 0 ? custo / base : 0
    }
}

/// Planejamento completo do lote ate o abate.
struct RelatorioPlanejamento {
    var lote: Lote
    var periodos: [PeriodoPlano]
    var totais: [ConsumoInsumo]
    var alertas: [String]

    var pesoInicial: Double
    var pesoAlvo: Double
    var dataInicio: Date
    var dataAbate: Date
    var diasTotais: Double
    var animais: Int

    var viavel: Bool { diasTotais > 0 && !periodos.isEmpty }

    // MARK: Producao

    var ganhoPorAnimal: Double { max(0, pesoAlvo - pesoInicial) }
    var ganhoTotalLote: Double { ganhoPorAnimal * Double(animais) }

    var pesoCarcacaInicial: Double { pesoInicial * lote.rendimentoCarcaca }
    var pesoCarcacaFinal: Double { pesoAlvo * lote.rendimentoCarcaca }
    var arrobasIniciais: Double { pesoCarcacaInicial / 15 }
    var arrobasFinais: Double { pesoCarcacaFinal / 15 }
    var arrobasProduzidasPorAnimal: Double { arrobasFinais - arrobasIniciais }
    var arrobasProduzidasLote: Double { arrobasProduzidasPorAnimal * Double(animais) }
    var arrobasTotaisLote: Double { arrobasFinais * Double(animais) }

    // MARK: Consumo e custo

    var materiaSecaTotal: Double { periodos.reduce(0) { $0 + $1.materiaSecaTotal } }
    var materiaNaturalTotal: Double { totais.reduce(0) { $0 + $1.kgMateriaNatural } }
    var custoTotal: Double { totais.reduce(0) { $0 + $1.custo } }

    var custoPorAnimal: Double { animais > 0 ? custoTotal / Double(animais) : 0 }
    var custoPorAnimalDia: Double {
        let base = diasTotais * Double(animais)
        return base > 0 ? custoTotal / base : 0
    }
    var custoPorArroba: Double {
        arrobasProduzidasLote > 0 ? custoTotal / arrobasProduzidasLote : 0
    }
    var custoPorKgGanho: Double {
        ganhoTotalLote > 0 ? custoTotal / ganhoTotalLote : 0
    }
    /// Quilos de materia seca por quilo de peso vivo ganho.
    var conversaoAlimentar: Double {
        ganhoTotalLote > 0 ? materiaSecaTotal / ganhoTotalLote : 0
    }
    var consumoMedioMateriaSeca: Double {
        let base = diasTotais * Double(animais)
        return base > 0 ? materiaSecaTotal / base : 0
    }

    static func vazio(lote: Lote, alertas: [String]) -> RelatorioPlanejamento {
        RelatorioPlanejamento(lote: lote,
                              periodos: [],
                              totais: [],
                              alertas: alertas,
                              pesoInicial: lote.pesoAtual,
                              pesoAlvo: lote.pesoAlvoAbate,
                              dataInicio: lote.dataReferencia,
                              dataAbate: lote.dataReferencia,
                              diasTotais: 0,
                              animais: lote.quantidadeAnimais)
    }
}

/// Projeta o consumo de insumos e a data de abate periodo a periodo.
///
/// A cada periodo o peso medio avanca conforme a meta de ganho, as
/// exigencias sao recalculadas no peso medio do intervalo e a racao e
/// reformulada - por isso o consumo cresce ao longo do ciclo.
enum PlanejadorAbate {

    static let maximoPeriodos = 120

    static func projetar(lote: Lote, selecao: SelecaoInsumos) -> RelatorioPlanejamento {
        var alertas: [String] = []

        guard lote.quantidadeAnimais > 0 else {
            return .vazio(lote: lote, alertas: ["Informe a quantidade de animais do lote."])
        }
        guard lote.ganhoMetaDiario > 0 else {
            return .vazio(lote: lote, alertas: ["Defina uma meta de ganho maior que zero para projetar o abate."])
        }
        let pesoInicial = lote.pesoAtual
        guard lote.pesoAlvoAbate > pesoInicial else {
            return .vazio(lote: lote, alertas: ["O lote ja atingiu o peso alvo de abate."])
        }

        let ganho = lote.ganhoMetaDiario
        let diasTotais = (lote.pesoAlvoAbate - pesoInicial) / ganho
        let diasPorPeriodo = Double(max(1, lote.diasPorPeriodo))
        let dataInicio = lote.dataReferencia

        var periodos: [PeriodoPlano] = []
        var peso = pesoInicial
        var diasAcumulados = 0.0
        var indice = 1

        while diasAcumulados < diasTotais - 0.001 && indice <= maximoPeriodos {
            let dias = min(diasPorPeriodo, diasTotais - diasAcumulados)
            let pesoFinal = peso + ganho * dias
            let pesoMedio = peso + ganho * dias / 2

            let perfil = lote.perfil(paraPeso: pesoMedio, faseAutomatica: true)
            let exigencia = MotorExigencias.calcular(perfil: perfil, ganhoMeta: ganho)
            let composicao = FormuladorRacao.formular(exigencia: exigencia,
                                                      selecao: selecao,
                                                      restricoes: lote.restricoes)

            let fator = dias * Double(lote.quantidadeAnimais)
            let consumos = composicao.itens.map { item in
                ConsumoInsumo(insumo: item.insumo,
                              kgMateriaNatural: item.kgMateriaNatural * fator,
                              kgMateriaSeca: item.kgMateriaSeca * fator,
                              custo: item.custoDiario * fator)
            }

            periodos.append(PeriodoPlano(id: indice,
                                         dataInicio: somarDias(dataInicio, diasAcumulados),
                                         dataFim: somarDias(dataInicio, diasAcumulados + dias),
                                         dias: dias,
                                         pesoInicial: peso,
                                         pesoFinal: pesoFinal,
                                         pesoMedio: pesoMedio,
                                         exigencia: exigencia,
                                         composicao: composicao,
                                         consumos: consumos,
                                         animais: lote.quantidadeAnimais))

            if !exigencia.metaAtingivel {
                alertas.append("No periodo \(indice) (peso medio \(Formatadores.numero(pesoMedio, casas: 0)) kg) a meta de ganho nao e alcancavel com dieta pratica.")
            }
            peso = pesoFinal
            diasAcumulados += dias
            indice += 1
        }

        if indice > maximoPeriodos && diasAcumulados < diasTotais - 0.001 {
            alertas.append("Projecao limitada a \(maximoPeriodos) periodos. Aumente os dias por periodo para ver o ciclo completo.")
        }

        let totais = consolidarTotais(periodos)
        let alertasComposicao = Set(periodos.flatMap { $0.composicao.alertas })
        if periodos.contains(where: { $0.composicao.status == .restrita }) {
            alertas.append("A racao de pelo menos um periodo foi ajustada aos limites de volumoso. Confira a aba Racao.")
        }
        alertas.append(contentsOf: alertasComposicao.sorted().prefix(3))

        return RelatorioPlanejamento(lote: lote,
                                     periodos: periodos,
                                     totais: totais,
                                     alertas: alertas,
                                     pesoInicial: pesoInicial,
                                     pesoAlvo: lote.pesoAlvoAbate,
                                     dataInicio: dataInicio,
                                     dataAbate: somarDias(dataInicio, diasTotais),
                                     diasTotais: diasTotais,
                                     animais: lote.quantidadeAnimais)
    }

    /// Soma os consumos de todos os periodos, insumo a insumo.
    static func consolidarTotais(_ periodos: [PeriodoPlano]) -> [ConsumoInsumo] {
        var ordem: [UUID] = []
        var acumulado: [UUID: ConsumoInsumo] = [:]
        for periodo in periodos {
            for consumo in periodo.consumos {
                if var existente = acumulado[consumo.id] {
                    existente.kgMateriaNatural += consumo.kgMateriaNatural
                    existente.kgMateriaSeca += consumo.kgMateriaSeca
                    existente.custo += consumo.custo
                    acumulado[consumo.id] = existente
                } else {
                    ordem.append(consumo.id)
                    acumulado[consumo.id] = consumo
                }
            }
        }
        return ordem.compactMap { acumulado[$0] }
    }

    static func somarDias(_ data: Date, _ dias: Double) -> Date {
        data.addingTimeInterval(dias * 86_400)
    }
}
