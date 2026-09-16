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

    /// Compra e venda, para a previsão de resultado.
    var modoCompra: ModoCompra
    /// Preço pago pelo animal, na unidade do `modoCompra`: reais por arroba de
    /// carcaça no peso de entrada, ou reais por cabeça. Zero quer dizer que não
    /// houve compra (animal de cria própria) ou que o valor ainda não foi
    /// informado - nos dois casos o resultado sai contando só a dieta.
    var precoCompra: Double
    /// Preço esperado da arroba na venda (R$/@).
    var precoArrobaVenda: Double

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
         modoCompra: ModoCompra = .porArroba,
         precoCompra: Double = 0,
         precoArrobaVenda: Double = 0,
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
        self.modoCompra = modoCompra
        self.precoCompra = precoCompra
        self.precoArrobaVenda = precoArrobaVenda
        self.volumosoID = volumosoID
        self.energeticoID = energeticoID
        self.proteicoID = proteicoID
        self.mineralID = mineralID
        self.restricoes = restricoes
        self.pesagens = pesagens
        self.observacoes = observacoes
    }

    /// Leitura tolerante do arquivo gravado.
    ///
    /// O `Codable` sintetizado exige todas as chaves, então um backup feito
    /// antes de um campo novo deixaria de abrir. Aqui cada campo ausente cai
    /// no mesmo padrão do inicializador - foi o que permitiu acrescentar
    /// compra e venda sem invalidar os arquivos de quem já usa o aplicativo.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decodeIfPresent(UUID.self, forKey: .id) ?? UUID()
        nome = try c.decodeIfPresent(String.self, forKey: .nome) ?? ""
        quantidadeAnimais = try c.decodeIfPresent(Int.self, forKey: .quantidadeAnimais) ?? 50
        pesoMedioInicial = try c.decodeIfPresent(Double.self, forKey: .pesoMedioInicial) ?? 240
        ganhoMetaDiario = try c.decodeIfPresent(Double.self, forKey: .ganhoMetaDiario) ?? 0.700
        fase = try c.decodeIfPresent(FaseAnimal.self, forKey: .fase) ?? .recriaInicial
        grupoGenetico = try c.decodeIfPresent(GrupoGenetico.self, forKey: .grupoGenetico) ?? .zebuino
        sistema = try c.decodeIfPresent(SistemaCriacao.self, forKey: .sistema) ?? .semiconfinamento
        dataEntrada = try c.decodeIfPresent(Date.self, forKey: .dataEntrada) ?? Date()
        pesoAlvoAbate = try c.decodeIfPresent(Double.self, forKey: .pesoAlvoAbate) ?? 420
        rendimentoCarcaca = try c.decodeIfPresent(Double.self, forKey: .rendimentoCarcaca) ?? 0.53
        pesoFinalMaturidade = try c.decodeIfPresent(Double.self, forKey: .pesoFinalMaturidade) ?? 430
        diasPorPeriodo = try c.decodeIfPresent(Int.self, forKey: .diasPorPeriodo) ?? 30
        ajusteConsumo = try c.decodeIfPresent(Double.self, forKey: .ajusteConsumo) ?? 1.0
        modoCompra = try c.decodeIfPresent(ModoCompra.self, forKey: .modoCompra) ?? .porArroba
        precoCompra = try c.decodeIfPresent(Double.self, forKey: .precoCompra) ?? 0
        precoArrobaVenda = try c.decodeIfPresent(Double.self, forKey: .precoArrobaVenda) ?? 0
        volumosoID = try c.decodeIfPresent(UUID.self, forKey: .volumosoID)
        energeticoID = try c.decodeIfPresent(UUID.self, forKey: .energeticoID)
        proteicoID = try c.decodeIfPresent(UUID.self, forKey: .proteicoID)
        mineralID = try c.decodeIfPresent(UUID.self, forKey: .mineralID)
        restricoes = try c.decodeIfPresent(RestricoesFormulacao.self, forKey: .restricoes) ?? .padrao
        pesagens = try c.decodeIfPresent([Pesagem].self, forKey: .pesagens) ?? []
        observacoes = try c.decodeIfPresent(String.self, forKey: .observacoes) ?? ""
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

    // MARK: Compra

    /// Arrobas de carcaça consideradas na compra.
    ///
    /// Usa o peso de **entrada**, não o de hoje: é o peso pelo qual o animal
    /// foi pago. O rendimento é o mesmo cadastrado para o abate - na prática o
    /// rendimento do magro é menor, então quem negocia com rendimentos
    /// diferentes deve informar o preço já por cabeça.
    var arrobasCompra: Double { pesoMedioInicial * rendimentoCarcaca / 15 }

    /// O que cada animal custou na entrada, seja qual for o modo de compra.
    var custoCompraPorAnimal: Double {
        guard precoCompra > 0 else { return 0 }
        switch modoCompra {
        case .porArroba: return precoCompra * arrobasCompra
        case .porCabeca: return precoCompra
        }
    }

    var custoCompraLote: Double { custoCompraPorAnimal * Double(quantidadeAnimais) }

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
