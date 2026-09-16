import XCTest
@testable import NovilhaNutri

/// Previsão de resultado: o que foi pago na compra, o que a dieta custa e o
/// que sobra na venda. Espelha `web/testes/resultadoPrevisto.test.ts`.
final class ResultadoPrevistoTests: XCTestCase {

    private let pasto = Insumo(nome: "Pasto", categoria: .volumoso,
                               materiaSeca: 28, proteinaBruta: 9.0, ndt: 58,
                               embalagem: .pastejo)
    private let milho = Insumo(nome: "Milho", categoria: .energetico,
                               materiaSeca: 88, proteinaBruta: 9.0, ndt: 87,
                               embalagem: .saca60, precoUnitario: 60)
    private let soja = Insumo(nome: "Farelo de soja", categoria: .proteico,
                              materiaSeca: 89, proteinaBruta: 48.0, ndt: 82,
                              embalagem: .saca50, precoUnitario: 150)
    private let mineral = Insumo(nome: "Núcleo", categoria: .mineral,
                                 materiaSeca: 99, proteinaBruta: 0, ndt: 0,
                                 embalagem: .saca25, precoUnitario: 100)

    private var selecao: SelecaoInsumos {
        SelecaoInsumos(volumoso: pasto, energetico: milho, proteico: soja, mineral: mineral)
    }

    /// Rendimento redondo (0,5) para as contas do teste ficarem conferíveis
    /// na mão: 260 kg viram 130 kg de carcaça, ou 8,6667 arrobas.
    private func loteBase() -> Lote {
        var lote = Lote(nome: "Lote teste",
                        quantidadeAnimais: 40,
                        pesoMedioInicial: 260,
                        ganhoMetaDiario: 0.750,
                        fase: .recriaInicial,
                        dataEntrada: Date(timeIntervalSince1970: 0),
                        pesoAlvoAbate: 430,
                        rendimentoCarcaca: 0.5,
                        pesoFinalMaturidade: 430)
        lote.diasPorPeriodo = 30
        return lote
    }

    // MARK: - Custo de compra

    func testCompraPorArrobaUsaACarcacaDeEntrada() {
        var lote = loteBase()
        lote.modoCompra = .porArroba
        lote.precoCompra = 300

        XCTAssertEqual(lote.arrobasCompra, 260 * 0.5 / 15, accuracy: 1e-9)
        XCTAssertEqual(lote.custoCompraPorAnimal, 300 * (260 * 0.5 / 15), accuracy: 0.01)
        XCTAssertEqual(lote.custoCompraLote, lote.custoCompraPorAnimal * 40, accuracy: 0.01)
    }

    func testCompraPorCabecaUsaOValorComoEsta() {
        var lote = loteBase()
        lote.modoCompra = .porCabeca
        lote.precoCompra = 2600

        XCTAssertEqual(lote.custoCompraPorAnimal, 2600, accuracy: 0.001)
        XCTAssertEqual(lote.custoCompraLote, 2600 * 40, accuracy: 0.001)
    }

    func testCompraCobraPeloPesoDeEntradaNaoPeloDeHoje() {
        // O animal foi pago na entrada; engordar depois não muda o que se pagou.
        var lote = loteBase()
        lote.modoCompra = .porArroba
        lote.precoCompra = 300
        lote.pesagens = [Pesagem(data: Date(timeIntervalSince1970: 90 * 86_400), pesoMedio: 340)]

        XCTAssertEqual(lote.custoCompraPorAnimal, 300 * (260 * 0.5 / 15), accuracy: 0.01)
    }

    func testSemPrecoDeCompraACompraNaoEntra() {
        let lote = loteBase()
        XCTAssertEqual(lote.precoCompra, 0)
        XCTAssertEqual(lote.custoCompraPorAnimal, 0)
        XCTAssertEqual(lote.custoCompraLote, 0)
    }

    // MARK: - Resultado

    private func projetar(precoCompra: Double = 0,
                          precoVenda: Double = 0,
                          modo: ModoCompra = .porArroba) -> RelatorioPlanejamento {
        var lote = loteBase()
        lote.modoCompra = modo
        lote.precoCompra = precoCompra
        lote.precoArrobaVenda = precoVenda
        return PlanejadorAbate.projetar(lote: lote, selecao: selecao)
    }

    func testLucroEhAVendaMenosACompraEADieta() {
        let r = projetar(precoCompra: 300, precoVenda: 340)

        XCTAssertTrue(r.temPrecos)
        XCTAssertEqual(r.investimentoTotal, r.compraTotal + r.custoTotal, accuracy: 0.01)
        XCTAssertEqual(r.lucroTotal, r.receitaTotal - r.compraTotal - r.custoTotal, accuracy: 0.01)
        XCTAssertEqual(r.lucroPorAnimal, r.lucroTotal / 40, accuracy: 0.01)
    }

    func testReceitaEhACarcacaDeAbateAoPrecoDeVenda() {
        let r = projetar(precoVenda: 340)
        // 430 kg x 0,5 / 15 = 14,3333 @ por animal.
        XCTAssertEqual(r.receitaTotal, 430 * 0.5 / 15 * 340 * 40, accuracy: 0.1)
    }

    func testNoPrecoDeEquilibrioOLucroEhZero() {
        let equilibrio = projetar(precoCompra: 300, precoVenda: 340).precoArrobaEquilibrio
        let r = projetar(precoCompra: 300, precoVenda: equilibrio)

        XCTAssertEqual(r.lucroTotal, 0, accuracy: 0.01)
        XCTAssertEqual(r.margemSobreReceita, 0, accuracy: 0.01)
        XCTAssertEqual(r.retornoSobreInvestimento, 0, accuracy: 0.01)
    }

    func testAcimaDoEquilibrioDaLucroAbaixoDaPrejuizo() {
        let equilibrio = projetar(precoCompra: 300, precoVenda: 1).precoArrobaEquilibrio

        XCTAssertGreaterThan(projetar(precoCompra: 300, precoVenda: equilibrio + 20).lucroTotal, 0)
        XCTAssertLessThan(projetar(precoCompra: 300, precoVenda: equilibrio - 20).lucroTotal, 0)
    }

    func testResultadoDaEngordaIgnoraACompra() {
        let r = projetar(precoCompra: 300, precoVenda: 340)

        XCTAssertEqual(r.margemDaEngorda,
                       r.arrobasProduzidasLote * 340 - r.custoTotal,
                       accuracy: 0.01)
        XCTAssertEqual(r.precoArrobaEquilibrioEngorda,
                       r.custoTotal / r.arrobasProduzidasLote,
                       accuracy: 0.01)
        // Mudar o preço pago não mexe neste número.
        XCTAssertEqual(projetar(precoCompra: 900, precoVenda: 340).margemDaEngorda,
                       r.margemDaEngorda,
                       accuracy: 0.01)
    }

    func testCompraCaraPodeDarPrejuizoComEngordaLucrativa() {
        let r = projetar(precoCompra: 900, precoVenda: 340)

        XCTAssertGreaterThan(r.margemDaEngorda, 0)
        XCTAssertLessThan(r.lucroTotal, 0)
    }

    func testSemPrecoDeCompraOResultadoContaApenasADieta() {
        let r = projetar(precoVenda: 340)

        XCTAssertEqual(r.compraTotal, 0)
        XCTAssertEqual(r.lucroTotal, r.receitaTotal - r.custoTotal, accuracy: 0.01)
    }

    func testSemPrecoDeVendaNaoHaPrevisaoENadaViraNaN() {
        let r = projetar(precoCompra: 300)

        XCTAssertFalse(r.temPrecos)
        for valor in [r.receitaTotal, r.margemSobreReceita, r.retornoSobreInvestimento,
                      r.lucroPorArrobaProduzida, r.precoArrobaEquilibrio] {
            XCTAssertTrue(valor.isFinite)
        }
        // Sem receita, o prejuízo é exatamente o que foi investido.
        XCTAssertEqual(r.lucroTotal, -r.investimentoTotal, accuracy: 0.01)
    }

    func testEquilibrioCobreOInvestimentoEmTodasAsArrobasVendidas() {
        let r = projetar(precoCompra: 2600, precoVenda: 340, modo: .porCabeca)

        XCTAssertEqual(r.precoArrobaEquilibrio * r.arrobasTotaisLote,
                       r.investimentoTotal,
                       accuracy: 0.01)
    }

    // MARK: - Relatório em texto

    func testRelatorioTrazOBlocoDeResultadoQuandoHaPrecoDeVenda() {
        let texto = RelatorioTexto.gerar(projetar(precoCompra: 300, precoVenda: 340))

        XCTAssertTrue(texto.contains("RESULTADO PREVISTO"))
        XCTAssertTrue(texto.contains("Lucro do lote"))
        XCTAssertTrue(texto.contains("Arroba de equilíbrio"))
    }

    func testRelatorioOmiteOBlocoSemPrecoDeVenda() {
        let texto = RelatorioTexto.gerar(projetar(precoCompra: 300))
        XCTAssertFalse(texto.contains("RESULTADO PREVISTO"))
    }

    func testRelatorioAvisaQuandoSoADietaEntraNaConta() {
        let texto = RelatorioTexto.gerar(projetar(precoVenda: 340))
        XCTAssertTrue(texto.contains("apenas a dieta"))
    }

    // MARK: - Compatibilidade do arquivo

    func testBackupAntigoSemOsCamposDePrecoAbreComZero() throws {
        // Exatamente o que o aplicativo gravava antes desta funcionalidade.
        let antigo = """
        {
          "versao": 1,
          "lotes": [
            {
              "id": "11111111-1111-1111-1111-111111111111",
              "nome": "Lote antigo",
              "quantidadeAnimais": 10,
              "pesoMedioInicial": 250,
              "ganhoMetaDiario": 0.7,
              "fase": "recriaInicial",
              "grupoGenetico": "zebuino",
              "sistema": "semiconfinamento",
              "dataEntrada": "2025-01-01T00:00:00Z",
              "pesoAlvoAbate": 420,
              "rendimentoCarcaca": 0.53,
              "pesoFinalMaturidade": 430,
              "diasPorPeriodo": 30,
              "ajusteConsumo": 1,
              "restricoes": {},
              "pesagens": [],
              "observacoes": ""
            }
          ],
          "insumos": [],
          "ciclos": [],
          "usarCalibracao": true
        }
        """

        let dados = try BancoLocal.importar(Data(antigo.utf8))
        let lote = try XCTUnwrap(dados.lotes.first)

        XCTAssertEqual(lote.modoCompra, .porArroba)
        XCTAssertEqual(lote.precoCompra, 0)
        XCTAssertEqual(lote.precoArrobaVenda, 0)
        XCTAssertEqual(lote.custoCompraPorAnimal, 0)
        XCTAssertTrue(lote.custoCompraPorAnimal.isFinite)
    }

    func testCamposNovosSobrevivemAExportarERestaurar() throws {
        var lote = loteBase()
        lote.modoCompra = .porCabeca
        lote.precoCompra = 2600
        lote.precoArrobaVenda = 345.5

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let bruto = try encoder.encode(DadosApp(versao: 2,
                                                lotes: [lote],
                                                insumos: [],
                                                ciclos: [],
                                                usarCalibracao: true))

        let voltou = try XCTUnwrap(try BancoLocal.importar(bruto).lotes.first)
        XCTAssertEqual(voltou.modoCompra, .porCabeca)
        XCTAssertEqual(voltou.precoCompra, 2600)
        XCTAssertEqual(voltou.precoArrobaVenda, 345.5)
    }
}
