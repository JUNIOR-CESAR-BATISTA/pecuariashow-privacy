import XCTest
@testable import NovilhaNutri

final class AnalisadorHistoricoTests: XCTestCase {

    private let inicio = Date(timeIntervalSince1970: 0)

    /// Ciclo de referência: 260 a 430 kg com meta de 0,750 kg/dia.
    /// A dieta planejada tem 67% de NDT e consumo previsto de 7,9 kg de MS.
    private func ciclo(ganhoReal: Double,
                       dias: Double = 226,
                       animais: Int = 40,
                       proteico: String = "Farelo de soja",
                       carcaca: Double = 0,
                       concentradoReal: Double = 0,
                       custoReal: Double = 0) -> CicloEncerrado {
        let pesoFinal = 260 + ganhoReal * dias
        return CicloEncerrado(
            loteID: UUID(),
            nome: "Lote teste",
            grupoGenetico: .zebuino,
            sistema: .semiconfinamento,
            dataInicio: inicio,
            pesoInicial: 260,
            ganhoMeta: 0.750,
            pesoAlvo: 430,
            animaisIniciais: animais,
            pesoAcabamentoPlanejado: 430,
            consumoPrevistoDiario: 7.9,
            ndtDietaMedia: 67,
            pbDietaMedia: 11,
            concentradoPrevisto: 40_000,
            custoPrevisto: 50_000,
            volumosoNome: "Pasto",
            energeticoNome: "Milho",
            proteicoNome: proteico,
            dataAbate: inicio.addingTimeInterval(dias * 86_400),
            pesoFinalReal: pesoFinal,
            animaisAbatidos: animais,
            pesoCarcacaReal: carcaca,
            concentradoReal: concentradoReal,
            custoReal: custoReal
        )
    }

    // MARK: - Contas do ciclo

    func testGanhoRealEAderencia() {
        let c = ciclo(ganhoReal: 0.750)

        XCTAssertEqual(c.diasReais, 226, accuracy: 0.01)
        XCTAssertEqual(c.ganhoRealDiario, 0.750, accuracy: 0.001)
        XCTAssertEqual(c.aderenciaGanho, 1.0, accuracy: 0.001)
        XCTAssertEqual(c.ganhoTotalLote, 0.750 * 226 * 40, accuracy: 0.1)
    }

    func testRendimentoEArrobasProduzidas() {
        let c = ciclo(ganhoReal: 0.750, carcaca: 228)

        XCTAssertEqual(c.rendimentoReal ?? 0, 228 / c.pesoFinalReal, accuracy: 0.0001)
        XCTAssertEqual(c.arrobasPorAnimal, 228 / 15, accuracy: 0.001)
        // Arrobas produzidas descontam a carcaça que entrou no lote.
        let carcacaInicial = 260 * (228 / c.pesoFinalReal)
        XCTAssertEqual(c.arrobasProduzidasLote,
                       (228 - carcacaInicial) / 15 * 40, accuracy: 0.01)
    }

    func testCustoPorArrobaEMargem() {
        var c = ciclo(ganhoReal: 0.750, carcaca: 228, custoReal: 60_000)
        c.precoArroba = 300

        XCTAssertEqual(c.custoPorArroba ?? 0, 60_000 / c.arrobasProduzidasLote, accuracy: 0.01)
        XCTAssertEqual(c.receita ?? 0, 300 * c.arrobasLote, accuracy: 0.01)
        XCTAssertEqual(c.margem ?? 0, (c.receita ?? 0) - 60_000, accuracy: 0.01)
        XCTAssertEqual(c.desvioCusto ?? 0, 60_000 / 50_000 - 1, accuracy: 0.0001)
    }

    func testPerdaDeAnimais() {
        var c = ciclo(ganhoReal: 0.750)
        c.animaisAbatidos = 38

        XCTAssertEqual(c.animaisPerdidos, 2)
        XCTAssertEqual(c.taxaPerda, 2.0 / 40.0, accuracy: 0.0001)
    }

    // MARK: - Fator de consumo

    func testFatorDeConsumoFicaEmUmQuandoOGanhoBateComOPrevisto() {
        // O ganho que o modelo prevê para o consumo planejado.
        let perfil = PerfilAnimal(pesoVivo: 345, fase: .recriaFinal,
                                  grupoGenetico: .zebuino, sistema: .semiconfinamento,
                                  pesoFinal: 430)
        let ganhoDoModelo = MotorExigencias.ganhoPorEnergia(perfil: perfil,
                                                            consumoMS: 7.9,
                                                            ndtKg: 7.9 * 0.67)
        // Constrói um ciclo cujo peso médio é 345 kg e que entregou esse ganho.
        let dias = (430.0 - 260.0) / ganhoDoModelo
        let c = ciclo(ganhoReal: ganhoDoModelo, dias: dias)
        XCTAssertEqual(c.pesoMedioCiclo, 345, accuracy: 1.0)

        let fator = AnalisadorHistorico.fatorConsumo(do: c)
        XCTAssertEqual(fator ?? 0, 1.0, accuracy: 0.03)
    }

    func testGanhoAbaixoDoPrevistoDerrubaOFator() {
        let bom = ciclo(ganhoReal: 0.750)
        let fraco = ciclo(ganhoReal: 0.600)

        guard let fatorBom = AnalisadorHistorico.fatorConsumo(do: bom),
              let fatorFraco = AnalisadorHistorico.fatorConsumo(do: fraco) else {
            return XCTFail("Fator deveria existir")
        }
        XCTAssertLessThan(fatorFraco, fatorBom)
        XCTAssertLessThan(fatorFraco, 1.0)
        // O ganho cai mais rápido que o consumo: 20% menos ganho não significa
        // 20% menos consumo.
        XCTAssertGreaterThan(fatorFraco, 0.75)
    }

    func testGanhoAcimaDoPrevistoElevaOFator() {
        guard let fator = AnalisadorHistorico.fatorConsumo(do: ciclo(ganhoReal: 0.950)) else {
            return XCTFail("Fator deveria existir")
        }
        XCTAssertGreaterThan(fator, 1.0)
    }

    func testCicloSemDadosDeDietaNaoGeraFator() {
        var c = ciclo(ganhoReal: 0.750)
        c.consumoPrevistoDiario = 0
        XCTAssertNil(AnalisadorHistorico.fatorConsumo(do: c))
    }

    // MARK: - Calibração

    func testCalibracaoSemCiclosEhNeutra() {
        let fatores = AnalisadorHistorico.calibrar([])
        XCTAssertEqual(fatores.ajusteConsumo, 1.0, accuracy: 0.0001)
        XCTAssertFalse(fatores.disponivel)
    }

    func testCalibracaoMediaOsCiclos() {
        let fatores = AnalisadorHistorico.calibrar([ciclo(ganhoReal: 0.700, carcaca: 220),
                                                    ciclo(ganhoReal: 0.600, carcaca: 210)])

        XCTAssertEqual(fatores.ciclos, 2)
        XCTAssertTrue(fatores.disponivel)
        XCTAssertLessThan(fatores.ajusteConsumo, 1.0)
        XCTAssertEqual(fatores.aderenciaGanhoMedia, (0.700 + 0.600) / 2 / 0.750, accuracy: 0.02)
        XCTAssertEqual(fatores.confianca, .moderada)
    }

    func testCalibracaoFicaDentroDeLimitesRazoaveis() {
        let absurdo = ciclo(ganhoReal: 0.050)
        let fatores = AnalisadorHistorico.calibrar([absurdo])

        XCTAssertGreaterThanOrEqual(fatores.ajusteConsumo, 0.70)
        XCTAssertLessThanOrEqual(fatores.ajusteConsumo, 1.30)
        XCTAssertGreaterThanOrEqual(fatores.rendimentoCarcaca, 0.40)
        XCTAssertLessThanOrEqual(fatores.rendimentoCarcaca, 0.62)
    }

    func testConfiancaCresceComOsCiclos() {
        XCTAssertEqual(Confianca.para(ciclos: 1), .indicativa)
        XCTAssertEqual(Confianca.para(ciclos: 3), .moderada)
        XCTAssertEqual(Confianca.para(ciclos: 6), .consistente)
    }

    func testRendimentoVemDosCiclosQuandoInformado() {
        let fatores = AnalisadorHistorico.calibrar([ciclo(ganhoReal: 0.750, carcaca: 240)])
        let esperado = 240 / (260 + 0.750 * 226)

        XCTAssertEqual(fatores.rendimentoCarcaca, esperado, accuracy: 0.005)
    }

    // MARK: - Comparação entre alimentos

    func testRankingDeProteicosOrdenaPeloDesempenho() {
        let ciclos = [ciclo(ganhoReal: 0.780, proteico: "Farelo de soja"),
                      ciclo(ganhoReal: 0.620, proteico: "Farelo de algodão")]
        let ranking = AnalisadorHistorico.desempenho(ciclos, categoria: .proteico)

        XCTAssertEqual(ranking.count, 2)
        XCTAssertEqual(ranking.first?.nome, "Farelo de soja")
        XCTAssertEqual(ranking.last?.nome, "Farelo de algodão")
        XCTAssertGreaterThan(ranking[0].aderenciaGanho, ranking[1].aderenciaGanho)
    }

    func testRankingAgrupaCiclosDoMesmoAlimento() {
        let ciclos = [ciclo(ganhoReal: 0.800, proteico: "Farelo de soja"),
                      ciclo(ganhoReal: 0.700, proteico: "Farelo de soja")]
        let ranking = AnalisadorHistorico.desempenho(ciclos, categoria: .proteico)

        XCTAssertEqual(ranking.count, 1)
        XCTAssertEqual(ranking[0].ciclos, 2)
        XCTAssertEqual(ranking[0].ganhoDiario, 0.750, accuracy: 0.001)
    }

    // MARK: - Recomendações

    private func titulos(_ analise: AnaliseHistorica) -> [String] {
        analise.recomendacoes.map { $0.titulo }
    }

    func testGanhoBaixoComConcentradoEntregueApontaFormulacao() {
        // Ganho 20% abaixo da meta, mas o concentrado planejado foi fornecido.
        let c = ciclo(ganhoReal: 0.600, carcaca: 220, concentradoReal: 40_000)
        let analise = AnalisadorHistorico.analisar([c])

        XCTAssertTrue(titulos(analise).contains("Dieta entregou menos do que prometia"))
        XCTAssertEqual(analise.recomendacoes.first?.severidade, .critico)
    }

    func testGanhoBaixoComConcentradoFaltandoApontaFornecimento() {
        // Mesmo ganho baixo, mas só 70% do concentrado foi fornecido.
        let c = ciclo(ganhoReal: 0.600, carcaca: 220, concentradoReal: 28_000)
        let analise = AnalisadorHistorico.analisar([c])

        XCTAssertTrue(titulos(analise).contains("Faltou concentrado no cocho"))
    }

    func testGanhoDentroDaMetaNaoAlarma() {
        let analise = AnalisadorHistorico.analisar([ciclo(ganhoReal: 0.750, carcaca: 228)])

        XCTAssertTrue(titulos(analise).contains("Ganho dentro do planejado"))
        XCTAssertFalse(analise.recomendacoes.contains(where: { $0.severidade == .critico }))
    }

    func testGanhoAcimaDaMetaSugereEconomia() {
        let analise = AnalisadorHistorico.analisar([ciclo(ganhoReal: 0.900, carcaca: 240)])
        XCTAssertTrue(titulos(analise).contains("Sobrou dieta"))
    }

    func testComparaProteicosQuandoHaMaisDeUm() {
        let ciclos = [ciclo(ganhoReal: 0.780, carcaca: 232, proteico: "Farelo de soja"),
                      ciclo(ganhoReal: 0.620, carcaca: 214, proteico: "Ureia pecuária")]
        let analise = AnalisadorHistorico.analisar(ciclos)

        XCTAssertTrue(titulos(analise).contains(where: { $0.contains("Farelo de soja rendeu mais") }))
    }

    func testProteicoUnicoComGanhoBaixoPedeReforco() {
        let analise = AnalisadorHistorico.analisar([ciclo(ganhoReal: 0.650, carcaca: 220)])
        XCTAssertTrue(titulos(analise).contains("Reforce a fonte proteica"))
    }

    func testSemCarcacaPedeORegistro() {
        let analise = AnalisadorHistorico.analisar([ciclo(ganhoReal: 0.750)])
        XCTAssertTrue(titulos(analise).contains("Registre o peso de carcaça"))
    }

    func testPerdaDeAnimaisEntraNoDiagnostico() {
        var c = ciclo(ganhoReal: 0.750, carcaca: 228)
        c.animaisAbatidos = 36
        let analise = AnalisadorHistorico.analisar([c])

        XCTAssertTrue(titulos(analise).contains(where: { $0.contains("Perda de 4") }))
    }

    func testCustoAcimaDoPrevistoAlerta() {
        let c = ciclo(ganhoReal: 0.750, carcaca: 228, custoReal: 70_000)
        let analise = AnalisadorHistorico.analisar([c])

        XCTAssertTrue(titulos(analise).contains("Custo estourou o orçamento"))
    }

    // MARK: - Análise completa

    func testAnaliseVaziaNaoQuebra() {
        let analise = AnalisadorHistorico.analisar([])

        XCTAssertFalse(analise.temHistorico)
        XCTAssertTrue(analise.recomendacoes.isEmpty)
        XCTAssertEqual(analise.totalCiclos, 0)
        XCTAssertNil(analise.custoMedioPorArroba)
    }

    func testTotaisDaAnalise() {
        let ciclos = [ciclo(ganhoReal: 0.750, carcaca: 228, custoReal: 50_000),
                      ciclo(ganhoReal: 0.700, animais: 30, carcaca: 220, custoReal: 30_000)]
        let analise = AnalisadorHistorico.analisar(ciclos)

        XCTAssertEqual(analise.totalCiclos, 2)
        XCTAssertEqual(analise.totalAnimais, 70)
        XCTAssertEqual(analise.custoTotal, 80_000, accuracy: 0.01)
        XCTAssertGreaterThan(analise.totalArrobas, 0)
        XCTAssertNotNil(analise.custoMedioPorArroba)
    }

    func testCiclosSaoOrdenadosDoMaisRecenteParaOMaisAntigo() {
        var antigo = ciclo(ganhoReal: 0.750)
        antigo.dataAbate = inicio.addingTimeInterval(100 * 86_400)
        var recente = ciclo(ganhoReal: 0.700)
        recente.dataAbate = inicio.addingTimeInterval(400 * 86_400)

        let analise = AnalisadorHistorico.analisar([antigo, recente])
        XCTAssertEqual(analise.ciclos.first?.dataAbate, recente.dataAbate)
    }
}
