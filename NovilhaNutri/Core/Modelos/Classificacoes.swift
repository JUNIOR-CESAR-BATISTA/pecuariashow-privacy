import Foundation

/// Fase de criacao da novilha. Define apenas parametros de manejo
/// (faixas de peso, pisos praticos de proteina e sugestoes de dieta);
/// a exigencia nutricional em si e calculada a partir de peso e ganho.
enum FaseAnimal: String, Codable, CaseIterable, Identifiable, Hashable {
    case desmama
    case recriaInicial
    case recriaFinal
    case terminacao

    var id: String { rawValue }

    var nome: String {
        switch self {
        case .desmama: return "Desmama"
        case .recriaInicial: return "Recria inicial"
        case .recriaFinal: return "Recria final"
        case .terminacao: return "Terminacao"
        }
    }

    var descricao: String {
        switch self {
        case .desmama: return "Pos-desmame, 150 a 210 kg"
        case .recriaInicial: return "Crescimento, 210 a 280 kg"
        case .recriaFinal: return "Crescimento, 280 a 360 kg"
        case .terminacao: return "Acabamento, acima de 360 kg"
        }
    }

    var faixaPeso: ClosedRange<Double> {
        switch self {
        case .desmama: return 150...210
        case .recriaInicial: return 210...280
        case .recriaFinal: return 280...360
        case .terminacao: return 360...600
        }
    }

    /// Piso pratico de proteina bruta na materia seca (%), usado como
    /// seguranca para funcionamento ruminal e consumo.
    var proteinaMinimaDieta: Double {
        switch self {
        case .desmama: return 13.0
        case .recriaInicial: return 12.0
        case .recriaFinal: return 11.0
        case .terminacao: return 11.0
        }
    }

    /// Participacao de volumoso sugerida na materia seca (fracao).
    var volumosoSugerido: Double {
        switch self {
        case .desmama: return 0.65
        case .recriaInicial: return 0.65
        case .recriaFinal: return 0.60
        case .terminacao: return 0.45
        }
    }

    var gmdSugerido: Double {
        switch self {
        case .desmama: return 0.55
        case .recriaInicial: return 0.65
        case .recriaFinal: return 0.75
        case .terminacao: return 0.90
        }
    }

    static func sugerida(paraPeso peso: Double) -> FaseAnimal {
        switch peso {
        case ..<210: return .desmama
        case ..<280: return .recriaInicial
        case ..<360: return .recriaFinal
        default: return .terminacao
        }
    }
}

/// Grupo genetico predominante do lote.
enum GrupoGenetico: String, Codable, CaseIterable, Identifiable, Hashable {
    case zebuino
    case cruzado
    case taurino

    var id: String { rawValue }

    var nome: String {
        switch self {
        case .zebuino: return "Zebuino (Nelore e similares)"
        case .cruzado: return "Cruzado (F1 e compostos)"
        case .taurino: return "Taurino (Angus e similares)"
        }
    }

    var nomeCurto: String {
        switch self {
        case .zebuino: return "Zebuino"
        case .cruzado: return "Cruzado"
        case .taurino: return "Taurino"
        }
    }

    /// Ajuste da exigencia de mantenca em relacao ao padrao taurino.
    var fatorMantenca: Double {
        switch self {
        case .zebuino: return 0.90
        case .cruzado: return 0.95
        case .taurino: return 1.00
        }
    }

    /// Peso adulto/de terminacao tipico das femeas, usado no peso equivalente.
    var pesoFinalSugerido: Double {
        switch self {
        case .zebuino: return 430
        case .cruzado: return 470
        case .taurino: return 500
        }
    }

    var rendimentoCarcacaSugerido: Double {
        switch self {
        case .zebuino: return 0.53
        case .cruzado: return 0.54
        case .taurino: return 0.55
        }
    }
}

/// Sistema de criacao: define o incremento de gasto energetico com atividade.
enum SistemaCriacao: String, Codable, CaseIterable, Identifiable, Hashable {
    case confinamento
    case semiconfinamento
    case pasto

    var id: String { rawValue }

    var nome: String {
        switch self {
        case .confinamento: return "Confinamento"
        case .semiconfinamento: return "Semiconfinamento"
        case .pasto: return "Pasto com suplemento"
        }
    }

    var descricao: String {
        switch self {
        case .confinamento: return "Animais em curral, sem deslocamento"
        case .semiconfinamento: return "Pastejo com racao no cocho"
        case .pasto: return "Pastejo extensivo, maior deslocamento"
        }
    }

    /// Fator de atividade aplicado a exigencia de mantenca.
    var fatorAtividade: Double {
        switch self {
        case .confinamento: return 1.00
        case .semiconfinamento: return 1.10
        case .pasto: return 1.20
        }
    }
}

/// Papel do insumo na formulacao da racao.
enum CategoriaInsumo: String, Codable, CaseIterable, Identifiable, Hashable {
    case volumoso
    case energetico
    case proteico
    case mineral

    var id: String { rawValue }

    var nome: String {
        switch self {
        case .volumoso: return "Volumoso"
        case .energetico: return "Energetico"
        case .proteico: return "Proteico"
        case .mineral: return "Mineral / nucleo"
        }
    }

    var simbolo: String {
        switch self {
        case .volumoso: return "leaf.fill"
        case .energetico: return "flame.fill"
        case .proteico: return "bolt.fill"
        case .mineral: return "cube.fill"
        }
    }
}
