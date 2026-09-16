import Foundation

/// Quão firme é a base histórica disponível.
enum Confianca: String, Hashable {
    case indicativa
    case moderada
    case consistente

    var nome: String {
        switch self {
        case .indicativa: return "Indicativa"
        case .moderada: return "Moderada"
        case .consistente: return "Consistente"
        }
    }

    var explicacao: String {
        switch self {
        case .indicativa: return "Base de 1 ciclo. Serve de indício, ainda não de regra."
        case .moderada: return "Base de 2 a 3 ciclos. Já mostra tendência."
        case .consistente: return "Base de 4 ciclos ou mais. Padrão bem estabelecido da fazenda."
        }
    }

    static func para(ciclos: Int) -> Confianca {
        switch ciclos {
        case ..<2: return .indicativa
        case 2...3: return .moderada
        default: return .consistente
        }
    }
}

/// Parâmetros aprendidos com os ciclos encerrados, aplicados aos novos lotes.
struct FatoresCalibracao: Hashable {
    /// Multiplicador do consumo previsto que explica o ganho observado.
    var ajusteConsumo: Double
    var rendimentoCarcaca: Double
    var pesoAcabamento: Double
    var ganhoRealMedio: Double
    var aderenciaGanhoMedia: Double
    var ciclos: Int

    var confianca: Confianca { Confianca.para(ciclos: ciclos) }
    var disponivel: Bool { ciclos > 0 }

    static let vazio = FatoresCalibracao(ajusteConsumo: 1.0,
                                         rendimentoCarcaca: 0.53,
                                         pesoAcabamento: 430,
                                         ganhoRealMedio: 0,
                                         aderenciaGanhoMedia: 0,
                                         ciclos: 0)
}

/// Desempenho médio dos ciclos que usaram um determinado alimento.
struct DesempenhoInsumo: Identifiable, Hashable {
    var nome: String
    var categoria: CategoriaInsumo
    var ciclos: Int
    var aderenciaGanho: Double
    var ganhoDiario: Double
    var custoPorArroba: Double?
    var arrobasProduzidas: Double

    var id: String { categoria.rawValue + "-" + nome }
}

enum Severidade: String, Hashable {
    case bom
    case atencao
    case critico

    var nome: String {
        switch self {
        case .bom: return "No rumo"
        case .atencao: return "Atenção"
        case .critico: return "Corrigir"
        }
    }
}

/// Um apontamento prático extraído do histórico.
struct Recomendacao: Identifiable, Hashable {
    var id = UUID()
    var titulo: String
    var detalhe: String
    var severidade: Severidade
    var simbolo: String
}

/// Retrato completo do histórico da fazenda.
struct AnaliseHistorica {
    var ciclos: [CicloEncerrado]
    var fatores: FatoresCalibracao
    var porProteico: [DesempenhoInsumo]
    var porEnergetico: [DesempenhoInsumo]
    var porVolumoso: [DesempenhoInsumo]
    var recomendacoes: [Recomendacao]

    var temHistorico: Bool { !ciclos.isEmpty }
    var totalCiclos: Int { ciclos.count }
    var totalAnimais: Int { ciclos.reduce(0) { $0 + $1.animaisAbatidos } }
    var totalArrobas: Double { ciclos.reduce(0) { $0 + $1.arrobasProduzidasLote } }
    var totalGanho: Double { ciclos.reduce(0) { $0 + $1.ganhoTotalLote } }
    var custoTotal: Double { ciclos.reduce(0) { $0 + $1.custoReal } }

    var ganhoRealMedio: Double { fatores.ganhoRealMedio }

    var custoMedioPorArroba: Double? {
        let comCusto = ciclos.filter { $0.custoReal > 0 }
        let arrobas = comCusto.reduce(0) { $0 + $1.arrobasProduzidasLote }
        guard arrobas > 0 else { return nil }
        return comCusto.reduce(0) { $0 + $1.custoReal } / arrobas
    }

    var diasMedios: Double {
        guard !ciclos.isEmpty else { return 0 }
        return ciclos.reduce(0) { $0 + $1.diasReais } / Double(ciclos.count)
    }

    static let vazia = AnaliseHistorica(ciclos: [],
                                        fatores: .vazio,
                                        porProteico: [],
                                        porEnergetico: [],
                                        porVolumoso: [],
                                        recomendacoes: [])
}

/// Lê os ciclos encerrados e transforma em calibração e recomendações.
enum AnalisadorHistorico {

    // MARK: - Calibração

    /// Multiplicador de consumo que, no modelo, produziria o ganho observado.
    ///
    /// Mantidos os teores informados da dieta, procura o fator que faz a
    /// previsão bater com o que a balança mostrou. Abaixo de 1,0 significa que
    /// a fazenda entregou menos do que o papel prometia.
    static func fatorConsumo(do ciclo: CicloEncerrado) -> Double? {
        let ganhoObservado = ciclo.ganhoRealDiario
        guard ganhoObservado > 0,
              ciclo.consumoPrevistoDiario > 0,
              ciclo.ndtDietaMedia > 0 else { return nil }

        let perfil = PerfilAnimal(pesoVivo: ciclo.pesoMedioCiclo,
                                  fase: FaseAnimal.sugerida(paraPeso: ciclo.pesoMedioCiclo),
                                  grupoGenetico: ciclo.grupoGenetico,
                                  sistema: ciclo.sistema,
                                  pesoFinal: ciclo.pesoAcabamentoPlanejado)

        func ganho(_ fator: Double) -> Double {
            let consumo = fator * ciclo.consumoPrevistoDiario
            return MotorExigencias.ganhoPorEnergia(perfil: perfil,
                                                   consumoMS: consumo,
                                                   ndtKg: consumo * ciclo.ndtDietaMedia / 100)
        }

        let minimo = 0.50
        let maximo = 1.60
        if ganho(minimo) >= ganhoObservado { return minimo }
        if ganho(maximo) <= ganhoObservado { return maximo }

        var baixo = minimo
        var alto = maximo
        for _ in 0..<60 {
            let meio = (baixo + alto) / 2
            if ganho(meio) < ganhoObservado { baixo = meio } else { alto = meio }
        }
        return (baixo + alto) / 2
    }

    /// Combina os ciclos em um único conjunto de parâmetros, dando mais peso
    /// aos ciclos com mais animais e mais dias.
    static func calibrar(_ ciclos: [CicloEncerrado]) -> FatoresCalibracao {
        guard !ciclos.isEmpty else { return .vazio }

        var somaPesos = 0.0
        var somaFator = 0.0
        var somaGanho = 0.0
        var somaAderencia = 0.0
        var somaPesoFinal = 0.0
        var somaRendimento = 0.0
        var pesosRendimento = 0.0

        for ciclo in ciclos {
            let peso = max(1, Double(ciclo.animaisAbatidos)) * max(1, ciclo.diasReais)
            somaPesos += peso
            somaFator += (fatorConsumo(do: ciclo) ?? 1.0) * peso
            somaGanho += ciclo.ganhoRealDiario * peso
            somaAderencia += ciclo.aderenciaGanho * peso
            somaPesoFinal += ciclo.pesoFinalReal * peso
            if let rendimento = ciclo.rendimentoReal {
                somaRendimento += rendimento * peso
                pesosRendimento += peso
            }
        }

        let rendimento = pesosRendimento > 0
            ? somaRendimento / pesosRendimento
            : (ciclos.first?.grupoGenetico.rendimentoCarcacaSugerido ?? 0.53)

        return FatoresCalibracao(
            ajusteConsumo: min(max(somaFator / somaPesos, 0.70), 1.30),
            rendimentoCarcaca: min(max(rendimento, 0.40), 0.62),
            pesoAcabamento: max(250, somaPesoFinal / somaPesos),
            ganhoRealMedio: somaGanho / somaPesos,
            aderenciaGanhoMedia: somaAderencia / somaPesos,
            ciclos: ciclos.count
        )
    }

    // MARK: - Ranking por alimento

    static func desempenho(_ ciclos: [CicloEncerrado],
                           categoria: CategoriaInsumo) -> [DesempenhoInsumo] {
        func nome(_ ciclo: CicloEncerrado) -> String {
            switch categoria {
            case .proteico: return ciclo.proteicoNome
            case .energetico: return ciclo.energeticoNome
            default: return ciclo.volumosoNome
            }
        }

        var ordem: [String] = []
        var grupos: [String: [CicloEncerrado]] = [:]
        for ciclo in ciclos {
            let chave = nome(ciclo).trimmingCharacters(in: .whitespaces)
            guard !chave.isEmpty else { continue }
            if grupos[chave] == nil { ordem.append(chave) }
            grupos[chave, default: []].append(ciclo)
        }

        let lista: [DesempenhoInsumo] = ordem.compactMap { chave in
            guard let doGrupo = grupos[chave], !doGrupo.isEmpty else { return nil }
            let n = Double(doGrupo.count)
            let arrobas = doGrupo.reduce(0) { $0 + $1.arrobasProduzidasLote }
            let comCusto = doGrupo.filter { $0.custoReal > 0 }
            let arrobasComCusto = comCusto.reduce(0) { $0 + $1.arrobasProduzidasLote }
            let custo: Double? = arrobasComCusto > 0
                ? comCusto.reduce(0) { $0 + $1.custoReal } / arrobasComCusto
                : nil
            return DesempenhoInsumo(
                nome: chave,
                categoria: categoria,
                ciclos: doGrupo.count,
                aderenciaGanho: doGrupo.reduce(0) { $0 + $1.aderenciaGanho } / n,
                ganhoDiario: doGrupo.reduce(0) { $0 + $1.ganhoRealDiario } / n,
                custoPorArroba: custo,
                arrobasProduzidas: arrobas
            )
        }
        return lista.sorted { $0.aderenciaGanho > $1.aderenciaGanho }
    }

    // MARK: - Recomendações

    static func recomendacoes(_ ciclos: [CicloEncerrado],
                              fatores: FatoresCalibracao,
                              proteicos: [DesempenhoInsumo]) -> [Recomendacao] {
        guard !ciclos.isEmpty else { return [] }
        var lista: [Recomendacao] = []

        // 1. Ganho contra a meta, cruzado com o fornecimento de concentrado.
        let aderencia = fatores.aderenciaGanhoMedia
        let concentrados = ciclos.compactMap { $0.aderenciaConcentrado }
        let aderenciaConcentrado = concentrados.isEmpty
            ? nil
            : concentrados.reduce(0, +) / Double(concentrados.count)

        if aderencia < 0.90 {
            if let forn = aderenciaConcentrado, forn < 0.92 {
                lista.append(Recomendacao(
                    titulo: "Faltou concentrado no cocho",
                    detalhe: "O ganho ficou \(Formatadores.percentual((1 - aderencia) * 100, casas: 0)) abaixo da meta e só \(Formatadores.percentual(forn * 100, casas: 0)) do concentrado planejado foi fornecido. Antes de mexer na formulação, feche o fornecimento: a dieta no papel estava certa.",
                    severidade: .critico,
                    simbolo: "tray.and.arrow.down"))
            } else {
                lista.append(Recomendacao(
                    titulo: "Dieta entregou menos do que prometia",
                    detalhe: "O concentrado foi fornecido como planejado, mas o ganho ficou \(Formatadores.percentual((1 - aderencia) * 100, casas: 0)) abaixo da meta. O caminho é rever os teores dos alimentos, principalmente o NDT e a PB do volumoso, com análise bromatológica. O aplicativo já reduziu o consumo previsto para \(Formatadores.numero(fatores.ajusteConsumo, casas: 2))x nos próximos lotes.",
                    severidade: .critico,
                    simbolo: "chart.line.downtrend.xyaxis"))
            }
        } else if aderencia > 1.10 {
            lista.append(Recomendacao(
                titulo: "Sobrou dieta",
                detalhe: "O ganho ficou \(Formatadores.percentual((aderencia - 1) * 100, casas: 0)) acima da meta. Dá para elevar a meta dos próximos lotes ou reduzir o concentrado e baixar o custo por arroba.",
                severidade: .atencao,
                simbolo: "arrow.down.circle"))
        } else {
            lista.append(Recomendacao(
                titulo: "Ganho dentro do planejado",
                detalhe: "A média observada foi de \(Formatadores.numero(fatores.ganhoRealMedio, casas: 3)) kg/dia, \(Formatadores.percentual(aderencia * 100, casas: 0)) da meta. Mantenha o manejo e a formulação.",
                severidade: .bom,
                simbolo: "checkmark.seal"))
        }

        // 2. Comparação entre proteicos: onde reforçar e onde economizar.
        let comparaveis = proteicos.filter { $0.ciclos >= 1 }
        if comparaveis.count >= 2, let melhor = comparaveis.first, let pior = comparaveis.last,
           melhor.nome != pior.nome {
            let diferenca = (melhor.aderenciaGanho - pior.aderenciaGanho) * 100
            var detalhe = "Com \(melhor.nome) o ganho ficou \(Formatadores.numero(diferenca, casas: 0)) pontos percentuais mais perto da meta do que com \(pior.nome) (\(Formatadores.numero(melhor.ganhoDiario, casas: 3)) contra \(Formatadores.numero(pior.ganhoDiario, casas: 3)) kg/dia)."
            if let custoMelhor = melhor.custoPorArroba, let custoPior = pior.custoPorArroba {
                if custoMelhor <= custoPior {
                    detalhe += " E ainda saiu mais barato: \(Formatadores.moeda(custoMelhor)) contra \(Formatadores.moeda(custoPior)) por arroba. Padronize no \(melhor.nome)."
                } else {
                    detalhe += " Custa mais caro, \(Formatadores.moeda(custoMelhor)) contra \(Formatadores.moeda(custoPior)) por arroba: use \(melhor.nome) quando quiser encurtar o ciclo e \(pior.nome) quando o preço da arroba estiver apertado."
                }
            }
            lista.append(Recomendacao(titulo: "Proteico: \(melhor.nome) rendeu mais",
                                      detalhe: detalhe,
                                      severidade: .atencao,
                                      simbolo: "arrow.up.arrow.down"))
        } else if let unico = comparaveis.first {
            if unico.aderenciaGanho < 0.95 {
                lista.append(Recomendacao(
                    titulo: "Reforce a fonte proteica",
                    detalhe: "Todos os ciclos usaram \(unico.nome) e o ganho ficou abaixo da meta. Vale aumentar a participação do proteico na ração ou testar outra fonte no próximo lote para ter comparação.",
                    severidade: .atencao,
                    simbolo: "bolt.badge.clock"))
            } else {
                lista.append(Recomendacao(
                    titulo: "Sem comparação de proteico ainda",
                    detalhe: "Todos os ciclos usaram \(unico.nome), que está entregando \(Formatadores.percentual(unico.aderenciaGanho * 100, casas: 0)) da meta. Registrar um ciclo com outra fonte proteica permitiria comparar custo e desempenho.",
                    severidade: .bom,
                    simbolo: "questionmark.circle"))
            }
        }

        // 3. Acabamento e rendimento de carcaça.
        let comRendimento = ciclos.compactMap { $0.rendimentoReal }
        if !comRendimento.isEmpty {
            let medio = comRendimento.reduce(0, +) / Double(comRendimento.count)
            let referencia = ciclos[0].grupoGenetico.rendimentoCarcacaSugerido
            if medio < referencia - 0.015 {
                lista.append(Recomendacao(
                    titulo: "Acabamento aquém do esperado",
                    detalhe: "O rendimento médio de carcaça foi \(Formatadores.percentual(medio * 100)) contra \(Formatadores.percentual(referencia * 100)) esperados para \(ciclos[0].grupoGenetico.nomeCurto.lowercased()). Alongue a terminação ou eleve a densidade energética nos últimos 60 dias.",
                    severidade: .atencao,
                    simbolo: "scalemass"))
            }
        } else {
            lista.append(Recomendacao(
                titulo: "Registre o peso de carcaça",
                detalhe: "Sem o peso de carcaça do frigorífico não dá para calcular rendimento, arrobas produzidas nem custo por arroba. É o dado que mais falta para fechar a conta.",
                severidade: .atencao,
                simbolo: "doc.badge.plus"))
        }

        // 4. Prazo: ciclo mais longo que o planejado prende pasto e capital.
        let atrasos = ciclos.filter { $0.diasPlanejados > 0 }
            .map { $0.diasReais / $0.diasPlanejados }
        if !atrasos.isEmpty {
            let medio = atrasos.reduce(0, +) / Double(atrasos.count)
            if medio > 1.15 {
                lista.append(Recomendacao(
                    titulo: "Ciclo mais longo que o previsto",
                    detalhe: "Os lotes levaram em média \(Formatadores.percentual((medio - 1) * 100, casas: 0)) mais dias que o planejado. Cada dia a mais é pasto ocupado e capital parado: ou a meta de ganho precisa ser mais realista, ou o abate precisa acontecer no peso combinado.",
                    severidade: .atencao,
                    simbolo: "calendar.badge.exclamationmark"))
            }
        }

        // 5. Perda de animais.
        let perdidos = ciclos.reduce(0) { $0 + $1.animaisPerdidos }
        let iniciais = ciclos.reduce(0) { $0 + $1.animaisIniciais }
        if perdidos > 0, iniciais > 0 {
            let taxa = Double(perdidos) / Double(iniciais)
            lista.append(Recomendacao(
                titulo: "Perda de \(perdidos) animal\(perdidos == 1 ? "" : "is")",
                detalhe: "Representa \(Formatadores.percentual(taxa * 100)) do rebanho que entrou nos ciclos. Acima de 2% costuma indicar problema sanitário ou de adaptação à dieta.",
                severidade: taxa > 0.02 ? .critico : .atencao,
                simbolo: "cross.case"))
        }

        // 6. Custo real contra o previsto.
        let desvios = ciclos.compactMap { $0.desvioCusto }
        if !desvios.isEmpty {
            let medio = desvios.reduce(0, +) / Double(desvios.count)
            if medio > 0.10 {
                lista.append(Recomendacao(
                    titulo: "Custo estourou o orçamento",
                    detalhe: "O gasto real ficou \(Formatadores.percentual(medio * 100, casas: 0)) acima do previsto. Confira os preços cadastrados dos insumos: se estiverem defasados, todo o planejamento seguinte sai errado.",
                    severidade: .critico,
                    simbolo: "banknote"))
            } else if medio < -0.10 {
                lista.append(Recomendacao(
                    titulo: "Gasto abaixo do previsto",
                    detalhe: "O custo real ficou \(Formatadores.percentual(abs(medio) * 100, casas: 0)) abaixo do planejado. Atualize os preços dos insumos para o planejamento ficar mais fiel.",
                    severidade: .bom,
                    simbolo: "banknote"))
            }
        }

        return lista
    }

    // MARK: - Entrada principal

    static func analisar(_ ciclos: [CicloEncerrado]) -> AnaliseHistorica {
        guard !ciclos.isEmpty else { return .vazia }
        let ordenados = ciclos.sorted { $0.dataAbate > $1.dataAbate }
        let fatores = calibrar(ordenados)
        let proteicos = desempenho(ordenados, categoria: .proteico)
        return AnaliseHistorica(
            ciclos: ordenados,
            fatores: fatores,
            porProteico: proteicos,
            porEnergetico: desempenho(ordenados, categoria: .energetico),
            porVolumoso: desempenho(ordenados, categoria: .volumoso),
            recomendacoes: recomendacoes(ordenados, fatores: fatores, proteicos: proteicos)
        )
    }
}
