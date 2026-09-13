import XCTest
@testable import NovilhaNutri

final class PlanejadorAbateTests: XCTestCase {

    private let pasto = Insumo(nome: "Pasto", categoria: .volumoso,
                               materiaSeca: 28, proteinaBruta: 9.0, ndt: 58,
                               embalagem: .pastejo)
    private let milho = Insumo(nome: "Milho", categoria: .energetico,
                               materiaSeca: 88, proteinaBruta: 9.0, ndt: 87,
                               embalagem: .saca60, precoUnitario: 60)
    private let soja = Insumo(nome: "Farelo de soja", categoria: .proteico,
                              materiaSeca: 89, proteinaBruta: 48.0, ndt: 82,
                              embalagem: .saca50, precoUnitario: 150)
    private let mineral = Insumo(nome: "Nucleo", categoria: .mineral,
                                 materiaSeca: 99, proteinaBruta: 0, ndt: 0,
                                 embalagem: .saca25, precoUnitario: 100)

    private var selecao: SelecaoInsumos {
        SelecaoInsumos(volumoso: pasto, energetico: milho, proteico: soja, mineral: mineral)
    }

    private func loteBase() -> Lote {
        var lote = Lote(nome: "Lote teste",
                        quantidadeAnimais: 40,
                        pesoMedioInicial: 260,
                        ganhoMetaDiario: 0.750,
                        fase: .recriaInicial,
                        dataEntrada: Date(timeIntervalSince1970: 0),
                        pesoAlvoAbate: 430,
                        rendimentoCarcaca: 0.53,
                        pesoFinalMaturidade: 430)
        lote.diasPorPeriodo = 30
        return lote
    }

    func testDuracaoEDataDeAbate() {
        let relatorio = PlanejadorAbate.projetar(lote: loteBase(), selecao: selecao)

        XCTAssertTrue(relatorio.viavel)
        // (430 - 260) / 0,750 = 226,67 dias
        XCTAssertEqual(relatorio.diasTotais, 226.667, accuracy: 0.01)
        XCTAssertEqual(relatorio.periodos.count, 8)
        XCTAssertEqual(relatorio.dataAbate.timeIntervalSince(relatorio.dataInicio) / 86_400,
                       226.667, accuracy: 0.01)
    }

    func testUltimoPeriodoEhParcialEChegaAoPesoAlvo() {
        let relatorio = PlanejadorAbate.projetar(lote: loteBase(), selecao: selecao)

        guard let ultimo = relatorio.periodos.last else { return XCTFail("Sem periodos") }
        XCTAssertEqual(ultimo.dias, 16.667, accuracy: 0.01)
        XCTAssertEqual(ultimo.pesoFinal, 430, accuracy: 0.01)
        XCTAssertEqual(relatorio.periodos.first?.pesoInicial ?? 0, 260, accuracy: 0.001)
    }

    func testConsumoCresceAoLongoDoCiclo() {
        let relatorio = PlanejadorAbate.projetar(lote: loteBase(), selecao: selecao)
        let consumos = relatorio.periodos.map { $0.exigencia.consumoMateriaSeca }

        XCTAssertEqual(consumos, consumos.sorted())
        XCTAssertGreaterThan(consumos.last ?? 0, consumos.first ?? 0)
    }

    func testTotaisSaoASomaDosPeriodos() {
        let relatorio = PlanejadorAbate.projetar(lote: loteBase(), selecao: selecao)

        for total in relatorio.totais {
            let soma = relatorio.periodos
                .flatMap { $0.consumos }
                .filter { $0.id == total.id }
                .reduce(0.0) { $0 + $1.kgMateriaNatural }
            XCTAssertEqual(total.kgMateriaNatural, soma, accuracy: 0.001)
        }
        XCTAssertEqual(relatorio.custoTotal,
                       relatorio.periodos.reduce(0) { $0 + $1.custo },
                       accuracy: 0.01)
    }

    func testConsumoDeMineralBateComOPlanejado() {
        let lote = loteBase()
        let relatorio = PlanejadorAbate.projetar(lote: lote, selecao: selecao)

        guard let mineralTotal = relatorio.totais.first(where: { $0.insumo.categoria == .mineral }) else {
            return XCTFail("Mineral ausente")
        }
        // 100 g por animal por dia durante todo o ciclo.
        let esperado = 0.100 * relatorio.diasTotais * Double(lote.quantidadeAnimais)
        XCTAssertEqual(mineralTotal.kgMateriaNatural, esperado, accuracy: 0.5)
    }

    func testProducaoEmArrobas() {
        let relatorio = PlanejadorAbate.projetar(lote: loteBase(), selecao: selecao)

        // 430 kg x 53% / 15 = 15,19 arrobas por animal
        XCTAssertEqual(relatorio.arrobasFinais, 15.193, accuracy: 0.01)
        XCTAssertEqual(relatorio.arrobasIniciais, 9.187, accuracy: 0.01)
        XCTAssertEqual(relatorio.arrobasProduzidasPorAnimal, 6.007, accuracy: 0.01)
        XCTAssertEqual(relatorio.arrobasProduzidasLote, 6.007 * 40, accuracy: 0.5)
        XCTAssertEqual(relatorio.ganhoTotalLote, 170 * 40, accuracy: 0.001)
    }

    func testConversaoAlimentarEhCoerente() {
        let relatorio = PlanejadorAbate.projetar(lote: loteBase(), selecao: selecao)

        XCTAssertEqual(relatorio.conversaoAlimentar,
                       relatorio.materiaSecaTotal / relatorio.ganhoTotalLote,
                       accuracy: 0.0001)
        // Entre 8 e 14 kg de MS por kg de ganho e a faixa esperada em recria.
        XCTAssertTrue((8.0...14.0).contains(relatorio.conversaoAlimentar))
    }

    func testCustoPorArrobaUsaSomenteInsumosComPreco() {
        let relatorio = PlanejadorAbate.projetar(lote: loteBase(), selecao: selecao)

        XCTAssertGreaterThan(relatorio.custoTotal, 0)
        XCTAssertEqual(relatorio.custoPorArroba,
                       relatorio.custoTotal / relatorio.arrobasProduzidasLote,
                       accuracy: 0.001)
        let pastoTotal = relatorio.totais.first { $0.insumo.categoria == .volumoso }
        XCTAssertEqual(pastoTotal?.custo ?? -1, 0, accuracy: 0.0001)
    }

    func testSacasDoCicloSaoCalculadas() {
        let relatorio = PlanejadorAbate.projetar(lote: loteBase(), selecao: selecao)

        guard let milhoTotal = relatorio.totais.first(where: { $0.insumo.nome == "Milho" }),
              let conversao = milhoTotal.conversao else {
            return XCTFail("Milho sem conversao")
        }
        XCTAssertEqual(conversao.kgPorUnidade, 60, accuracy: 0.0001)
        XCTAssertEqual(Double(conversao.unidadesInteiras),
                       (milhoTotal.kgMateriaNatural / 60).rounded(.down), accuracy: 0.0001)
        XCTAssertGreaterThanOrEqual(conversao.unidadesParaCompra, conversao.unidadesInteiras)
    }

    func testPeriodoMaiorGeraMenosPeriodos() {
        var lote = loteBase()
        lote.diasPorPeriodo = 60
        let relatorio = PlanejadorAbate.projetar(lote: lote, selecao: selecao)

        XCTAssertEqual(relatorio.periodos.count, 4)
        XCTAssertEqual(relatorio.diasTotais, 226.667, accuracy: 0.01)
    }

    func testLoteJaNoPesoDeAbateNaoProjeta() {
        var lote = loteBase()
        lote.pesoMedioInicial = 440
        let relatorio = PlanejadorAbate.projetar(lote: lote, selecao: selecao)

        XCTAssertFalse(relatorio.viavel)
        XCTAssertFalse(relatorio.alertas.isEmpty)
    }

    func testMetaDeGanhoZeradaNaoProjeta() {
        var lote = loteBase()
        lote.ganhoMetaDiario = 0
        let relatorio = PlanejadorAbate.projetar(lote: lote, selecao: selecao)

        XCTAssertFalse(relatorio.viavel)
    }

    func testPesagemMaisRecenteVirouOPontoDePartida() {
        var lote = loteBase()
        let data = Date(timeIntervalSince1970: 60 * 86_400)
        lote.pesagens = [Pesagem(data: data, pesoMedio: 305)]
        let relatorio = PlanejadorAbate.projetar(lote: lote, selecao: selecao)

        XCTAssertEqual(relatorio.pesoInicial, 305, accuracy: 0.001)
        XCTAssertEqual(relatorio.dataInicio, data)
        XCTAssertEqual(relatorio.diasTotais, (430 - 305) / 0.750, accuracy: 0.01)
    }

    func testGanhoRealObservado() {
        var lote = loteBase()
        lote.pesagens = [Pesagem(data: Date(timeIntervalSince1970: 100 * 86_400), pesoMedio: 330)]

        // 70 kg em 100 dias = 0,700 kg/dia
        XCTAssertEqual(lote.ganhoRealDiario ?? 0, 0.700, accuracy: 0.0001)
    }

    func testRelatorioEmTextoTrazOsBlocosPrincipais() {
        let relatorio = PlanejadorAbate.projetar(lote: loteBase(), selecao: selecao)
        let texto = RelatorioTexto.gerar(relatorio)

        XCTAssertTrue(texto.contains("PLANEJAMENTO NUTRICIONAL E DE ABATE"))
        XCTAssertTrue(texto.contains("INSUMOS DO CICLO COMPLETO"))
        XCTAssertTrue(texto.contains("PERIODOS"))
        XCTAssertTrue(texto.contains("Milho"))
        XCTAssertTrue(texto.contains("sacas"))
    }
}
