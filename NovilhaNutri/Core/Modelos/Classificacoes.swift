import Foundation

/// Fase de criação da novilha. Define apenas parâmetros de manejo
/// (faixas de peso, pisos práticos de proteína e sugestões de dieta);
/// a exigência nutricional em si é calculada a partir de peso e ganho.
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
        case .terminacao: return "Terminação"
        }
    }

    var descricao: String {
        switch self {
        case .desmama: return "Pós-desmame, 150 a 210 kg"
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

    /// Piso prático de proteína bruta na matéria seca (%), usado como
    /// segurança para funcionamento ruminal e consumo.
    var proteinaMinimaDieta: Double {
        switch self {
        case .desmama: return 13.0
        case .recriaInicial: return 12.0
        case .recriaFinal: return 11.0
        case .terminacao: return 11.0
        }
    }

    /// Participação de volumoso sugerida na matéria seca (fração).
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

/// Grupo genético predominante do lote.
enum GrupoGenetico: String, Codable, CaseIterable, Identifiable, Hashable {
    case zebuino
    case cruzado
    case taurino

    var id: String { rawValue }

    var nome: String {
        switch self {
        case .zebuino: return "Zebuíno (Nelore e similares)"
        case .cruzado: return "Cruzado (F1 e compostos)"
        case .taurino: return "Taurino (Angus e similares)"
        }
    }

    var nomeCurto: String {
        switch self {
        case .zebuino: return "Zebuíno"
        case .cruzado: return "Cruzado"
        case .taurino: return "Taurino"
        }
    }

    /// Ajuste da exigência de mantença em relação ao padrão taurino.
    var fatorMantenca: Double {
        switch self {
        case .zebuino: return 0.90
        case .cruzado: return 0.95
        case .taurino: return 1.00
        }
    }

    /// Peso adulto/de terminação típico das fêmeas, usado no peso equivalente.
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

/// Sistema de criação: define o incremento de gasto energético com atividade.
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
        case .semiconfinamento: return "Pastejo com ração no cocho"
        case .pasto: return "Pastejo extensivo, maior deslocamento"
        }
    }

    /// Fator de atividade aplicado a exigência de mantença.
    var fatorAtividade: Double {
        switch self {
        case .confinamento: return 1.00
        case .semiconfinamento: return 1.10
        case .pasto: return 1.20
        }
    }
}

/// Papel do insumo na formulação da ração.
enum CategoriaInsumo: String, Codable, CaseIterable, Identifiable, Hashable {
    case volumoso
    case energetico
    case proteico
    case mineral

    var id: String { rawValue }

    var nome: String {
        switch self {
        case .volumoso: return "Volumoso"
        case .energetico: return "Energético"
        case .proteico: return "Proteico"
        case .mineral: return "Mineral / núcleo"
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

/// Como o animal foi comprado, para a previsão de resultado.
enum ModoCompra: String, Codable, CaseIterable, Identifiable, Hashable {
    case porArroba
    case porCabeca

    var id: String { rawValue }

    var nome: String {
        switch self {
        case .porArroba: return "Por arroba"
        case .porCabeca: return "Por cabeça"
        }
    }

    /// Sufixo do campo de entrada, onde só vai o número.
    var unidade: String {
        switch self {
        case .porArroba: return "R$/@"
        case .porCabeca: return "R$/cab"
        }
    }

    /// Para frases: "R$ 300,00 <por arroba de carcaça na entrada>".
    var porQue: String {
        switch self {
        case .porArroba: return "por arroba de carcaça na entrada"
        case .porCabeca: return "por cabeça"
        }
    }

    var descricao: String {
        switch self {
        case .porArroba:
            return "O preço combinado vale por arroba de carcaça no peso de entrada."
        case .porCabeca:
            return "O preço combinado vale por animal, qualquer que seja o peso."
        }
    }
}
