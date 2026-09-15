import Foundation
import SwiftUI

/// Estado compartilhado do aplicativo, com gravação automática em disco.
@MainActor
final class AppEstado: ObservableObject {

    @Published var lotes: [Lote] = [] { didSet { agendarSalvamento() } }
    @Published var insumos: [Insumo] = [] { didSet { agendarSalvamento() } }
    @Published var ciclos: [CicloEncerrado] = [] { didSet { agendarSalvamento() } }
    @Published var usarCalibracao = true { didSet { agendarSalvamento() } }
    @Published var loteSelecionadoID: UUID?
    @Published var mensagemErro: String?

    private let banco: BancoLocal
    private var salvamentoPendente: Task<Void, Never>?
    private var carregando = true

    init(banco: BancoLocal = BancoLocal()) {
        self.banco = banco
        carregar()
    }

    // MARK: - Ciclo de vida dos dados

    func carregar() {
        carregando = true
        defer { carregando = false }
        do {
            if let dados = try banco.carregar() {
                lotes = dados.lotes
                insumos = dados.insumos.isEmpty ? CatalogoInsumos.padrao : dados.insumos
                ciclos = dados.ciclos
                usarCalibracao = dados.usarCalibracao
            } else {
                let inicial = DadosApp.inicial
                lotes = inicial.lotes
                insumos = inicial.insumos
                ciclos = inicial.ciclos
                usarCalibracao = inicial.usarCalibracao
            }
        } catch {
            mensagemErro = error.localizedDescription
            lotes = []
            insumos = CatalogoInsumos.padrao
            ciclos = []
        }
        loteSelecionadoID = lotes.first?.id
    }

    var dadosAtuais: DadosApp {
        DadosApp(versao: DadosApp.versaoAtual,
                 lotes: lotes,
                 insumos: insumos,
                 ciclos: ciclos,
                 usarCalibracao: usarCalibracao)
    }

    /// Agrupa alterações seguidas em uma única gravação.
    private func agendarSalvamento() {
        guard !carregando else { return }
        salvamentoPendente?.cancel()
        salvamentoPendente = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 400_000_000)
            guard !Task.isCancelled else { return }
            self?.salvarAgora()
        }
    }

    func salvarAgora() {
        salvamentoPendente?.cancel()
        salvamentoPendente = nil
        do {
            try banco.salvar(dadosAtuais)
        } catch {
            mensagemErro = error.localizedDescription
        }
    }

    /// Substitui tudo o que está no aparelho pelo conteúdo de um backup.
    ///
    /// O `carregando` fica ligado durante a troca para o salvamento automático
    /// não disparar uma vez por propriedade; a gravação sai de uma vez no fim.
    func restaurar(_ dados: DadosApp) {
        carregando = true
        lotes = dados.lotes
        insumos = dados.insumos.isEmpty ? CatalogoInsumos.padrao : dados.insumos
        ciclos = dados.ciclos
        usarCalibracao = dados.usarCalibracao
        carregando = false
        loteSelecionadoID = lotes.first?.id
        salvarAgora()
    }

    func apagarTudo() {
        do {
            try banco.apagar()
        } catch {
            mensagemErro = error.localizedDescription
        }
        carregando = true
        lotes = []
        insumos = CatalogoInsumos.padrao
        ciclos = []
        usarCalibracao = true
        loteSelecionadoID = nil
        carregando = false
        salvarAgora()
    }

    func restaurarCatalogoPadrao() {
        var atuais = insumos
        for padrao in CatalogoInsumos.padrao where !atuais.contains(where: { $0.id == padrao.id }) {
            atuais.append(padrao)
        }
        insumos = atuais
    }

    var caminhoDoArquivo: String { banco.caminhoLegivel }
    var tamanhoDoArquivo: Int { banco.tamanhoEmBytes }

    // MARK: - Lotes

    var loteSelecionado: Lote? {
        guard let loteSelecionadoID else { return lotes.first }
        return lotes.first { $0.id == loteSelecionadoID } ?? lotes.first
    }

    func lote(id: UUID) -> Lote? {
        lotes.first { $0.id == id }
    }

    func salvar(lote: Lote) {
        if let indice = lotes.firstIndex(where: { $0.id == lote.id }) {
            lotes[indice] = lote
        } else {
            lotes.append(lote)
        }
        loteSelecionadoID = lote.id
    }

    func remover(loteID: UUID) {
        lotes.removeAll { $0.id == loteID }
        if loteSelecionadoID == loteID {
            loteSelecionadoID = lotes.first?.id
        }
    }

    /// Lote novo já apontando para os insumos disponíveis e, quando há
    /// histórico, já calibrado pelos ciclos encerrados.
    func novoLote() -> Lote {
        var lote = Lote()
        lote.nome = "Lote \(lotes.count + ciclos.count + 1)"
        lote.volumosoID = primeiro(.volumoso)?.id
        lote.energeticoID = primeiro(.energetico)?.id
        lote.proteicoID = primeiro(.proteico)?.id
        lote.mineralID = primeiro(.mineral)?.id
        aplicarCalibracao(em: &lote)
        return lote
    }

    /// Aplica ao lote os parâmetros aprendidos com os ciclos já abatidos.
    func aplicarCalibracao(em lote: inout Lote) {
        let fatores = analise.fatores
        guard usarCalibracao, fatores.disponivel else { return }
        lote.ajusteConsumo = fatores.ajusteConsumo
        lote.rendimentoCarcaca = fatores.rendimentoCarcaca
        lote.pesoFinalMaturidade = fatores.pesoAcabamento
    }

    func criarLoteExemplo() {
        var lote = Lote.exemplo()
        lote.volumosoID = insumo(id: CatalogoInsumos.pastoAguasID)?.id ?? primeiro(.volumoso)?.id
        lote.energeticoID = insumo(id: CatalogoInsumos.milhoID)?.id ?? primeiro(.energetico)?.id
        lote.proteicoID = insumo(id: CatalogoInsumos.fareloSojaID)?.id ?? primeiro(.proteico)?.id
        lote.mineralID = insumo(id: CatalogoInsumos.mineralID)?.id ?? primeiro(.mineral)?.id
        aplicarCalibracao(em: &lote)
        salvar(lote: lote)
    }

    // MARK: - Insumos

    func insumo(id: UUID?) -> Insumo? {
        guard let id else { return nil }
        return insumos.first { $0.id == id }
    }

    func insumos(da categoria: CategoriaInsumo) -> [Insumo] {
        insumos.filter { $0.categoria == categoria }
            .sorted { $0.nome.localizedCaseInsensitiveCompare($1.nome) == .orderedAscending }
    }

    func primeiro(_ categoria: CategoriaInsumo) -> Insumo? {
        insumos(da: categoria).first
    }

    func salvar(insumo: Insumo) {
        if let indice = insumos.firstIndex(where: { $0.id == insumo.id }) {
            insumos[indice] = insumo
        } else {
            insumos.append(insumo)
        }
    }

    /// Remove o insumo e limpa as referências nos lotes que o usavam.
    func remover(insumoID: UUID) {
        insumos.removeAll { $0.id == insumoID }
        for indice in lotes.indices {
            if lotes[indice].volumosoID == insumoID { lotes[indice].volumosoID = primeiro(.volumoso)?.id }
            if lotes[indice].energeticoID == insumoID { lotes[indice].energeticoID = primeiro(.energetico)?.id }
            if lotes[indice].proteicoID == insumoID { lotes[indice].proteicoID = primeiro(.proteico)?.id }
            if lotes[indice].mineralID == insumoID { lotes[indice].mineralID = nil }
        }
    }

    /// Quantos lotes usam um determinado insumo.
    func lotesQueUsam(insumoID: UUID) -> Int {
        lotes.filter {
            $0.volumosoID == insumoID || $0.energeticoID == insumoID
                || $0.proteicoID == insumoID || $0.mineralID == insumoID
        }.count
    }

    // MARK: - Cálculos derivados

    func selecao(para lote: Lote) -> SelecaoInsumos? {
        guard let volumoso = insumo(id: lote.volumosoID) ?? primeiro(.volumoso),
              let energetico = insumo(id: lote.energeticoID) ?? primeiro(.energetico),
              let proteico = insumo(id: lote.proteicoID) ?? primeiro(.proteico) else { return nil }
        return SelecaoInsumos(volumoso: volumoso,
                              energetico: energetico,
                              proteico: proteico,
                              mineral: insumo(id: lote.mineralID))
    }

    func exigencia(para lote: Lote) -> ExigenciaDiaria {
        MotorExigencias.calcular(perfil: lote.perfilAtual, ganhoMeta: lote.ganhoMetaDiario)
    }

    func composicao(para lote: Lote) -> ComposicaoRacao {
        guard let selecao = selecao(para: lote) else { return .vazia }
        return FormuladorRacao.formular(exigencia: exigencia(para: lote),
                                        selecao: selecao,
                                        restricoes: lote.restricoes)
    }

    func relatorio(para lote: Lote) -> RelatorioPlanejamento {
        guard let selecao = selecao(para: lote) else {
            return .vazio(lote: lote, alertas: ["Cadastre ao menos um volumoso, um energético e um proteico."])
        }
        return PlanejadorAbate.projetar(lote: lote, selecao: selecao)
    }

    // MARK: - Histórico de ciclos

    /// Leitura do histórico: calibração, comparação entre alimentos e
    /// recomendações para os próximos lotes.
    var analise: AnaliseHistorica {
        AnalisadorHistorico.analisar(ciclos)
    }

    /// Encerra o lote com os dados reais do abate e o arquiva no histórico.
    ///
    /// O plano vigente é fotografado no momento do encerramento, para que a
    /// comparação entre previsto e realizado continue válida mesmo que os
    /// preços e os alimentos mudem depois.
    func encerrarCiclo(lote: Lote, resultado: ResultadoAbate) {
        let relatorio = relatorio(para: lote)
        let selecao = selecao(para: lote)

        let ciclo = CicloEncerrado(
            loteID: lote.id,
            nome: lote.nome,
            grupoGenetico: lote.grupoGenetico,
            sistema: lote.sistema,
            dataInicio: lote.dataEntrada,
            pesoInicial: lote.pesoMedioInicial,
            ganhoMeta: lote.ganhoMetaDiario,
            pesoAlvo: lote.pesoAlvoAbate,
            animaisIniciais: lote.quantidadeAnimais,
            pesoAcabamentoPlanejado: lote.pesoFinalMaturidade,
            consumoPrevistoDiario: relatorio.consumoMedioMateriaSeca,
            ndtDietaMedia: relatorio.ndtMedioDieta,
            pbDietaMedia: relatorio.pbMedioDieta,
            concentradoPrevisto: relatorio.concentradoTotalMN,
            custoPrevisto: relatorio.custoTotal,
            volumosoNome: selecao?.volumoso.nome ?? "",
            energeticoNome: selecao?.energetico.nome ?? "",
            proteicoNome: selecao?.proteico.nome ?? "",
            dataAbate: resultado.dataAbate,
            pesoFinalReal: resultado.pesoFinalReal,
            animaisAbatidos: resultado.animaisAbatidos,
            pesoCarcacaReal: resultado.pesoCarcacaReal,
            concentradoReal: resultado.concentradoReal,
            custoReal: resultado.custoReal,
            precoArroba: resultado.precoArroba,
            observacoes: resultado.observacoes
        )

        ciclos.append(ciclo)
        remover(loteID: lote.id)
    }

    func remover(cicloID: UUID) {
        ciclos.removeAll { $0.id == cicloID }
    }

    func ganhoEsperado(para lote: Lote) -> GanhoEsperado {
        let composicao = composicao(para: lote)
        return MotorExigencias.ganhoEsperado(perfil: lote.perfilAtual,
                                             consumoMS: composicao.consumoMateriaSeca,
                                             ndtKg: composicao.ndtFornecidoKg,
                                             proteinaBrutaKg: composicao.proteinaFornecidaKg)
    }
}
