import Foundation

/// Resultado da conversão de uma quantidade em quilos para unidades de compra.
struct ConversaoSacas: Hashable {
    var totalKg: Double
    var kgPorUnidade: Double
    var nomeUnidade: String
    var nomeUnidadePlural: String

    /// Número fracionário de unidades (ex.: 12,4 sacas).
    var unidadesExatas: Double
    /// Unidades completas.
    var unidadesInteiras: Int
    /// Sobra em quilos além das unidades completas.
    var sobraKg: Double
    /// Unidades a comprar, sempre arredondando para cima.
    var unidadesParaCompra: Int

    var toneladas: Double { totalKg / 1000 }

    /// "12 sacas de 50 kg + 20,0 kg"
    var descricao: String {
        let nome = unidadesInteiras == 1 ? nomeUnidade : nomeUnidadePlural
        let base = "\(unidadesInteiras) \(nome) de \(Formatadores.numero(kgPorUnidade, casas: 0)) kg"
        if sobraKg >= 0.05 {
            return base + " + " + Formatadores.numero(sobraKg, casas: 1) + " kg"
        }
        return base
    }

    var descricaoCompra: String {
        let nome = unidadesParaCompra == 1 ? nomeUnidade : nomeUnidadePlural
        return "\(unidadesParaCompra) \(nome)"
    }
}

/// Converte quantidades de insumo em quilos para sacas ou toneladas.
enum ConversorSacas {

    /// Converte uma quantidade em quilos usando um tamanho de embalagem livre.
    static func converter(kg: Double,
                          kgPorUnidade: Double,
                          nomeUnidade: String = "saca",
                          nomeUnidadePlural: String = "sacas") -> ConversaoSacas? {
        guard kgPorUnidade > 0, kg.isFinite, kg >= 0 else { return nil }
        let exatas = kg / kgPorUnidade
        let inteiras = Int(floor(exatas + 1e-9))
        let sobra = max(0, kg - Double(inteiras) * kgPorUnidade)
        let compra = Int(ceil(exatas - 1e-9))
        return ConversaoSacas(totalKg: kg,
                              kgPorUnidade: kgPorUnidade,
                              nomeUnidade: nomeUnidade,
                              nomeUnidadePlural: nomeUnidadePlural,
                              unidadesExatas: exatas,
                              unidadesInteiras: inteiras,
                              sobraKg: sobra,
                              unidadesParaCompra: compra)
    }

    /// Converte usando a embalagem cadastrada no insumo.
    /// Retorna `nil` para insumos que não são adquiridos (pastejo).
    static func converter(kg: Double, embalagem: Embalagem) -> ConversaoSacas? {
        guard let kgPorUnidade = embalagem.kgPorUnidade else { return nil }
        return converter(kg: kg,
                         kgPorUnidade: kgPorUnidade,
                         nomeUnidade: embalagem.nomeUnidade,
                         nomeUnidadePlural: embalagem.nomeUnidadePlural)
    }

    /// Converte a mesma quantidade para todos os tamanhos de saca de mercado.
    static func equivalencias(kg: Double) -> [ConversaoSacas] {
        Embalagem.tamanhosPadrao.compactMap { converter(kg: kg, kgPorUnidade: $0) }
    }
}
