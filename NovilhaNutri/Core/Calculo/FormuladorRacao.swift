import Foundation

/// Insumos escolhidos para compor a ração do lote.
struct SelecaoInsumos: Hashable {
    var volumoso: Insumo
    var energetico: Insumo
    var proteico: Insumo
    var mineral: Insumo?
}

/// Limites de manejo aplicados a formulação.
struct RestricoesFormulacao: Codable, Hashable {
    /// Participação mínima de volumoso na matéria seca (fração de 0 a 1).
    var volumosoMinimo: Double
    /// Participação máxima de volumoso na matéria seca (fração de 0 a 1).
    var volumosoMaximo: Double
    /// Consumo diário de mineral por animal, em gramas de matéria natural.
    var mineralGramasDia: Double
    /// Quando definido, fixa a participação do volumoso em vez de calculá-la.
    var volumosoFixo: Double?

    init(volumosoMinimo: Double = 0.30,
         volumosoMaximo: Double = 0.95,
         mineralGramasDia: Double = 100,
         volumosoFixo: Double? = nil) {
        self.volumosoMinimo = volumosoMinimo
        self.volumosoMaximo = volumosoMaximo
        self.mineralGramasDia = mineralGramasDia
        self.volumosoFixo = volumosoFixo
    }

    /// Leitura tolerante, pelo mesmo motivo que a do `Lote`: um campo que
    /// venha a ser acrescentado aqui não pode impedir que um arquivo gravado
    /// antes dele volte a abrir. A versão web já lê assim, mesclando o que
    /// veio no arquivo sobre os valores padrão.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let padrao = RestricoesFormulacao()
        volumosoMinimo = try c.decodeIfPresent(Double.self, forKey: .volumosoMinimo)
            ?? padrao.volumosoMinimo
        volumosoMaximo = try c.decodeIfPresent(Double.self, forKey: .volumosoMaximo)
            ?? padrao.volumosoMaximo
        mineralGramasDia = try c.decodeIfPresent(Double.self, forKey: .mineralGramasDia)
            ?? padrao.mineralGramasDia
        volumosoFixo = try c.decodeIfPresent(Double.self, forKey: .volumosoFixo)
    }

    static let padrao = RestricoesFormulacao()
}

/// Um alimento dentro da ração diária, por animal.
struct ItemRacao: Identifiable, Hashable {
    var insumo: Insumo
    var kgMateriaSeca: Double
    var id: UUID { insumo.id }

    var kgMateriaNatural: Double { insumo.materiaNatural(deMateriaSeca: kgMateriaSeca) }
    var proteinaKg: Double { kgMateriaSeca * insumo.proteinaBruta / 100 }
    var ndtKg: Double { kgMateriaSeca * insumo.ndt / 100 }
    var custoDiario: Double { kgMateriaNatural * insumo.precoPorKg }
}

/// Como a formulação foi resolvida.
enum StatusFormulacao: String, Hashable {
    case balanceada
    case restrita
    case invalida

    var nome: String {
        switch self {
        case .balanceada: return "Balanceada"
        case .restrita: return "Ajustada aos limites"
        case .invalida: return "Não foi possível formular"
        }
    }
}

/// Ração diária calculada para um animal do lote.
struct ComposicaoRacao: Hashable {
    var itens: [ItemRacao]
    var status: StatusFormulacao
    var alertas: [String]

    /// Exigências que serviram de alvo.
    var proteinaExigidaKg: Double
    var ndtExigidoKg: Double

    var consumoMateriaSeca: Double { itens.reduce(0) { $0 + $1.kgMateriaSeca } }
    var totalMateriaNatural: Double { itens.reduce(0) { $0 + $1.kgMateriaNatural } }
    var proteinaFornecidaKg: Double { itens.reduce(0) { $0 + $1.proteinaKg } }
    var ndtFornecidoKg: Double { itens.reduce(0) { $0 + $1.ndtKg } }
    var custoDiario: Double { itens.reduce(0) { $0 + $1.custoDiario } }

    var proteinaPercentual: Double {
        consumoMateriaSeca > 0 ? proteinaFornecidaKg / consumoMateriaSeca * 100 : 0
    }
    var ndtPercentual: Double {
        consumoMateriaSeca > 0 ? ndtFornecidoKg / consumoMateriaSeca * 100 : 0
    }

    var balancoProteina: Double { proteinaFornecidaKg - proteinaExigidaKg }
    var balancoNDT: Double { ndtFornecidoKg - ndtExigidoKg }

    var massaVolumoso: Double {
        itens.filter { $0.insumo.categoria == .volumoso }.reduce(0) { $0 + $1.kgMateriaSeca }
    }
    var massaConcentrado: Double {
        itens.filter { $0.insumo.categoria == .energetico || $0.insumo.categoria == .proteico }
            .reduce(0) { $0 + $1.kgMateriaSeca }
    }
    var percentualVolumoso: Double {
        consumoMateriaSeca > 0 ? massaVolumoso / consumoMateriaSeca * 100 : 0
    }
    var percentualConcentrado: Double {
        consumoMateriaSeca > 0 ? massaConcentrado / consumoMateriaSeca * 100 : 0
    }

    /// Participação de cada item na matéria seca total (%).
    func participacaoMS(_ item: ItemRacao) -> Double {
        consumoMateriaSeca > 0 ? item.kgMateriaSeca / consumoMateriaSeca * 100 : 0
    }

    static let vazia = ComposicaoRacao(itens: [],
                                       status: .invalida,
                                       alertas: ["Selecione os insumos da ração."],
                                       proteinaExigidaKg: 0,
                                       ndtExigidoKg: 0)
}

/// Calcula quanto de cada alimento entra na ração diária.
///
/// No modo automático resolve o sistema linear de três equações
/// (matéria seca total, proteína bruta e NDT) com três alimentos.
/// Quando a solução exige uma proporção de volumoso fora dos limites de
/// manejo, o volumoso é fixado no limite e o concentrado passa a atender a
/// proteína, sobrando ou faltando energia - diferença sempre reportada.
enum FormuladorRacao {

    static func formular(exigencia: ExigenciaDiaria,
                         selecao: SelecaoInsumos,
                         restricoes: RestricoesFormulacao = .padrao) -> ComposicaoRacao {
        var alertas: [String] = []

        let consumoTotal = exigencia.consumoMateriaSeca
        guard consumoTotal > 0 else { return .vazia }

        // O mineral entra com quantidade fixa e não participa do balanceamento.
        var mineralMS = 0.0
        if let mineral = selecao.mineral, restricoes.mineralGramasDia > 0 {
            mineralMS = mineral.materiaSeca(deMateriaNatural: restricoes.mineralGramasDia / 1000)
        }

        let disponivel = consumoTotal - mineralMS
        guard disponivel > 0.01 else {
            return ComposicaoRacao(itens: [], status: .invalida,
                                   alertas: ["Consumo de matéria seca insuficiente para formular."],
                                   proteinaExigidaKg: exigencia.proteinaBrutaKg,
                                   ndtExigidoKg: exigencia.ndtKg)
        }

        let volumoso = selecao.volumoso
        let energetico = selecao.energetico
        let proteico = selecao.proteico

        var status: StatusFormulacao = .balanceada
        var kgVolumoso = 0.0
        var kgEnergetico = 0.0
        var kgProteico = 0.0

        let limiteMin = min(max(restricoes.volumosoMinimo, 0), 1) * disponivel
        let limiteMax = min(max(restricoes.volumosoMaximo, 0), 1) * disponivel

        if let fixo = restricoes.volumosoFixo {
            kgVolumoso = min(max(fixo, 0), 1) * disponivel
            status = .restrita
        } else if let solucao = resolverSistema(disponivel: disponivel,
                                                proteinaAlvo: exigencia.proteinaBrutaKg,
                                                ndtAlvo: exigencia.ndtKg,
                                                volumoso: volumoso,
                                                energetico: energetico,
                                                proteico: proteico) {
            if solucao.volumoso < limiteMin - 1e-6 {
                kgVolumoso = limiteMin
                status = .restrita
                alertas.append("O balanceamento pediu menos volumoso que o mínimo de \(Formatadores.percentual(restricoes.volumosoMinimo * 100, casas: 0)); a dieta foi ajustada ao limite.")
            } else if solucao.volumoso > limiteMax + 1e-6 {
                kgVolumoso = limiteMax
                status = .restrita
                alertas.append("O balanceamento pediu mais volumoso que o máximo de \(Formatadores.percentual(restricoes.volumosoMaximo * 100, casas: 0)); a dieta foi ajustada ao limite.")
            } else if solucao.energetico < -1e-6 || solucao.proteico < -1e-6 {
                // Um dos concentrados ficaria negativo: mantém o volumoso da
                // solução e deixa o ajuste de proteína resolver o restante.
                kgVolumoso = min(max(solucao.volumoso, limiteMin), limiteMax)
                status = .restrita
                alertas.append("Os alimentos escolhidos não permitem atingir PB e NDT ao mesmo tempo. Confira o balanço abaixo.")
            } else {
                kgVolumoso = solucao.volumoso
                kgEnergetico = solucao.energetico
                kgProteico = solucao.proteico
            }
        } else {
            kgVolumoso = min(max(disponivel * participacaoVolumosoPadrao, limiteMin), limiteMax)
            status = .restrita
            alertas.append("Os teores dos alimentos escolhidos são muito parecidos para um balanceamento exato.")
        }

        if status == .restrita {
            // Com o volumoso fixado, ajusta energético e proteico pela proteína.
            let restante = max(0, disponivel - kgVolumoso)
            let proteinaVolumoso = kgVolumoso * volumoso.proteinaBruta / 100
            let faltaProteina = exigencia.proteinaBrutaKg - proteinaVolumoso
            let diferencaTeor = (proteico.proteinaBruta - energetico.proteinaBruta) / 100
            if abs(diferencaTeor) > 1e-6 {
                let bruto = (faltaProteina - restante * energetico.proteinaBruta / 100) / diferencaTeor
                kgProteico = min(max(bruto, 0), restante)
            } else {
                kgProteico = restante / 2
            }
            kgEnergetico = max(0, restante - kgProteico)
        }

        var candidatos: [(Insumo, Double)] = [(volumoso, kgVolumoso),
                                              (energetico, kgEnergetico),
                                              (proteico, kgProteico)]
        if let mineral = selecao.mineral, mineralMS > 0 {
            candidatos.append((mineral, mineralMS))
        }
        let itens = consolidar(candidatos)

        var composicao = ComposicaoRacao(itens: itens,
                                         status: status,
                                         alertas: alertas,
                                         proteinaExigidaKg: exigencia.proteinaBrutaKg,
                                         ndtExigidoKg: exigencia.ndtKg)
        composicao.alertas.append(contentsOf: avisosDeBalanco(composicao))
        return composicao
    }

    /// Monta a composição a partir de quantidades informadas manualmente
    /// (em quilos de matéria natural por animal por dia).
    static func avaliar(quantidades: [(insumo: Insumo, kgMateriaNatural: Double)],
                        exigencia: ExigenciaDiaria) -> ComposicaoRacao {
        let itens = consolidar(quantidades.map {
            ($0.insumo, $0.insumo.materiaSeca(deMateriaNatural: $0.kgMateriaNatural))
        })
        var composicao = ComposicaoRacao(itens: itens,
                                         status: itens.isEmpty ? .invalida : .restrita,
                                         alertas: [],
                                         proteinaExigidaKg: exigencia.proteinaBrutaKg,
                                         ndtExigidoKg: exigencia.ndtKg)
        composicao.alertas = avisosDeBalanco(composicao)
        return composicao
    }

    // MARK: - Apoio

    private static let participacaoVolumosoPadrao = 0.6

    private struct Solucao {
        var volumoso: Double
        var energetico: Double
        var proteico: Double
    }

    /// Resolve o sistema 3x3: matéria seca, proteína bruta e NDT.
    private static func resolverSistema(disponivel: Double,
                                        proteinaAlvo: Double,
                                        ndtAlvo: Double,
                                        volumoso: Insumo,
                                        energetico: Insumo,
                                        proteico: Insumo) -> Solucao? {
        let matriz: [[Double]] = [
            [1, 1, 1, disponivel],
            [volumoso.proteinaBruta / 100, energetico.proteinaBruta / 100, proteico.proteinaBruta / 100, proteinaAlvo],
            [volumoso.ndt / 100, energetico.ndt / 100, proteico.ndt / 100, ndtAlvo]
        ]
        guard let x = gaussJordan(matriz) else { return nil }
        return Solucao(volumoso: x[0], energetico: x[1], proteico: x[2])
    }

    /// Junta quantidades do mesmo alimento para não repetir linhas na ração.
    static func consolidar(_ candidatos: [(Insumo, Double)]) -> [ItemRacao] {
        var ordem: [UUID] = []
        var somas: [UUID: Double] = [:]
        var insumos: [UUID: Insumo] = [:]
        for (insumo, kg) in candidatos where kg > 1e-6 {
            if somas[insumo.id] == nil {
                ordem.append(insumo.id)
                insumos[insumo.id] = insumo
            }
            somas[insumo.id, default: 0] += kg
        }
        return ordem.compactMap { id in
            guard let insumo = insumos[id], let kg = somas[id] else { return nil }
            return ItemRacao(insumo: insumo, kgMateriaSeca: kg)
        }
    }

    /// Eliminação de Gauss-Jordan com pivoteamento parcial para sistemas 3x3.
    static func gaussJordan(_ entrada: [[Double]]) -> [Double]? {
        var m = entrada
        let n = 3
        guard m.count == n, m.allSatisfy({ $0.count == n + 1 }) else { return nil }
        for coluna in 0..<n {
            var pivo = coluna
            for linha in (coluna + 1)..<n where abs(m[linha][coluna]) > abs(m[pivo][coluna]) {
                pivo = linha
            }
            guard abs(m[pivo][coluna]) > 1e-9 else { return nil }
            m.swapAt(coluna, pivo)
            for linha in 0..<n where linha != coluna {
                let fator = m[linha][coluna] / m[coluna][coluna]
                guard fator != 0 else { continue }
                for k in coluna...n {
                    m[linha][k] -= fator * m[coluna][k]
                }
            }
        }
        let resultado = (0..<n).map { m[$0][n] / m[$0][$0] }
        return resultado.allSatisfy { $0.isFinite } ? resultado : nil
    }

    private static func avisosDeBalanco(_ composicao: ComposicaoRacao) -> [String] {
        var avisos: [String] = []
        let tolerancia = 0.02
        if composicao.proteinaExigidaKg > 0 {
            let desvio = composicao.balancoProteina / composicao.proteinaExigidaKg
            if desvio < -tolerancia {
                avisos.append("Faltam \(Formatadores.gramas(abs(composicao.balancoProteina) * 1000)) de proteína bruta por animal por dia.")
            } else if desvio > tolerancia {
                avisos.append("Sobram \(Formatadores.gramas(composicao.balancoProteina * 1000)) de proteína bruta por animal por dia.")
            }
        }
        if composicao.ndtExigidoKg > 0 {
            let desvio = composicao.balancoNDT / composicao.ndtExigidoKg
            if desvio < -tolerancia {
                avisos.append("Faltam \(Formatadores.kg(abs(composicao.balancoNDT))) de NDT por animal por dia; o ganho tende a ficar abaixo da meta.")
            } else if desvio > tolerancia {
                avisos.append("Sobram \(Formatadores.kg(composicao.balancoNDT)) de NDT por animal por dia; o ganho tende a superar a meta.")
            }
        }
        return avisos
    }
}
