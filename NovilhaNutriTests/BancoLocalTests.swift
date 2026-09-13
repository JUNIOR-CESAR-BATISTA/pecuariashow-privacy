import XCTest
@testable import NovilhaNutri

final class BancoLocalTests: XCTestCase {

    private var pasta: URL!
    private var banco: BancoLocal!

    override func setUpWithError() throws {
        try super.setUpWithError()
        pasta = FileManager.default.temporaryDirectory
            .appendingPathComponent("NovilhaNutriTeste-\(UUID().uuidString)", isDirectory: true)
        banco = BancoLocal(pastaBase: pasta)
    }

    override func tearDownWithError() throws {
        if let pasta, FileManager.default.fileExists(atPath: pasta.path) {
            try FileManager.default.removeItem(at: pasta)
        }
        try super.tearDownWithError()
    }

    func testSemArquivoRetornaNil() throws {
        XCTAssertNil(try banco.carregar())
    }

    func testSalvaERecuperaOsDados() throws {
        var lote = Lote.exemplo()
        lote.pesagens = [Pesagem(data: Date(timeIntervalSince1970: 86_400), pesoMedio: 275)]
        lote.observacoes = "Lote de teste com acentuacao: nutricao, proteina"
        let dados = DadosApp(versao: DadosApp.versaoAtual,
                             lotes: [lote],
                             insumos: CatalogoInsumos.padrao)

        try banco.salvar(dados)
        let lido = try XCTUnwrap(try banco.carregar())

        XCTAssertEqual(lido.versao, DadosApp.versaoAtual)
        XCTAssertEqual(lido.lotes.count, 1)
        XCTAssertEqual(lido.lotes.first?.id, lote.id)
        XCTAssertEqual(lido.lotes.first?.nome, lote.nome)
        XCTAssertEqual(lido.lotes.first?.observacoes, lote.observacoes)
        XCTAssertEqual(lido.lotes.first?.pesagens.first?.pesoMedio, 275)
        XCTAssertEqual(lido.insumos.count, CatalogoInsumos.padrao.count)
    }

    func testSalvarSobrescreveOArquivo() throws {
        try banco.salvar(DadosApp(versao: 1, lotes: [], insumos: []))
        var lote = Lote.exemplo()
        lote.nome = "Segundo"
        try banco.salvar(DadosApp(versao: 1, lotes: [lote], insumos: []))

        let lido = try XCTUnwrap(try banco.carregar())
        XCTAssertEqual(lido.lotes.count, 1)
        XCTAssertEqual(lido.lotes.first?.nome, "Segundo")
    }

    func testApagarRemoveOArquivo() throws {
        try banco.salvar(DadosApp.inicial)
        XCTAssertGreaterThan(banco.tamanhoEmBytes, 0)

        try banco.apagar()
        XCTAssertNil(try banco.carregar())
        XCTAssertEqual(banco.tamanhoEmBytes, 0)
    }

    func testApagarDuasVezesNaoFalha() throws {
        try banco.salvar(DadosApp.inicial)
        try banco.apagar()
        XCTAssertNoThrow(try banco.apagar())
    }

    func testExportarEImportarPreservamOsDados() throws {
        let dados = DadosApp(versao: 1, lotes: [Lote.exemplo()], insumos: CatalogoInsumos.padrao)
        let bytes = try BancoLocal.exportar(dados)
        let voltou = try BancoLocal.importar(bytes)

        XCTAssertEqual(voltou.lotes.first?.id, dados.lotes.first?.id)
        XCTAssertEqual(voltou.insumos.map { $0.id }, dados.insumos.map { $0.id })
    }

    func testArquivoCorrompidoGeraErro() throws {
        try FileManager.default.createDirectory(at: pasta, withIntermediateDirectories: true)
        let arquivo = try XCTUnwrap(banco.arquivo)
        try Data("isto nao e json".utf8).write(to: arquivo)

        XCTAssertThrowsError(try banco.carregar())
    }

    func testEmbalagemSobreviveAoCodificar() throws {
        let insumo = Insumo(nome: "Milho", categoria: .energetico,
                            materiaSeca: 88, proteinaBruta: 9, ndt: 87,
                            embalagem: Embalagem(tipo: .saca, kgPorSaca: 60),
                            precoUnitario: 72)
        let bytes = try JSONEncoder().encode(insumo)
        let voltou = try JSONDecoder().decode(Insumo.self, from: bytes)

        XCTAssertEqual(voltou.embalagem.tipo, .saca)
        XCTAssertEqual(voltou.embalagem.kgPorSaca, 60)
        XCTAssertEqual(voltou.precoPorKg, 1.2, accuracy: 0.0001)
    }

    func testDadosIniciaisTrazemOCatalogoPadrao() {
        let iniciais = DadosApp.inicial
        XCTAssertTrue(iniciais.lotes.isEmpty)
        XCTAssertFalse(iniciais.insumos.isEmpty)
        XCTAssertTrue(iniciais.insumos.contains { $0.categoria == .volumoso })
        XCTAssertTrue(iniciais.insumos.contains { $0.categoria == .energetico })
        XCTAssertTrue(iniciais.insumos.contains { $0.categoria == .proteico })
        XCTAssertTrue(iniciais.insumos.contains { $0.categoria == .mineral })
    }
}
