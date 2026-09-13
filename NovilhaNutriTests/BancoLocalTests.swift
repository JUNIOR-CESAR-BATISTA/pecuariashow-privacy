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
        lote.observacoes = "Lote de teste com acentuação: nutrição, proteína"
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
        try Data("isto não é json".utf8).write(to: arquivo)

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

    func testArquivoDaVersao1AbreSemCiclos() throws {
        // Formato antigo: sem as chaves "ciclos" e "usarCalibracao".
        let antigo = """
        {
          "versao": 1,
          "lotes": [],
          "insumos": []
        }
        """
        let dados = try BancoLocal.importar(Data(antigo.utf8))

        XCTAssertEqual(dados.versao, 1)
        XCTAssertTrue(dados.ciclos.isEmpty)
        XCTAssertTrue(dados.usarCalibracao)
    }

    func testCiclosSobrevivemAoSalvarELer() throws {
        let ciclo = CicloEncerrado(loteID: UUID(),
                                   nome: "Lote encerrado",
                                   grupoGenetico: .zebuino,
                                   sistema: .semiconfinamento,
                                   dataInicio: Date(timeIntervalSince1970: 0),
                                   pesoInicial: 260,
                                   ganhoMeta: 0.750,
                                   pesoAlvo: 430,
                                   animaisIniciais: 40,
                                   pesoAcabamentoPlanejado: 430,
                                   consumoPrevistoDiario: 7.9,
                                   ndtDietaMedia: 67,
                                   pbDietaMedia: 11,
                                   concentradoPrevisto: 40_000,
                                   custoPrevisto: 50_000,
                                   volumosoNome: "Pasto",
                                   energeticoNome: "Milho",
                                   proteicoNome: "Farelo de soja",
                                   dataAbate: Date(timeIntervalSince1970: 226 * 86_400),
                                   pesoFinalReal: 429,
                                   animaisAbatidos: 39,
                                   pesoCarcacaReal: 228)
        try banco.salvar(DadosApp(versao: DadosApp.versaoAtual,
                                  lotes: [],
                                  insumos: [],
                                  ciclos: [ciclo],
                                  usarCalibracao: false))

        let lido = try XCTUnwrap(try banco.carregar())
        XCTAssertEqual(lido.ciclos.count, 1)
        XCTAssertEqual(lido.ciclos.first?.id, ciclo.id)
        XCTAssertEqual(lido.ciclos.first?.proteicoNome, "Farelo de soja")
        XCTAssertEqual(lido.ciclos.first?.pesoCarcacaReal, 228)
        XCTAssertFalse(lido.usarCalibracao)
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
