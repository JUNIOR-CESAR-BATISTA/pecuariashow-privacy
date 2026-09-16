import Foundation

/// Forma de aquisição do insumo, usada na conversão de quilos para sacas.
struct Embalagem: Codable, Hashable {
    enum Tipo: String, Codable, CaseIterable, Identifiable, Hashable {
        case saca
        case granel
        case pastejo

        var id: String { rawValue }

        var nome: String {
            switch self {
            case .saca: return "Saca"
            case .granel: return "Granel (tonelada)"
            case .pastejo: return "Pastejo (não comprado)"
            }
        }
    }

    var tipo: Tipo
    /// Peso líquido da saca em quilos. Relevante apenas quando `tipo == .saca`.
    var kgPorSaca: Double

    init(tipo: Tipo = .saca, kgPorSaca: Double = 50) {
        self.tipo = tipo
        self.kgPorSaca = kgPorSaca
    }

    /// Tamanhos de saca praticados no mercado brasileiro de insumos.
    static let tamanhosPadrao: [Double] = [60, 50, 40, 30, 25, 20]

    static let saca60 = Embalagem(tipo: .saca, kgPorSaca: 60)
    static let saca50 = Embalagem(tipo: .saca, kgPorSaca: 50)
    static let saca40 = Embalagem(tipo: .saca, kgPorSaca: 40)
    static let saca30 = Embalagem(tipo: .saca, kgPorSaca: 30)
    static let saca25 = Embalagem(tipo: .saca, kgPorSaca: 25)
    static let granel = Embalagem(tipo: .granel, kgPorSaca: 1000)
    static let pastejo = Embalagem(tipo: .pastejo, kgPorSaca: 0)

    var descricao: String {
        switch tipo {
        case .saca: return "Saca de \(Formatadores.numero(kgPorSaca, casas: 0)) kg"
        case .granel: return "Granel (tonelada)"
        case .pastejo: return "Pastejo"
        }
    }

    /// Quantidade de quilos que corresponde a uma unidade de compra.
    /// Retorna `nil` quando o insumo não é adquirido (pastejo).
    var kgPorUnidade: Double? {
        switch tipo {
        case .saca: return kgPorSaca > 0 ? kgPorSaca : nil
        case .granel: return 1000
        case .pastejo: return nil
        }
    }

    var nomeUnidade: String {
        switch tipo {
        case .saca: return "saca"
        case .granel: return "tonelada"
        case .pastejo: return "-"
        }
    }

    var nomeUnidadePlural: String {
        switch tipo {
        case .saca: return "sacas"
        case .granel: return "toneladas"
        case .pastejo: return "-"
        }
    }
}

/// Alimento disponível na propriedade, com sua composição bromatológica.
/// Teores de PB e NDT são sempre expressos em percentual da matéria seca.
struct Insumo: Identifiable, Codable, Hashable {
    var id: UUID
    var nome: String
    var categoria: CategoriaInsumo
    /// Matéria seca (% da matéria natural).
    var materiaSeca: Double
    /// Proteína bruta (% da matéria seca).
    var proteinaBruta: Double
    /// Nutrientes digestíveis totais (% da matéria seca).
    var ndt: Double
    var embalagem: Embalagem
    /// Preço por unidade de compra (por saca, ou por tonelada no granel).
    var precoUnitario: Double
    var observacao: String

    init(id: UUID = UUID(),
         nome: String,
         categoria: CategoriaInsumo,
         materiaSeca: Double,
         proteinaBruta: Double,
         ndt: Double,
         embalagem: Embalagem = .saca50,
         precoUnitario: Double = 0,
         observacao: String = "") {
        self.id = id
        self.nome = nome
        self.categoria = categoria
        self.materiaSeca = materiaSeca
        self.proteinaBruta = proteinaBruta
        self.ndt = ndt
        self.embalagem = embalagem
        self.precoUnitario = precoUnitario
        self.observacao = observacao
    }

    /// Fração de matéria seca (0 a 1), protegida contra valores inválidos.
    var fracaoMateriaSeca: Double {
        min(max(materiaSeca / 100, 0.01), 1.0)
    }

    /// Converte quilos de matéria seca em quilos de matéria natural (como fornecido).
    func materiaNatural(deMateriaSeca kgMS: Double) -> Double {
        kgMS / fracaoMateriaSeca
    }

    /// Converte quilos de matéria natural em quilos de matéria seca.
    func materiaSeca(deMateriaNatural kgMN: Double) -> Double {
        kgMN * fracaoMateriaSeca
    }

    /// Preço por quilo de matéria natural.
    var precoPorKg: Double {
        guard let kg = embalagem.kgPorUnidade, kg > 0 else { return 0 }
        return precoUnitario / kg
    }

    /// Preço por quilo de matéria seca, útil para comparar alimentos.
    var precoPorKgMateriaSeca: Double {
        precoPorKg / fracaoMateriaSeca
    }

    var resumoBromatologico: String {
        "MS \(Formatadores.percentual(materiaSeca)) - PB \(Formatadores.percentual(proteinaBruta)) - NDT \(Formatadores.percentual(ndt))"
    }
}
