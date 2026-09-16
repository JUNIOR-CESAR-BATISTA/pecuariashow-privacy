import XCTest
@testable import NovilhaNutri

final class FormuladorRacaoTests: XCTestCase {

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

    private var perfil: PerfilAnimal {
        PerfilAnimal(pesoVivo: 300, fase: .recriaFinal, pesoFinal: 450)
    }

    private var exigencia: ExigenciaDiaria {
        MotorExigencias.calcular(perfil: perfil, ganhoMeta: 0.700)
    }

    private var selecao: SelecaoInsumos {
        SelecaoInsumos(volumoso: pasto, energetico: milho, proteico: soja, mineral: mineral)
    }

    func testBalanceamentoAtendePBeNDTExatamente() {
        let alvo = exigencia
        let racao = FormuladorRacao.formular(exigencia: alvo, selecao: selecao)

        XCTAssertEqual(racao.status, .balanceada)
        XCTAssertEqual(racao.proteinaFornecidaKg, alvo.proteinaBrutaKg, accuracy: 0.001)
        XCTAssertEqual(racao.ndtFornecidoKg, alvo.ndtKg, accuracy: 0.001)
        XCTAssertEqual(racao.consumoMateriaSeca, alvo.consumoMateriaSeca, accuracy: 0.001)
        XCTAssertEqual(racao.itens.count, 4)
    }

    func testQuantidadesEmMateriaSecaEMateriaNatural() {
        let racao = FormuladorRacao.formular(exigencia: exigencia, selecao: selecao)

        guard let volumoso = racao.itens.first(where: { $0.insumo.nome == "Pasto" }),
              let energetico = racao.itens.first(where: { $0.insumo.nome == "Milho" }),
              let proteico = racao.itens.first(where: { $0.insumo.nome == "Farelo de soja" }) else {
            return XCTFail("Ração sem os alimentos esperados")
        }

        XCTAssertEqual(volumoso.kgMateriaSeca, 4.179, accuracy: 0.02)
        XCTAssertEqual(energetico.kgMateriaSeca, 2.232, accuracy: 0.02)
        XCTAssertEqual(proteico.kgMateriaSeca, 0.376, accuracy: 0.02)

        // Matéria natural = matéria seca dividida pelo teor de MS.
        XCTAssertEqual(volumoso.kgMateriaNatural, 14.93, accuracy: 0.1)
        XCTAssertEqual(energetico.kgMateriaNatural, 2.536, accuracy: 0.02)
        XCTAssertEqual(proteico.kgMateriaNatural, 0.422, accuracy: 0.02)
    }

    func testMineralEntraComQuantidadeFixa() {
        var restricoes = RestricoesFormulacao.padrao
        restricoes.mineralGramasDia = 120
        let racao = FormuladorRacao.formular(exigencia: exigencia, selecao: selecao,
                                             restricoes: restricoes)

        guard let item = racao.itens.first(where: { $0.insumo.categoria == .mineral }) else {
            return XCTFail("Mineral ausente")
        }
        XCTAssertEqual(item.kgMateriaNatural, 0.120, accuracy: 0.0005)
    }

    func testVolumosoMinimoForcaAjusteEDeixaFaltarEnergia() {
        var restricoes = RestricoesFormulacao.padrao
        restricoes.volumosoMinimo = 0.80
        let alvo = exigencia
        let racao = FormuladorRacao.formular(exigencia: alvo, selecao: selecao,
                                             restricoes: restricoes)

        XCTAssertEqual(racao.status, .restrita)
        // A proteína continua atendida.
        XCTAssertEqual(racao.proteinaFornecidaKg, alvo.proteinaBrutaKg, accuracy: 0.005)
        // A energia fica abaixo do exigido.
        XCTAssertLessThan(racao.balancoNDT, -0.1)
        XCTAssertFalse(racao.alertas.isEmpty)

        let volumoso = racao.itens.first { $0.insumo.categoria == .volumoso }
        XCTAssertEqual(volumoso?.kgMateriaSeca ?? 0, 5.429, accuracy: 0.05)
    }

    func testVolumosoFixoRespeitaAProporcaoEscolhida() {
        var restricoes = RestricoesFormulacao.padrao
        restricoes.volumosoFixo = 0.50
        let racao = FormuladorRacao.formular(exigencia: exigencia, selecao: selecao,
                                             restricoes: restricoes)

        let disponivel = racao.consumoMateriaSeca - 0.099
        let volumoso = racao.itens.first { $0.insumo.categoria == .volumoso }
        XCTAssertEqual(volumoso?.kgMateriaSeca ?? 0, disponivel * 0.5, accuracy: 0.01)
        XCTAssertEqual(racao.status, .restrita)
    }

    func testRacaoBalanceadaDevolveOGanhoDaMeta() {
        let alvo = exigencia
        let racao = FormuladorRacao.formular(exigencia: alvo, selecao: selecao)
        let ganho = MotorExigencias.ganhoEsperado(perfil: perfil,
                                                  consumoMS: racao.consumoMateriaSeca,
                                                  ndtKg: racao.ndtFornecidoKg,
                                                  proteinaBrutaKg: racao.proteinaFornecidaKg)

        XCTAssertEqual(ganho.porEnergia, 0.700, accuracy: 0.01)
        XCTAssertGreaterThanOrEqual(ganho.porProteina, ganho.porEnergia)
    }

    func testCustoDiarioUsaPrecoPorQuiloNatural() {
        let racao = FormuladorRacao.formular(exigencia: exigencia, selecao: selecao)
        let esperado = racao.itens.reduce(0.0) { total, item in
            total + item.kgMateriaNatural * item.insumo.precoPorKg
        }

        XCTAssertEqual(racao.custoDiario, esperado, accuracy: 0.0001)
        // O pasto não tem preço, então não entra no custo.
        XCTAssertGreaterThan(racao.custoDiario, 0)
    }

    func testAvaliacaoManualCalculaOsTotais() {
        let alvo = exigencia
        let racao = FormuladorRacao.avaliar(quantidades: [(pasto, 15.0), (milho, 2.0), (soja, 0.5)],
                                            exigencia: alvo)

        XCTAssertEqual(racao.consumoMateriaSeca, 15 * 0.28 + 2 * 0.88 + 0.5 * 0.89, accuracy: 0.0001)
        XCTAssertEqual(racao.itens.count, 3)
    }

    func testAlimentoRepetidoEhSomadoEmUmaLinhaSo() {
        let racao = FormuladorRacao.avaliar(quantidades: [(milho, 1.0), (milho, 2.0)],
                                            exigencia: exigencia)

        XCTAssertEqual(racao.itens.count, 1)
        XCTAssertEqual(racao.itens.first?.kgMateriaNatural ?? 0, 3.0, accuracy: 0.0001)
    }

    func testPercentuaisDeVolumosoEConcentrado() {
        let racao = FormuladorRacao.formular(exigencia: exigencia, selecao: selecao)

        XCTAssertEqual(racao.percentualVolumoso + racao.percentualConcentrado
                        + (0.099 / racao.consumoMateriaSeca * 100), 100, accuracy: 0.5)
    }

    func testSistemaLinearSemSolucaoNaoQuebra() {
        // Três alimentos idênticos deixam o sistema indeterminado.
        let iguais = SelecaoInsumos(volumoso: pasto, energetico: pasto, proteico: pasto, mineral: nil)
        let racao = FormuladorRacao.formular(exigencia: exigencia, selecao: iguais)

        XCTAssertEqual(racao.status, .restrita)
        XCTAssertGreaterThan(racao.consumoMateriaSeca, 0)
        XCTAssertFalse(racao.alertas.isEmpty)
    }

    func testGaussJordanResolveSistemaConhecido() {
        // x + y + z = 6 ; 2y + 5z = -4 ; 2x + 5y - z = 27  ->  (5, 3, -2)
        let solucao = FormuladorRacao.gaussJordan([[1, 1, 1, 6],
                                                   [0, 2, 5, -4],
                                                   [2, 5, -1, 27]])
        guard let solucao else { return XCTFail("Sistema deveria ter solução") }
        XCTAssertEqual(solucao[0], 5, accuracy: 0.0001)
        XCTAssertEqual(solucao[1], 3, accuracy: 0.0001)
        XCTAssertEqual(solucao[2], -2, accuracy: 0.0001)
    }

    func testGaussJordanDevolveNilQuandoSingular() {
        XCTAssertNil(FormuladorRacao.gaussJordan([[1, 1, 1, 3],
                                                  [2, 2, 2, 6],
                                                  [3, 3, 3, 9]]))
    }
}
