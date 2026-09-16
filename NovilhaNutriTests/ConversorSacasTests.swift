import XCTest
@testable import NovilhaNutri

final class ConversorSacasTests: XCTestCase {

    func testSacaDe50KgComSobra() {
        guard let conversao = ConversorSacas.converter(kg: 3775, kgPorUnidade: 50) else {
            return XCTFail("Conversão deveria existir")
        }
        XCTAssertEqual(conversao.unidadesExatas, 75.5, accuracy: 0.0001)
        XCTAssertEqual(conversao.unidadesInteiras, 75)
        XCTAssertEqual(conversao.sobraKg, 25, accuracy: 0.0001)
        XCTAssertEqual(conversao.unidadesParaCompra, 76)
        XCTAssertEqual(conversao.toneladas, 3.775, accuracy: 0.0001)
    }

    func testQuantidadeExataNaoArredondaParaCima() {
        guard let conversao = ConversorSacas.converter(kg: 3000, kgPorUnidade: 60) else {
            return XCTFail("Conversão deveria existir")
        }
        XCTAssertEqual(conversao.unidadesInteiras, 50)
        XCTAssertEqual(conversao.sobraKg, 0, accuracy: 0.0001)
        XCTAssertEqual(conversao.unidadesParaCompra, 50)
    }

    func testQuantidadeMenorQueUmaSaca() {
        guard let conversao = ConversorSacas.converter(kg: 12, kgPorUnidade: 40) else {
            return XCTFail("Conversão deveria existir")
        }
        XCTAssertEqual(conversao.unidadesInteiras, 0)
        XCTAssertEqual(conversao.unidadesParaCompra, 1)
        XCTAssertEqual(conversao.sobraKg, 12, accuracy: 0.0001)
    }

    func testGranelUsaTonelada() {
        guard let conversao = ConversorSacas.converter(kg: 2500, embalagem: .granel) else {
            return XCTFail("Conversão deveria existir")
        }
        XCTAssertEqual(conversao.kgPorUnidade, 1000, accuracy: 0.0001)
        XCTAssertEqual(conversao.unidadesInteiras, 2)
        XCTAssertEqual(conversao.sobraKg, 500, accuracy: 0.0001)
        XCTAssertEqual(conversao.nomeUnidadePlural, "toneladas")
    }

    func testPastejoNaoConverte() {
        XCTAssertNil(ConversorSacas.converter(kg: 5000, embalagem: .pastejo))
    }

    func testEmbalagemInvalidaNaoConverte() {
        XCTAssertNil(ConversorSacas.converter(kg: 100, kgPorUnidade: 0))
        XCTAssertNil(ConversorSacas.converter(kg: -5, kgPorUnidade: 50))
    }

    func testEquivalenciasCobremOsTamanhosDeMercado() {
        let lista = ConversorSacas.equivalencias(kg: 1200)
        XCTAssertEqual(lista.count, Embalagem.tamanhosPadrao.count)
        XCTAssertEqual(lista.map { $0.kgPorUnidade }, [60, 50, 40, 30, 25, 20])
        XCTAssertEqual(lista[0].unidadesInteiras, 20)
        XCTAssertEqual(lista[1].unidadesInteiras, 24)
    }

    func testDescricaoTrazSacasESobra() {
        guard let conversao = ConversorSacas.converter(kg: 128, kgPorUnidade: 25) else {
            return XCTFail("Conversão deveria existir")
        }
        XCTAssertTrue(conversao.descricao.contains("5"))
        XCTAssertEqual(conversao.descricaoCompra, "6 sacas")
    }

    func testConversaoDeMateriaSecaParaNatural() {
        let silagem = Insumo(nome: "Silagem", categoria: .volumoso,
                             materiaSeca: 32, proteinaBruta: 7.5, ndt: 65)
        XCTAssertEqual(silagem.materiaNatural(deMateriaSeca: 3.2), 10.0, accuracy: 0.0001)
        XCTAssertEqual(silagem.materiaSeca(deMateriaNatural: 10), 3.2, accuracy: 0.0001)
    }

    func testPrecoPorQuiloConsideraTamanhoDaEmbalagem() {
        let milho = Insumo(nome: "Milho", categoria: .energetico,
                           materiaSeca: 88, proteinaBruta: 9, ndt: 87,
                           embalagem: .saca60, precoUnitario: 72)
        XCTAssertEqual(milho.precoPorKg, 1.2, accuracy: 0.0001)
        XCTAssertEqual(milho.precoPorKgMateriaSeca, 1.2 / 0.88, accuracy: 0.0001)
    }
}
