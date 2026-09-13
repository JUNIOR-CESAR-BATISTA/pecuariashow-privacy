import Foundation

/// O que o produtor informa no dia do abate.
struct ResultadoAbate: Hashable {
    var dataAbate: Date
    var pesoFinalReal: Double
    var animaisAbatidos: Int
    /// Peso médio de carcaça em kg. Zero quando o frigorífico ainda não fechou.
    var pesoCarcacaReal: Double
    /// Concentrado realmente fornecido no ciclo, em kg de matéria natural.
    var concentradoReal: Double
    var custoReal: Double
    var precoArroba: Double
    var observacoes: String

    init(dataAbate: Date = Date(),
         pesoFinalReal: Double = 0,
         animaisAbatidos: Int = 0,
         pesoCarcacaReal: Double = 0,
         concentradoReal: Double = 0,
         custoReal: Double = 0,
         precoArroba: Double = 0,
         observacoes: String = "") {
        self.dataAbate = dataAbate
        self.pesoFinalReal = pesoFinalReal
        self.animaisAbatidos = animaisAbatidos
        self.pesoCarcacaReal = pesoCarcacaReal
        self.concentradoReal = concentradoReal
        self.custoReal = custoReal
        self.precoArroba = precoArroba
        self.observacoes = observacoes
    }
}

/// Um lote que já foi abatido, com o que foi planejado e o que de fato aconteceu.
///
/// É a memória da fazenda: cada ciclo encerrado vira base de comparação e
/// calibração para os lotes seguintes.
struct CicloEncerrado: Identifiable, Codable, Hashable {
    var id: UUID
    var loteID: UUID
    var nome: String
    var grupoGenetico: GrupoGenetico
    var sistema: SistemaCriacao

    // MARK: Plano, fotografado no momento do encerramento

    var dataInicio: Date
    var pesoInicial: Double
    var ganhoMeta: Double
    var pesoAlvo: Double
    var animaisIniciais: Int
    var pesoAcabamentoPlanejado: Double
    /// Consumo médio previsto, em kg de matéria seca por animal por dia.
    var consumoPrevistoDiario: Double
    /// Teor médio da dieta planejada (% da matéria seca).
    var ndtDietaMedia: Double
    var pbDietaMedia: Double
    /// Concentrado previsto para o ciclo inteiro, em kg de matéria natural.
    var concentradoPrevisto: Double
    var custoPrevisto: Double
    var volumosoNome: String
    var energeticoNome: String
    var proteicoNome: String

    // MARK: Realizado

    var dataAbate: Date
    var pesoFinalReal: Double
    var animaisAbatidos: Int
    /// Peso médio de carcaça, em kg. Zero quando não informado.
    var pesoCarcacaReal: Double
    /// Concentrado realmente fornecido no ciclo, em kg de matéria natural.
    var concentradoReal: Double
    var custoReal: Double
    /// Preço recebido por arroba. Zero quando não informado.
    var precoArroba: Double
    var observacoes: String

    init(id: UUID = UUID(),
         loteID: UUID,
         nome: String,
         grupoGenetico: GrupoGenetico,
         sistema: SistemaCriacao,
         dataInicio: Date,
         pesoInicial: Double,
         ganhoMeta: Double,
         pesoAlvo: Double,
         animaisIniciais: Int,
         pesoAcabamentoPlanejado: Double,
         consumoPrevistoDiario: Double,
         ndtDietaMedia: Double,
         pbDietaMedia: Double,
         concentradoPrevisto: Double,
         custoPrevisto: Double,
         volumosoNome: String,
         energeticoNome: String,
         proteicoNome: String,
         dataAbate: Date,
         pesoFinalReal: Double,
         animaisAbatidos: Int,
         pesoCarcacaReal: Double = 0,
         concentradoReal: Double = 0,
         custoReal: Double = 0,
         precoArroba: Double = 0,
         observacoes: String = "") {
        self.id = id
        self.loteID = loteID
        self.nome = nome
        self.grupoGenetico = grupoGenetico
        self.sistema = sistema
        self.dataInicio = dataInicio
        self.pesoInicial = pesoInicial
        self.ganhoMeta = ganhoMeta
        self.pesoAlvo = pesoAlvo
        self.animaisIniciais = animaisIniciais
        self.pesoAcabamentoPlanejado = pesoAcabamentoPlanejado
        self.consumoPrevistoDiario = consumoPrevistoDiario
        self.ndtDietaMedia = ndtDietaMedia
        self.pbDietaMedia = pbDietaMedia
        self.concentradoPrevisto = concentradoPrevisto
        self.custoPrevisto = custoPrevisto
        self.volumosoNome = volumosoNome
        self.energeticoNome = energeticoNome
        self.proteicoNome = proteicoNome
        self.dataAbate = dataAbate
        self.pesoFinalReal = pesoFinalReal
        self.animaisAbatidos = animaisAbatidos
        self.pesoCarcacaReal = pesoCarcacaReal
        self.concentradoReal = concentradoReal
        self.custoReal = custoReal
        self.precoArroba = precoArroba
        self.observacoes = observacoes
    }

    // MARK: - Desempenho observado

    /// Duração real do ciclo, em dias.
    var diasReais: Double {
        max(dataAbate.timeIntervalSince(dataInicio) / 86_400, 0)
    }

    var diasPlanejados: Double {
        ganhoMeta > 0 ? max(0, pesoAlvo - pesoInicial) / ganhoMeta : 0
    }

    var ganhoTotalPorAnimal: Double { max(0, pesoFinalReal - pesoInicial) }

    var ganhoTotalLote: Double { ganhoTotalPorAnimal * Double(animaisAbatidos) }

    /// Ganho médio diário observado (kg/dia).
    var ganhoRealDiario: Double {
        diasReais >= 1 ? ganhoTotalPorAnimal / diasReais : 0
    }

    /// Quanto do ganho planejado foi entregue. 1,0 = exatamente a meta.
    var aderenciaGanho: Double {
        ganhoMeta > 0 ? ganhoRealDiario / ganhoMeta : 0
    }

    /// Peso médio do animal ao longo do ciclo, usado nas contas de calibração.
    var pesoMedioCiclo: Double { (pesoInicial + pesoFinalReal) / 2 }

    /// Rendimento de carcaça observado (fração). Nulo quando não informado.
    var rendimentoReal: Double? {
        guard pesoCarcacaReal > 0, pesoFinalReal > 0 else { return nil }
        return pesoCarcacaReal / pesoFinalReal
    }

    var arrobasPorAnimal: Double {
        pesoCarcacaReal > 0 ? pesoCarcacaReal / 15 : 0
    }

    var arrobasLote: Double { arrobasPorAnimal * Double(animaisAbatidos) }

    /// Arrobas produzidas no ciclo, descontando a carcaça de entrada.
    var arrobasProduzidasLote: Double {
        guard let rendimento = rendimentoReal else { return 0 }
        let carcacaInicial = pesoInicial * rendimento
        return (pesoCarcacaReal - carcacaInicial) / 15 * Double(animaisAbatidos)
    }

    var animaisPerdidos: Int { max(0, animaisIniciais - animaisAbatidos) }

    var taxaPerda: Double {
        animaisIniciais > 0 ? Double(animaisPerdidos) / Double(animaisIniciais) : 0
    }

    // MARK: - Custo

    var temCusto: Bool { custoReal > 0 }

    var custoPorArroba: Double? {
        guard custoReal > 0, arrobasProduzidasLote > 0 else { return nil }
        return custoReal / arrobasProduzidasLote
    }

    var custoPorKgGanho: Double? {
        guard custoReal > 0, ganhoTotalLote > 0 else { return nil }
        return custoReal / ganhoTotalLote
    }

    var custoPorAnimalDia: Double? {
        let base = diasReais * Double(animaisAbatidos)
        guard custoReal > 0, base > 0 else { return nil }
        return custoReal / base
    }

    var receita: Double? {
        guard precoArroba > 0, arrobasLote > 0 else { return nil }
        return precoArroba * arrobasLote
    }

    var margem: Double? {
        guard let receita, custoReal > 0 else { return nil }
        return receita - custoReal
    }

    /// Quanto do concentrado planejado foi de fato fornecido.
    var aderenciaConcentrado: Double? {
        guard concentradoPrevisto > 0, concentradoReal > 0 else { return nil }
        return concentradoReal / concentradoPrevisto
    }

    /// Desvio do custo em relação ao previsto.
    var desvioCusto: Double? {
        guard custoPrevisto > 0, custoReal > 0 else { return nil }
        return custoReal / custoPrevisto - 1
    }
}
