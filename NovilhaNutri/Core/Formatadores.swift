import Foundation

/// Formatacao numerica e de datas no padrao brasileiro.
enum Formatadores {
    static let localeBR = Locale(identifier: "pt_BR")

    private static func formatter(casas: Int) -> NumberFormatter {
        let f = NumberFormatter()
        f.locale = localeBR
        f.numberStyle = .decimal
        f.minimumFractionDigits = casas
        f.maximumFractionDigits = casas
        return f
    }

    private static let moedaFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.locale = localeBR
        f.numberStyle = .currency
        f.currencyCode = "BRL"
        f.currencySymbol = "R$"
        return f
    }()

    private static let dataFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = localeBR
        f.dateFormat = "dd/MM/yyyy"
        return f
    }()

    private static let mesFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = localeBR
        f.dateFormat = "MMM/yy"
        return f
    }()

    static func numero(_ valor: Double, casas: Int = 2) -> String {
        guard valor.isFinite else { return "-" }
        return formatter(casas: casas).string(from: NSNumber(value: valor)) ?? "-"
    }

    /// Quilos com uma casa decimal ate 100 kg e sem casas acima disso.
    static func kg(_ valor: Double) -> String {
        guard valor.isFinite else { return "-" }
        let casas = abs(valor) < 100 ? 2 : 0
        return numero(valor, casas: casas) + " kg"
    }

    static func gramas(_ valor: Double) -> String {
        numero(valor, casas: 0) + " g"
    }

    static func percentual(_ valor: Double, casas: Int = 1) -> String {
        numero(valor, casas: casas) + "%"
    }

    static func moeda(_ valor: Double) -> String {
        guard valor.isFinite else { return "-" }
        return moedaFormatter.string(from: NSNumber(value: valor)) ?? "-"
    }

    static func data(_ valor: Date) -> String {
        dataFormatter.string(from: valor)
    }

    static func mesAno(_ valor: Date) -> String {
        mesFormatter.string(from: valor)
    }

    /// "8 meses e 12 dias" a partir de uma contagem de dias.
    static func duracao(dias: Double) -> String {
        let total = Int(dias.rounded())
        guard total > 0 else { return "0 dias" }
        let meses = total / 30
        let resto = total % 30
        if meses == 0 { return "\(resto) dia\(resto == 1 ? "" : "s")" }
        if resto == 0 { return "\(meses) \(meses == 1 ? "mes" : "meses")" }
        return "\(meses) \(meses == 1 ? "mes" : "meses") e \(resto) dia\(resto == 1 ? "" : "s")"
    }

    static func arroba(_ valor: Double) -> String {
        numero(valor, casas: 2) + " @"
    }
}
