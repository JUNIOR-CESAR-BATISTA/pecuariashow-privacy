import XCTest
@testable import NovilhaNutri

/// Os valores esperados foram conferidos contra uma implementacao
/// independente das mesmas equacoes.
final class MotorExigenciasTests: XCTestCase {

    private func perfil(peso: Double,
                        fase: FaseAnimal = .recriaFinal,
                        genetica: GrupoGenetico = .zebuino,
                        sistema: SistemaCriacao = .semiconfinamento,
                        pesoFinal: Double = 450) -> PerfilAnimal {
        PerfilAnimal(pesoVivo: peso, fase: fase, grupoGenetico: genetica,
                     sistema: sistema, pesoFinal: pesoFinal)
    }

    func testExigenciaDeNovilhaDe300Kg() {
        let resultado = MotorExigencias.calcular(perfil: perfil(peso: 300), ganhoMeta: 0.700)

        XCTAssertEqual(resultado.consumoMateriaSeca, 6.886, accuracy: 0.01)
        XCTAssertEqual(resultado.ndtPercentualDieta, 67.87, accuracy: 0.05)
        XCTAssertEqual(resultado.ndtKg, 4.674, accuracy: 0.01)
        XCTAssertEqual(resultado.proteinaBrutaGramas, 757.4, accuracy: 1.0)
        XCTAssertTrue(resultado.metaAtingivel)
        XCTAssertEqual(resultado.ganhoDiario, 0.700, accuracy: 0.0001)
        // Consumo entre 2% e 3% do peso vivo e o esperado nesta categoria.
        XCTAssertTrue((2.0...3.0).contains(resultado.consumoPercentualPeso))
    }

    func testExigenciaDeNovilhaDe200KgUsaPisoDaFase() {
        let resultado = MotorExigencias.calcular(
            perfil: perfil(peso: 200, fase: .recriaInicial, pesoFinal: 430),
            ganhoMeta: 0.500)

        XCTAssertEqual(resultado.consumoMateriaSeca, 5.030, accuracy: 0.01)
        XCTAssertEqual(resultado.ndtKg, 3.134, accuracy: 0.01)
        XCTAssertEqual(resultado.proteinaBrutaPercentualDieta, 12.0, accuracy: 0.001)
        XCTAssertTrue(resultado.proteinaAjustadaAoPiso)
    }

    func testConfinamentoDeCruzadaComGanhoAlto() {
        let resultado = MotorExigencias.calcular(
            perfil: perfil(peso: 400, genetica: .cruzado, sistema: .confinamento, pesoFinal: 480),
            ganhoMeta: 1.000)

        XCTAssertEqual(resultado.consumoMateriaSeca, 8.369, accuracy: 0.02)
        XCTAssertEqual(resultado.ndtPercentualDieta, 76.59, accuracy: 0.05)
        XCTAssertEqual(resultado.proteinaBrutaGramas, 920.5, accuracy: 2.0)
    }

    func testMantencaNaoTemEnergiaDeGanho() {
        let resultado = MotorExigencias.calcular(perfil: perfil(peso: 300), ganhoMeta: 0)

        XCTAssertEqual(resultado.energiaLiquidaGanho, 0, accuracy: 0.0001)
        XCTAssertEqual(resultado.proteinaMetabolizavelGanho, 0, accuracy: 0.0001)
        XCTAssertEqual(resultado.consumoMateriaSeca, 5.619, accuracy: 0.01)
        XCTAssertLessThan(resultado.ndtPercentualDieta, 55)
    }

    func testMetaInviavelCaiParaOGanhoMaximo() {
        let animal = perfil(peso: 300)
        let resultado = MotorExigencias.calcular(perfil: animal, ganhoMeta: 2.000)

        XCTAssertFalse(resultado.metaAtingivel)
        XCTAssertEqual(resultado.ganhoDiarioMeta, 2.000, accuracy: 0.0001)
        XCTAssertEqual(resultado.ganhoDiario, MotorExigencias.ganhoMaximo(animal), accuracy: 0.001)
        XCTAssertEqual(resultado.ganhoDiario, 1.093, accuracy: 0.01)
        XCTAssertFalse(resultado.alertas.isEmpty)
    }

    func testExigenciaCresceComOPeso() {
        let leve = MotorExigencias.calcular(perfil: perfil(peso: 250), ganhoMeta: 0.700)
        let pesada = MotorExigencias.calcular(perfil: perfil(peso: 400), ganhoMeta: 0.700)

        XCTAssertGreaterThan(pesada.consumoMateriaSeca, leve.consumoMateriaSeca)
        XCTAssertGreaterThan(pesada.ndtKg, leve.ndtKg)
        XCTAssertGreaterThan(pesada.proteinaBrutaKg, leve.proteinaBrutaKg)
    }

    func testGanhoMaiorExigeDietaMaisConcentrada() {
        let lento = MotorExigencias.calcular(perfil: perfil(peso: 300), ganhoMeta: 0.400)
        let rapido = MotorExigencias.calcular(perfil: perfil(peso: 300), ganhoMeta: 0.900)

        XCTAssertGreaterThan(rapido.ndtPercentualDieta, lento.ndtPercentualDieta)
        XCTAssertGreaterThan(rapido.ndtKg, lento.ndtKg)
    }

    func testAnimalMaisPrecoceExigeMaisEnergia() {
        let precoce = MotorExigencias.calcular(perfil: perfil(peso: 300, pesoFinal: 380), ganhoMeta: 0.700)
        let tardia = MotorExigencias.calcular(perfil: perfil(peso: 300, pesoFinal: 520), ganhoMeta: 0.700)

        XCTAssertGreaterThan(precoce.ndtPercentualDieta, tardia.ndtPercentualDieta)
        XCTAssertGreaterThan(precoce.energiaLiquidaGanho, tardia.energiaLiquidaGanho)
    }

    func testSemiconfinamentoGastaMaisQueConfinamento() {
        let curral = MotorExigencias.energiaMantenca(perfil(peso: 300, sistema: .confinamento))
        let semi = MotorExigencias.energiaMantenca(perfil(peso: 300, sistema: .semiconfinamento))
        let pasto = MotorExigencias.energiaMantenca(perfil(peso: 300, sistema: .pasto))

        XCTAssertLessThan(curral, semi)
        XCTAssertLessThan(semi, pasto)
        XCTAssertEqual(semi / curral, 1.10, accuracy: 0.0001)
    }

    func testAjusteDeConsumoAlteraOPrevisto() {
        var animal = perfil(peso: 300)
        let padrao = MotorExigencias.consumoPotencial(animal, ndtPercentual: 65)
        animal.ajusteConsumo = 1.1
        let ajustado = MotorExigencias.consumoPotencial(animal, ndtPercentual: 65)

        XCTAssertEqual(ajustado / padrao, 1.1, accuracy: 0.0001)
    }

    func testGanhoEsperadoDevolveAMetaQuandoADietaEstaExata() {
        let animal = perfil(peso: 300)
        let exigencia = MotorExigencias.calcular(perfil: animal, ganhoMeta: 0.700)
        let ganho = MotorExigencias.ganhoPorEnergia(perfil: animal,
                                                    consumoMS: exigencia.consumoMateriaSeca,
                                                    ndtKg: exigencia.ndtKg)

        XCTAssertEqual(ganho, 0.700, accuracy: 0.005)
    }

    func testDietaPobreLimitaOGanho() {
        let animal = perfil(peso: 300)
        // Somente pasto de baixa qualidade: 6 kg de MS com 55% de NDT.
        let ganho = MotorExigencias.ganhoPorEnergia(perfil: animal, consumoMS: 6.0, ndtKg: 3.3)

        XCTAssertLessThan(ganho, 0.4)
        XCTAssertGreaterThan(ganho, 0)
    }

    func testDietaAbaixoDaMantencaNaoGeraGanho() {
        let animal = perfil(peso: 300)
        let ganho = MotorExigencias.ganhoPorEnergia(perfil: animal, consumoMS: 2.0, ndtKg: 1.0)

        XCTAssertEqual(ganho, 0, accuracy: 0.0001)
    }

    func testNutrienteLimitanteApontaProteina() {
        let animal = perfil(peso: 300)
        // Energia sobrando e proteina muito baixa.
        let resultado = MotorExigencias.ganhoEsperado(perfil: animal,
                                                      consumoMS: 7.0,
                                                      ndtKg: 5.0,
                                                      proteinaBrutaKg: 0.45)

        XCTAssertEqual(resultado.nutrienteLimitante, "Proteina (PB)")
        XCTAssertEqual(resultado.ganho, resultado.porProteina, accuracy: 0.0001)
    }

    func testFaseSugeridaPorPeso() {
        XCTAssertEqual(FaseAnimal.sugerida(paraPeso: 180), .desmama)
        XCTAssertEqual(FaseAnimal.sugerida(paraPeso: 240), .recriaInicial)
        XCTAssertEqual(FaseAnimal.sugerida(paraPeso: 320), .recriaFinal)
        XCTAssertEqual(FaseAnimal.sugerida(paraPeso: 420), .terminacao)
    }
}
