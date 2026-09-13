import Foundation

/// Conteudo completo persistido pelo aplicativo.
struct DadosApp: Codable {
    var versao: Int
    var lotes: [Lote]
    var insumos: [Insumo]

    static let versaoAtual = 1

    static var inicial: DadosApp {
        DadosApp(versao: versaoAtual, lotes: [], insumos: CatalogoInsumos.padrao)
    }
}

/// Armazenamento local em arquivo JSON dentro do sandbox do aplicativo.
///
/// Nao existe servidor, conta de usuario nem sincronizacao: os dados ficam
/// apenas no aparelho, no diretorio de suporte do proprio aplicativo, e so
/// saem dali se o usuario exportar o arquivo por conta propria.
struct BancoLocal {

    enum ErroBanco: LocalizedError {
        case diretorioIndisponivel
        case falhaAoSalvar(String)
        case falhaAoLer(String)

        var errorDescription: String? {
            switch self {
            case .diretorioIndisponivel:
                return "Nao foi possivel acessar a pasta de dados do aplicativo."
            case .falhaAoSalvar(let detalhe):
                return "Falha ao salvar os dados: \(detalhe)"
            case .falhaAoLer(let detalhe):
                return "Falha ao ler os dados salvos: \(detalhe)"
            }
        }
    }

    static let nomeArquivo = "novilhanutri.json"
    static let nomePasta = "NovilhaNutri"

    let pastaBase: URL?

    init(pastaBase: URL? = nil) {
        if let pastaBase {
            self.pastaBase = pastaBase
        } else {
            self.pastaBase = FileManager.default
                .urls(for: .applicationSupportDirectory, in: .userDomainMask)
                .first?
                .appendingPathComponent(nomePasta, isDirectory: true)
        }
    }

    var arquivo: URL? {
        pastaBase?.appendingPathComponent(Self.nomeArquivo)
    }

    var caminhoLegivel: String {
        arquivo?.path ?? "indisponivel"
    }

    private static var encoder: JSONEncoder {
        let e = JSONEncoder()
        e.outputFormatting = [.prettyPrinted, .sortedKeys]
        e.dateEncodingStrategy = .iso8601
        return e
    }

    private static var decoder: JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }

    /// Le os dados salvos. Retorna `nil` quando ainda nao existe arquivo.
    func carregar() throws -> DadosApp? {
        guard let arquivo else { throw ErroBanco.diretorioIndisponivel }
        guard FileManager.default.fileExists(atPath: arquivo.path) else { return nil }
        do {
            let dados = try Data(contentsOf: arquivo)
            return try Self.decoder.decode(DadosApp.self, from: dados)
        } catch {
            throw ErroBanco.falhaAoLer(error.localizedDescription)
        }
    }

    /// Grava os dados de forma atomica, sem sair do aparelho.
    func salvar(_ dados: DadosApp) throws {
        guard let pastaBase, let arquivo else { throw ErroBanco.diretorioIndisponivel }
        do {
            try FileManager.default.createDirectory(at: pastaBase,
                                                    withIntermediateDirectories: true)
            let conteudo = try Self.encoder.encode(dados)
            try conteudo.write(to: arquivo, options: [.atomic, .completeFileProtection])
        } catch {
            throw ErroBanco.falhaAoSalvar(error.localizedDescription)
        }
    }

    /// Remove o arquivo de dados do aparelho.
    func apagar() throws {
        guard let arquivo else { throw ErroBanco.diretorioIndisponivel }
        guard FileManager.default.fileExists(atPath: arquivo.path) else { return }
        do {
            try FileManager.default.removeItem(at: arquivo)
        } catch {
            throw ErroBanco.falhaAoSalvar(error.localizedDescription)
        }
    }

    /// Tamanho ocupado pelo arquivo, em bytes.
    var tamanhoEmBytes: Int {
        guard let arquivo,
              let atributos = try? FileManager.default.attributesOfItem(atPath: arquivo.path),
              let tamanho = atributos[.size] as? NSNumber else { return 0 }
        return tamanho.intValue
    }

    /// Serializa os dados para exportacao manual pelo usuario.
    static func exportar(_ dados: DadosApp) throws -> Data {
        try encoder.encode(dados)
    }

    static func importar(_ dados: Data) throws -> DadosApp {
        try decoder.decode(DadosApp.self, from: dados)
    }
}
