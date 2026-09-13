import Foundation

/// Perfil do animal médio usado nos cálculos de exigência.
struct PerfilAnimal: Codable, Hashable {
    var pesoVivo: Double
    var fase: FaseAnimal
    var grupoGenetico: GrupoGenetico
    var sistema: SistemaCriacao
    /// Peso vivo em que o animal atinge o acabamento (usado no peso equivalente).
    var pesoFinal: Double
    /// Calibração do consumo previsto (1,0 = previsão padrão).
    var ajusteConsumo: Double

    init(pesoVivo: Double,
         fase: FaseAnimal,
         grupoGenetico: GrupoGenetico = .zebuino,
         sistema: SistemaCriacao = .semiconfinamento,
         pesoFinal: Double = 430,
         ajusteConsumo: Double = 1.0) {
        self.pesoVivo = pesoVivo
        self.fase = fase
        self.grupoGenetico = grupoGenetico
        self.sistema = sistema
        self.pesoFinal = pesoFinal
        self.ajusteConsumo = ajusteConsumo
    }
}

/// Resultado do cálculo das necessidades diárias de um animal.
struct ExigenciaDiaria: Hashable {
    var pesoVivo: Double
    /// Ganho considerado no cálculo. Pode ser menor que a meta quando ela é inviável.
    var ganhoDiario: Double
    var ganhoDiarioMeta: Double
    var metaAtingivel: Bool

    /// Consumo de matéria seca (kg/dia).
    var consumoMateriaSeca: Double
    var consumoPercentualPeso: Double

    /// Nutrientes digestíveis totais.
    var ndtKg: Double
    var ndtPercentualDieta: Double

    /// Proteína bruta.
    var proteinaBrutaKg: Double
    var proteinaBrutaPercentualDieta: Double
    var proteinaBrutaGramas: Double { proteinaBrutaKg * 1000 }
    /// Indica que o valor de PB foi elevado até o piso prático da fase.
    var proteinaAjustadaAoPiso: Bool

    /// Detalhamento energético e proteico (Mcal/dia e g/dia).
    var energiaLiquidaMantenca: Double
    var energiaLiquidaGanho: Double
    var energiaMetabolizavel: Double
    var proteinaMetabolizavelMantenca: Double
    var proteinaMetabolizavelGanho: Double
    var proteinaMetabolizavelTotal: Double

    var alertas: [String]

    var ndtGramas: Double { ndtKg * 1000 }
}

/// Ganho diário que uma dieta consegue sustentar, separado por nutriente limitante.
struct GanhoEsperado: Hashable {
    var porEnergia: Double
    var porProteina: Double
    var nutrienteLimitante: String

    var ganho: Double { min(porEnergia, porProteina) }
}

/// Motor de exigências nutricionais para novilhas em crescimento.
///
/// Segue o sistema de energia líquida e proteína metabolizável do NRC
/// (Nutrient Requirements of Beef Cattle), com ajustes de grupo genético e
/// de atividade usuais em condições brasileiras. Todas as constantes ficam
/// reunidas em `Constantes` para facilitar auditoria e calibração.
enum MotorExigencias {

    enum Constantes {
        /// Peso vivo -> peso vivo de jejum.
        static let fatorPesoJejum = 0.96
        /// Peso vivo de jejum -> peso de corpo vazio.
        static let fatorCorpoVazio = 0.891
        /// Ganho de peso vivo -> ganho de corpo vazio.
        static let fatorGanhoCorpoVazio = 0.956
        /// Exigência basal de energia líquida de mantença (Mcal/kg PCJ^0,75).
        static let energiaMantencaBase = 0.077
        /// Coeficientes de energia retida para fêmeas em crescimento.
        static let energiaRetidaA = 0.0783
        static let energiaRetidaB = 1.119
        /// Peso de referência do animal padrão com 28% de gordura corporal.
        static let pesoReferencia = 462.0
        /// Proteína metabolizável de mantença (g/kg PCJ^0,75).
        static let proteinaMantenca = 3.8
        /// Energia metabolizável como fração da energia digestível.
        static let emSobreEd = 0.82
        /// Mcal de energia digestível por quilo de NDT.
        static let mcalPorKgNDT = 4.409
        /// Proteína microbiana produzida por quilo de NDT (g).
        static let proteinaMicrobianaPorNDT = 130.0
        /// Eficiência de uso da proteína microbiana e da PNDR.
        static let eficienciaProteinaMicrobiana = 0.64
        static let eficienciaProteinaNaoDegradavel = 0.80
        /// Faixa de densidade energética considerada praticável (% NDT na MS).
        static let ndtMinimo = 40.0
        static let ndtMaximo = 85.0
    }

    // MARK: - Energia da dieta

    /// Energia metabolizável da dieta (Mcal/kg MS) a partir do teor de NDT.
    static func energiaMetabolizavelDieta(ndtPercentual: Double) -> Double {
        Constantes.emSobreEd * 0.04409 * ndtPercentual
    }

    /// Concentração de energia líquida de mantença da dieta (Mcal/kg MS).
    static func elMantencaDieta(ndtPercentual: Double) -> Double {
        let em = energiaMetabolizavelDieta(ndtPercentual: ndtPercentual)
        return 1.37 * em - 0.138 * pow(em, 2) + 0.0105 * pow(em, 3) - 1.12
    }

    /// Concentração de energia líquida de ganho da dieta (Mcal/kg MS).
    static func elGanhoDieta(ndtPercentual: Double) -> Double {
        let em = energiaMetabolizavelDieta(ndtPercentual: ndtPercentual)
        return 1.42 * em - 0.174 * pow(em, 2) + 0.0122 * pow(em, 3) - 1.65
    }

    // MARK: - Pesos derivados

    static func pesoJejum(_ perfil: PerfilAnimal) -> Double {
        max(perfil.pesoVivo, 1) * Constantes.fatorPesoJejum
    }

    /// Peso equivalente: corrige o grau de maturidade do animal em relação
    /// ao animal de referência. Animais mais precoces exigem mais energia
    /// por quilo ganho no mesmo peso.
    static func pesoEquivalente(_ perfil: PerfilAnimal) -> Double {
        let pesoFinalJejum = max(perfil.pesoFinal, 200) * Constantes.fatorPesoJejum
        return pesoJejum(perfil) * (Constantes.pesoReferencia / pesoFinalJejum)
    }

    static func corpoVazioEquivalente(_ perfil: PerfilAnimal) -> Double {
        pesoEquivalente(perfil) * Constantes.fatorCorpoVazio
    }

    // MARK: - Exigências de energia

    /// Energia líquida de mantença (Mcal/dia).
    static func energiaMantenca(_ perfil: PerfilAnimal) -> Double {
        Constantes.energiaMantencaBase
            * perfil.grupoGenetico.fatorMantenca
            * perfil.sistema.fatorAtividade
            * pow(pesoJejum(perfil), 0.75)
    }

    /// Energia retida no ganho (Mcal/dia).
    static func energiaRetida(_ perfil: PerfilAnimal, ganhoDiario: Double) -> Double {
        let ganhoCorpoVazio = Constantes.fatorGanhoCorpoVazio * max(ganhoDiario, 0)
        guard ganhoCorpoVazio > 0 else { return 0 }
        return Constantes.energiaRetidaA
            * pow(corpoVazioEquivalente(perfil), 0.75)
            * pow(ganhoCorpoVazio, Constantes.energiaRetidaB)
    }

    // MARK: - Consumo

    /// Consumo potencial de matéria seca previsto (kg/dia) para a densidade da dieta.
    static func consumoPotencial(_ perfil: PerfilAnimal, ndtPercentual: Double) -> Double {
        let elm = elMantencaDieta(ndtPercentual: ndtPercentual)
        guard elm > 0 else { return 0 }
        let base = pow(pesoJejum(perfil), 0.75)
            * (0.2435 * elm - 0.0466 * pow(elm, 2) - 0.1128) / elm
        return max(base * perfil.ajusteConsumo, 0)
    }

    /// Consumo de matéria seca necessário (kg/dia) para o ganho desejado
    /// numa dieta com a densidade informada.
    static func consumoNecessario(_ perfil: PerfilAnimal,
                                  ganhoDiario: Double,
                                  ndtPercentual: Double) -> Double {
        let elmDieta = elMantencaDieta(ndtPercentual: ndtPercentual)
        let elgDieta = elGanhoDieta(ndtPercentual: ndtPercentual)
        guard elmDieta > 0, elgDieta > 0 else { return .infinity }
        return energiaMantenca(perfil) / elmDieta
            + energiaRetida(perfil, ganhoDiario: ganhoDiario) / elgDieta
    }

    /// Densidade energética (% de NDT na MS) em que o consumo necessário
    /// iguala o consumo potencial. Retorna `nil` quando a meta é inviável.
    static func densidadeAlvo(_ perfil: PerfilAnimal, ganhoDiario: Double) -> Double? {
        func diferenca(_ ndt: Double) -> Double {
            consumoNecessario(perfil, ganhoDiario: ganhoDiario, ndtPercentual: ndt)
                - consumoPotencial(perfil, ndtPercentual: ndt)
        }
        if diferenca(Constantes.ndtMaximo) > 0 { return nil }
        var baixo = Constantes.ndtMinimo
        var alto = Constantes.ndtMaximo
        if diferenca(baixo) < 0 { return baixo }
        for _ in 0..<80 {
            let meio = (baixo + alto) / 2
            if diferenca(meio) > 0 { baixo = meio } else { alto = meio }
        }
        return (baixo + alto) / 2
    }

    /// Maior ganho diário sustentável dentro da faixa prática de densidade.
    static func ganhoMaximo(_ perfil: PerfilAnimal) -> Double {
        let ndt = Constantes.ndtMaximo
        let consumo = consumoPotencial(perfil, ndtPercentual: ndt)
        let sobra = consumo - energiaMantenca(perfil) / elMantencaDieta(ndtPercentual: ndt)
        guard sobra > 0 else { return 0 }
        let energia = sobra * elGanhoDieta(ndtPercentual: ndt)
        return ganhoAPartirDaEnergiaRetida(perfil, energiaRetida: energia)
    }

    /// Inverte a equação de energia retida para obter o ganho de peso vivo.
    static func ganhoAPartirDaEnergiaRetida(_ perfil: PerfilAnimal, energiaRetida: Double) -> Double {
        guard energiaRetida > 0 else { return 0 }
        let base = Constantes.energiaRetidaA * pow(corpoVazioEquivalente(perfil), 0.75)
        guard base > 0 else { return 0 }
        let ganhoCorpoVazio = pow(energiaRetida / base, 1 / Constantes.energiaRetidaB)
        return ganhoCorpoVazio / Constantes.fatorGanhoCorpoVazio
    }

    // MARK: - Exigências de proteína

    /// Proteína metabolizável de mantença (g/dia).
    static func proteinaMetabolizavelMantenca(_ perfil: PerfilAnimal) -> Double {
        Constantes.proteinaMantenca * pow(pesoJejum(perfil), 0.75)
    }

    /// Proteína metabolizável para ganho (g/dia).
    static func proteinaMetabolizavelGanho(_ perfil: PerfilAnimal, ganhoDiario: Double) -> Double {
        let ganhoCorpoVazio = Constantes.fatorGanhoCorpoVazio * max(ganhoDiario, 0)
        guard ganhoCorpoVazio > 0 else { return 0 }
        let energia = energiaRetida(perfil, ganhoDiario: ganhoDiario)
        let liquidaPorKg = max(0, 268.0 - 29.4 * (energia / ganhoCorpoVazio))
        let proteinaLiquida = ganhoCorpoVazio * liquidaPorKg
        return proteinaLiquida / eficienciaProteinaGanho(perfil)
    }

    /// Eficiência de conversão de proteína metabolizável em proteína retida.
    static func eficienciaProteinaGanho(_ perfil: PerfilAnimal) -> Double {
        max(0.492, 0.834 - 0.00114 * pesoEquivalente(perfil))
    }

    // MARK: - Cálculo principal

    /// Calcula as necessidades diárias de PB e NDT para a meta de ganho informada.
    static func calcular(perfil: PerfilAnimal, ganhoMeta: Double) -> ExigenciaDiaria {
        var alertas: [String] = []
        var ganho = max(ganhoMeta, 0)
        var atingivel = true

        var ndtPercentual: Double
        if let densidade = densidadeAlvo(perfil, ganhoDiario: ganho) {
            ndtPercentual = densidade
        } else {
            atingivel = false
            let maximo = ganhoMaximo(perfil)
            alertas.append("Meta de \(Formatadores.numero(ganho, casas: 3)) kg/dia acima do possível neste peso. O cálculo usa \(Formatadores.numero(maximo, casas: 3)) kg/dia.")
            ganho = maximo
            ndtPercentual = Constantes.ndtMaximo
        }

        let consumo = consumoNecessario(perfil, ganhoDiario: ganho, ndtPercentual: ndtPercentual)
        let consumoFinal = consumo.isFinite ? consumo : consumoPotencial(perfil, ndtPercentual: ndtPercentual)
        let ndtKg = consumoFinal * ndtPercentual / 100

        let pmMantenca = proteinaMetabolizavelMantenca(perfil)
        let pmGanho = proteinaMetabolizavelGanho(perfil, ganhoDiario: ganho)
        let pmTotal = pmMantenca + pmGanho

        // Proteína bruta pelo sistema PDR/PNDR: a proteína microbiana produzida a
        // partir do NDT cobre parte da exigência; o restante vem de proteína
        // não degradável no rúmen.
        let proteinaMicrobiana = Constantes.proteinaMicrobianaPorNDT * ndtKg
        let pmMicrobiana = Constantes.eficienciaProteinaMicrobiana * proteinaMicrobiana
        let pndr = max(0, (pmTotal - pmMicrobiana) / Constantes.eficienciaProteinaNaoDegradavel)
        var pbGramas = proteinaMicrobiana + pndr
        if pndr <= 0 {
            alertas.append("A proteína microbiana da própria dieta cobre a exigência de proteína metabolizável.")
        }

        var pbPercentual = consumoFinal > 0 ? pbGramas / (consumoFinal * 1000) * 100 : 0
        var ajustadaAoPiso = false
        let piso = perfil.fase.proteinaMinimaDieta
        if pbPercentual < piso && consumoFinal > 0 {
            pbGramas = piso / 100 * consumoFinal * 1000
            pbPercentual = piso
            ajustadaAoPiso = true
            alertas.append("PB elevada ao piso prático de \(Formatadores.percentual(piso, casas: 0)) da MS para a fase \(perfil.fase.nome.lowercased()).")
        }

        let elm = energiaMantenca(perfil)
        let er = energiaRetida(perfil, ganhoDiario: ganho)
        let em = ndtKg * Constantes.mcalPorKgNDT * Constantes.emSobreEd

        return ExigenciaDiaria(
            pesoVivo: perfil.pesoVivo,
            ganhoDiario: ganho,
            ganhoDiarioMeta: ganhoMeta,
            metaAtingivel: atingivel,
            consumoMateriaSeca: consumoFinal,
            consumoPercentualPeso: perfil.pesoVivo > 0 ? consumoFinal / perfil.pesoVivo * 100 : 0,
            ndtKg: ndtKg,
            ndtPercentualDieta: ndtPercentual,
            proteinaBrutaKg: pbGramas / 1000,
            proteinaBrutaPercentualDieta: pbPercentual,
            proteinaAjustadaAoPiso: ajustadaAoPiso,
            energiaLiquidaMantenca: elm,
            energiaLiquidaGanho: er,
            energiaMetabolizavel: em,
            proteinaMetabolizavelMantenca: pmMantenca,
            proteinaMetabolizavelGanho: pmGanho,
            proteinaMetabolizavelTotal: pmTotal,
            alertas: alertas
        )
    }

    // MARK: - Ganho esperado a partir de uma dieta

    /// Ganho diário sustentado pela energia de uma dieta já definida.
    static func ganhoPorEnergia(perfil: PerfilAnimal, consumoMS: Double, ndtKg: Double) -> Double {
        guard consumoMS > 0 else { return 0 }
        let bruto = ndtKg / consumoMS * 100
        let ndtPercentual = min(max(bruto, Constantes.ndtMinimo), Constantes.ndtMaximo)
        let elmDieta = elMantencaDieta(ndtPercentual: ndtPercentual)
        let elgDieta = elGanhoDieta(ndtPercentual: ndtPercentual)
        guard elmDieta > 0, elgDieta > 0 else { return 0 }
        let sobra = consumoMS - energiaMantenca(perfil) / elmDieta
        guard sobra > 0 else { return 0 }
        return ganhoAPartirDaEnergiaRetida(perfil, energiaRetida: sobra * elgDieta)
    }

    /// Ganho diário sustentado pela proteína de uma dieta já definida.
    static func ganhoPorProteina(perfil: PerfilAnimal, ndtKg: Double, proteinaBrutaKg: Double) -> Double {
        let pbGramas = proteinaBrutaKg * 1000
        let microbiana = Constantes.proteinaMicrobianaPorNDT * ndtKg
        let pdrUsada = min(pbGramas, microbiana)
        let pndr = max(0, pbGramas - microbiana)
        let pmDisponivel = Constantes.eficienciaProteinaMicrobiana * pdrUsada
            + Constantes.eficienciaProteinaNaoDegradavel * pndr
        let sobra = pmDisponivel - proteinaMetabolizavelMantenca(perfil)
        guard sobra > 0 else { return 0 }

        // A exigência de PM cresce com o ganho, então o ganho compatível
        // é obtido por busca binária.
        var baixo = 0.0
        var alto = 3.0
        for _ in 0..<60 {
            let meio = (baixo + alto) / 2
            if proteinaMetabolizavelGanho(perfil, ganhoDiario: meio) < sobra {
                baixo = meio
            } else {
                alto = meio
            }
        }
        return (baixo + alto) / 2
    }

    /// Avalia uma dieta pronta e indica qual nutriente limita o desempenho.
    static func ganhoEsperado(perfil: PerfilAnimal,
                              consumoMS: Double,
                              ndtKg: Double,
                              proteinaBrutaKg: Double) -> GanhoEsperado {
        let energia = ganhoPorEnergia(perfil: perfil, consumoMS: consumoMS, ndtKg: ndtKg)
        let proteina = ganhoPorProteina(perfil: perfil, ndtKg: ndtKg, proteinaBrutaKg: proteinaBrutaKg)
        let limitante: String
        if abs(energia - proteina) < 0.02 {
            limitante = "Energia e proteína equilibradas"
        } else if energia < proteina {
            limitante = "Energia (NDT)"
        } else {
            limitante = "Proteína (PB)"
        }
        return GanhoEsperado(porEnergia: energia, porProteina: proteina, nutrienteLimitante: limitante)
    }
}
