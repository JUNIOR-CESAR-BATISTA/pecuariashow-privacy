import Foundation

/// Pesagem registrada do lote (peso médio dos animais).
struct Pesagem: Identifiable, Codable, Hashable {
    var id: UUID
    var data: Date
    var pesoMedio: Double
    var observacao: String

    init(id: UUID = UUID(), data: Date = Date(), pesoMedio: Double, observacao: String = "") {
        self.id = id
        self.data = data
        self.pesoMedio = pesoMedio
        self.observacao = observacao
    }
}

/// Lote de novilhas em semiconfinamento.
struct Lote: Identifiable, Codable, Hashable {
    var id: UUID
    var nome: String
    var quantidadeAnimais: Int
    var pesoMedioInicial: Double
    /// Meta de ganho médio diário (kg/dia).
    var ganhoMetaDiario: Double
    var fase: FaseAnimal
    var grupoGenetico: GrupoGenetico
    var sistema: SistemaCriacao
    var dataEntrada: Date

    /// Planejamento de abate.
    var pesoAlvoAbate: Double
    var rendimentoCarcaca: Double
    /// Peso de acabamento usado no cálculo de peso equivalente.
    var pesoFinalMaturidade: Double
    var diasPorPeriodo: Int

    /// Calibração do consumo previsto (0,85 a 1,15).
    var ajusteConsumo: Double

    /// Insumos que compõem a ração.
    var volumosoID: UUID?
    var energeticoID: UUID?
    var proteicoID: UUID?
    var mineralID: UUID?
    var restricoes: RestricoesFormulacao

    var pesagens: [Pesagem]
    var observacoes: String

    init(id: UUID = UUID(),
         nome: String = "",
         quantidadeAnimais: Int = 50,
         pesoMedioInicial: Double = 240,
         ganhoMetaDiario: Double = 0.700,
         fase: FaseAnimal = .recriaInicial,
         grupoGenetico: GrupoGenetico = .zebuino,
         sistema: SistemaCriacao = .semiconfinamento,
         dataEntrada: Date = Date(),
         pesoAlvoAbate: Double = 420,
         rendimentoCarcaca: Double = 0.53,
         pesoFinalMaturidade: Double = 430,
         diasPorPeriodo: Int = 30,
         ajusteConsumo: Double = 1.0,
         volumosoID: UUID? = nil,
         energeticoID: UUID? = nil,
         proteicoID: UUID? = nil,
         mineralID: UUID? = nil,
         restricoes: RestricoesFormulacao = .padrao,
         pesagens: [Pesagem] = [],
         observacoes: String = "") {
        self.id = id
        self.nome = nome
        self.quantidadeAnimais = quantidadeAnimais
        self.pesoMedioInicial = pesoMedioInicial
        self.ganhoMetaDiario = ganhoMetaDiario
        self.fase = fase
        self.grupoGenetico = grupoGenetico
        self.sistema = sistema
        self.dataEntrada = dataEntrada
        self.pesoAlvoAbate = pesoAlvoAbate
        self.rendimentoCarcaca = rendimentoCarcaca
        self.pesoFinalMaturidade = pesoFinalMaturidade
        self.diasPorPeriodo = diasPorPeriodo
        self.ajusteConsumo = ajusteConsumo
        self.volumosoID = volumosoID
        self.energeticoID = energeticoID
        self.proteicoID = proteicoID
        self.mineralID = mineralID
        self.restricoes = restricoes
        self.pesagens = pesagens
        self.observacoes = observacoes
    }

    /// Pesagens em ordem cronológica.
    var pesagensOrdenadas: [Pesagem] {
        pesagens.sorted { $0.data < $1.data }
    }

    var ultimaPesagem: Pesagem? { pesagensOrdenadas.last }

    /// Peso médio atual: última pesagem registrada ou o peso de entrada.
    var pesoAtual: Double {
        ultimaPesagem?.pesoMedio ?? pesoMedioInicial
    }

    var dataReferencia: Date {
        ultimaPesagem?.data ?? dataEntrada
    }

    /// Ganho médio diário observado entre a entrada e a última pesagem.
    var ganhoRealDiario: Double? {
        guard let ultima = ultimaPesagem else { return nil }
        let dias = ultima.data.timeIntervalSince(dataEntrada) / 86_400
        guard dias >= 1 else { return nil }
        return (ultima.pesoMedio - pesoMedioInicial) / dias
    }

    var pesoTotalLote: Double { pesoAtual * Double(quantidadeAnimais) }

    /// Perfil para o cálculo de exigências em um determinado peso.
    func perfil(paraPeso peso: Double, faseAutomatica: Bool = false) -> PerfilAnimal {
        PerfilAnimal(pesoVivo: peso,
                     fase: faseAutomatica ? FaseAnimal.sugerida(paraPeso: peso) : fase,
                     grupoGenetico: grupoGenetico,
                     sistema: sistema,
                     pesoFinal: pesoFinalMaturidade,
                     ajusteConsumo: ajusteConsumo)
    }

    var perfilAtual: PerfilAnimal { perfil(paraPeso: pesoAtual) }

    /// Peso ainda a ganhar por animal até o abate.
    var ganhoRestante: Double { max(0, pesoAlvoAbate - pesoAtual) }

    /// Arrobas de carcaça no peso atual.
    var arrobasAtuais: Double { pesoAtual * rendimentoCarcaca / 15 }

    /// Arrobas de carcaça previstas no abate.
    var arrobasNoAbate: Double { pesoAlvoAbate * rendimentoCarcaca / 15 }

    var estaPronto: Bool { pesoAtual >= pesoAlvoAbate }

    static func exemplo() -> Lote {
        Lote(nome: "Lote 1 - Novilhas Nelore",
             quantidadeAnimais: 40,
             pesoMedioInicial: 260,
             ganhoMetaDiario: 0.750,
             fase: .recriaInicial,
             pesoAlvoAbate: 430,
             pesoFinalMaturidade: 430)
    }
}
