import Foundation

/// Conteúdo completo persistido pelo aplicativo.
struct DadosApp: Codable {
    var versao: Int
    var lotes: [Lote]
    var insumos: [Insumo]
    /// Ciclos já abatidos, que servem de base para os próximos lotes.
    var ciclos: [CicloEncerrado]
    /// Se os novos lotes nascem calibrados pelo histórico.
    var usarCalibracao: Bool

    static let versaoAtual = 2

    static var inicial: DadosApp {
        DadosApp(versao: versaoAtual,
                 lotes: [],
                 insumos: CatalogoInsumos.padrao,
                 ciclos: [],
                 usarCalibracao: true)
    }

    init(versao: Int,
         lotes: [Lote],
         insumos: [Insumo],
         ciclos: [CicloEncerrado] = [],
         usarCalibracao: Bool = true) {
        self.versao = versao
        self.lotes = lotes
        self.insumos = insumos
        self.ciclos = ciclos
        self.usarCalibracao = usarCalibracao
    }

    /// Leitura tolerante: arquivos gravados na versão 1 não têm ciclos nem a
    /// preferência de calibração, e precisam continuar abrindo.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        versao = try container.decodeIfPresent(Int.self, forKey: .versao) ?? 1
        lotes = try container.decodeIfPresent([Lote].self, forKey: .lotes) ?? []
        insumos = try container.decodeIfPresent([Insumo].self, forKey: .insumos) ?? []
        ciclos = try container.decodeIfPresent([CicloEncerrado].self, forKey: .ciclos) ?? []
        usarCalibracao = try container.decodeIfPresent(Bool.self, forKey: .usarCalibracao) ?? true
    }
}

/// Armazenamento local em arquivo JSON dentro do sandbox do aplicativo.
///
/// Não existe servidor, conta de usuário nem sincronização: os dados ficam
/// apenas no aparelho, no diretório de suporte do próprio aplicativo, e só
/// saem dali se o usuário exportar o arquivo por conta própria.
struct BancoLocal {

    enum ErroBanco: LocalizedError {
        case diretorioIndisponivel
        case falhaAoSalvar(String)
        case falhaAoLer(String)

        var errorDescription: String? {
            switch self {
            case .diretorioIndisponivel:
                return "Não foi possível acessar a pasta de dados do aplicativo."
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
                .appendingPathComponent(Self.nomePasta, isDirectory: true)
        }
    }

    var arquivo: URL? {
        pastaBase?.appendingPathComponent(Self.nomeArquivo)
    }

    var caminhoLegivel: String {
        arquivo?.path ?? "indisponível"
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

    /// Lê os dados salvos. Retorna `nil` quando ainda não existe arquivo.
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

    /// Grava os dados de forma atômica, sem sair do aparelho.
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

    /// Serializa os dados para exportação manual pelo usuário.
    static func exportar(_ dados: DadosApp) throws -> Data {
        try encoder.encode(dados)
    }

    static func importar(_ dados: Data) throws -> DadosApp {
        try decoder.decode(DadosApp.self, from: dados)
    }
}
