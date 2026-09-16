import SwiftUI
import UniformTypeIdentifiers

/// O que está para ser confirmado antes de mexer nos dados.
///
/// As duas confirmações vivem no mesmo lugar de propósito: dois
/// `confirmationDialog` na mesma tela disputam a apresentação e só um
/// costuma abrir.
private enum ConfirmacaoDados {
    case apagar
    case restaurar(DadosApp)
}

/// Informações sobre o armazenamento local, backup manual e metodologia.
struct DadosView: View {
    @EnvironmentObject private var estado: AppEstado
    @State private var arquivoBackup: URL?
    @State private var escolhendoArquivo = false
    @State private var confirmacao: ConfirmacaoDados?
    @State private var erroBackup: String?

    var body: some View {
        List {
            Section {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "iphone.and.arrow.forward.inward")
                        .font(.title3)
                        .foregroundStyle(Tema.ouro)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Tudo fica no seu aparelho")
                            .font(.subheadline.weight(.semibold))
                        Text("O aplicativo não tem servidor, conta de usuário nem sincronização. Lotes, insumos e pesagens são gravados em um arquivo dentro da área privada do próprio aplicativo e só saem dali se você exportar.")
                            .font(.footnote)
                            .foregroundStyle(Tema.textoSuave)
                    }
                }
                .padding(.vertical, 4)
            } header: {
                Text("Privacidade dos dados")
            }
            .listRowBackground(Tema.superficie)

            Section("Armazenamento") {
                LinhaDado(rotulo: "Lotes", valor: "\(estado.lotes.count)")
                LinhaDado(rotulo: "Insumos", valor: "\(estado.insumos.count)")
                LinhaDado(rotulo: "Tamanho do arquivo",
                          valor: "\(Formatadores.numero(Double(estado.tamanhoDoArquivo) / 1024, casas: 1)) KB")
                Button {
                    estado.salvarAgora()
                } label: {
                    Label("Salvar agora", systemImage: "square.and.arrow.down")
                }
            }
            .listRowBackground(Tema.superficie)

            Section {
                Button {
                    gerarBackup()
                } label: {
                    Label("Gerar arquivo de backup", systemImage: "doc.badge.plus")
                }
                if let arquivoBackup {
                    BotaoCompartilhar {
                        return [arquivoBackup]
                    } rotulo: {
                        Label("Compartilhar backup", systemImage: "square.and.arrow.up")
                    }
                }
                Button {
                    escolhendoArquivo = true
                } label: {
                    Label("Restaurar de um arquivo", systemImage: "arrow.down.doc")
                }
                if let erroBackup {
                    Aviso(texto: erroBackup)
                }
            } header: {
                Text("Backup manual")
            } footer: {
                Text("Gera um arquivo JSON com todos os dados. Guarde onde preferir. A exportação é sempre uma ação sua: nada é enviado automaticamente. A restauração substitui o que estiver no aparelho, e pede confirmação antes.")
            }
            .listRowBackground(Tema.superficie)

            Section {
                NavigationLink {
                    MetodologiaView()
                } label: {
                    Label("Como os cálculos são feitos", systemImage: "function")
                }
            } header: {
                Text("Metodologia")
            }
            .listRowBackground(Tema.superficie)

            Section {
                Button(role: .destructive) {
                    confirmacao = .apagar
                } label: {
                    Label("Apagar todos os dados", systemImage: "trash")
                }
            } footer: {
                Text("Remove lotes, pesagens e insumos personalizados deste aparelho. A lista de alimentos volta ao padrão.")
            }
            .listRowBackground(Tema.superficie)

            Section {
                LinhaDado(rotulo: "Versão dos dados", valor: "\(DadosApp.versaoAtual)")
                Text("NovilhaNutri - controle nutricional de novilhas em semiconfinamento. Os resultados são referências técnicas de planejamento e não substituem a avaliação de um zootecnista ou veterinário.")
                    .font(.caption)
                    .foregroundStyle(Tema.textoSuave)
            } header: {
                Text("Sobre")
            }
            .listRowBackground(Tema.superficie)
        }
        .navigationTitle("Dados")
.listaEscura()
.barraEscura()
        .fileImporter(isPresented: $escolhendoArquivo,
                      allowedContentTypes: [.json],
                      allowsMultipleSelection: false) { resultado in
            lerBackup(resultado)
        }
        .confirmationDialog(tituloConfirmacao,
                            isPresented: Binding(get: { confirmacao != nil },
                                                 set: { if !$0 { confirmacao = nil } }),
                            titleVisibility: .visible) {
            switch confirmacao {
            case .apagar:
                Button("Apagar tudo", role: .destructive) {
                    estado.apagarTudo()
                    arquivoBackup = nil
                }
            case .restaurar(let dados):
                Button("Substituir meus dados", role: .destructive) {
                    estado.restaurar(dados)
                    arquivoBackup = nil
                }
            case nil:
                EmptyView()
            }
            Button("Cancelar", role: .cancel) { }
        } message: {
            Text(mensagemConfirmacao)
        }
    }

    private var tituloConfirmacao: String {
        if case .restaurar = confirmacao { return "Restaurar este backup?" }
        return "Apagar todos os dados?"
    }

    private var mensagemConfirmacao: String {
        if case .restaurar(let dados) = confirmacao {
            return "O arquivo traz \(dados.lotes.count) lote(s), \(dados.insumos.count) insumo(s) "
                + "e \(dados.ciclos.count) ciclo(s) encerrado(s). Tudo o que está hoje no aparelho "
                + "será substituído, e isso não pode ser desfeito."
        }
        return "Esta ação não pode ser desfeita. Gere um backup antes se quiser guardar os dados."
    }

    /// Lê o arquivo escolhido e guarda o conteúdo para a confirmação.
    ///
    /// Nada é gravado aqui: primeiro conferimos que o arquivo abre e quanta
    /// coisa ele traz, e só então perguntamos se pode substituir.
    private func lerBackup(_ resultado: Result<[URL], Error>) {
        erroBackup = nil
        do {
            guard let arquivo = try resultado.get().first else { return }
            // Arquivo escolhido fora da área do aplicativo precisa de permissão
            // explícita para ser lido, e ela tem que ser devolvida depois.
            let liberado = arquivo.startAccessingSecurityScopedResource()
            defer { if liberado { arquivo.stopAccessingSecurityScopedResource() } }

            let conteudo = try Data(contentsOf: arquivo)
            confirmacao = .restaurar(try BancoLocal.importar(conteudo))
        } catch {
            erroBackup = "Não foi possível ler esse arquivo de backup: \(error.localizedDescription)"
        }
    }

    private func gerarBackup() {
        erroBackup = nil
        do {
            let dados = try BancoLocal.exportar(estado.dadosAtuais)
            let nome = "novilhanutri-backup.json"
            let destino = FileManager.default.temporaryDirectory.appendingPathComponent(nome)
            try dados.write(to: destino, options: .atomic)
            arquivoBackup = destino
        } catch {
            erroBackup = "Não foi possível gerar o backup: \(error.localizedDescription)"
        }
    }
}

/// Explicação das equações usadas.
struct MetodologiaView: View {
    var body: some View {
        List {
            Section("Ponto de partida") {
                Text("As exigências são calculadas pelo sistema de energia líquida e proteína metabolizável do NRC para gado de corte, com ajustes de grupo genético e de atividade usuais em condições brasileiras. Tudo parte de três informações: peso vivo, meta de ganho e o peso em que a novilha termina.")
                    .font(.footnote)
            }
            .listRowBackground(Tema.superficie)

            Section("Energia") {
                TextoMetodo(titulo: "Mantença",
                            corpo: "ELm = 0,077 x fator do grupo genético x fator de atividade x PCJ elevado a 0,75. PCJ é o peso vivo de jejum (96% do peso vivo).")
                TextoMetodo(titulo: "Ganho",
                            corpo: "ER = 0,0783 x PCVZ equivalente elevado a 0,75 x ganho de corpo vazio elevado a 1,119. São os coeficientes de fêmeas em crescimento, que depositam mais gordura por quilo ganho que os machos.")
                TextoMetodo(titulo: "Peso equivalente",
                            corpo: "O peso é corrigido pelo grau de maturidade: peso de jejum x 462 / peso de acabamento em jejum. Novilhas mais precoces exigem mais energia por quilo de ganho no mesmo peso.")
                TextoMetodo(titulo: "NDT",
                            corpo: "A densidade da dieta é encontrada procurando o teor de NDT em que o consumo necessário iguala o consumo previsto. O NDT diário é o consumo de matéria seca multiplicado por esse teor.")
            }
            .listRowBackground(Tema.superficie)

            Section("Proteína") {
                TextoMetodo(titulo: "Mantença",
                            corpo: "PM de mantença = 3,8 g por PCJ elevado a 0,75.")
                TextoMetodo(titulo: "Ganho",
                            corpo: "A proteína líquida por quilo de ganho cai conforme a energia retida sobe: 268 menos 29,4 vezes a energia retida por quilo de ganho. A eficiência de uso da proteína metabolizável vai de 0,834 menos 0,00114 vezes o peso equivalente, com piso de 0,492.")
                TextoMetodo(titulo: "Da PM para a PB",
                            corpo: "Considera 130 g de proteína microbiana por quilo de NDT, aproveitada em 64%. O que faltar vem de proteína não degradável no rúmen, aproveitada em 80%. A soma das duas frações é a proteína bruta da dieta.")
                TextoMetodo(titulo: "Piso prático",
                            corpo: "Quando a conta resulta em menos proteína que o mínimo da fase (13% na desmama, 12% na recria inicial e 11% depois), o aplicativo usa o piso para não comprometer o ambiente ruminal.")
            }
            .listRowBackground(Tema.superficie)

            Section("Ração e conversões") {
                TextoMetodo(titulo: "Balanceamento",
                            corpo: "Com volumoso, energético e proteico o aplicativo resolve um sistema de três equações: matéria seca total, proteína bruta e NDT. Quando a solução fica fora dos limites de volumoso, o volumoso é fixado no limite e o concentrado atende a proteína, mostrando o saldo de energia.")
                TextoMetodo(titulo: "Matéria natural",
                            corpo: "A quantidade a fornecer no cocho é a matéria seca dividida pelo teor de matéria seca do alimento.")
                TextoMetodo(titulo: "Sacas",
                            corpo: "O total em quilos é dividido pelo peso da embalagem cadastrada. Tamanhos de mercado disponíveis: 60, 50, 40, 30, 25 e 20 kg, além de granel em toneladas. A linha de compra arredonda para cima.")
                TextoMetodo(titulo: "Períodos",
                            corpo: "O ciclo é dividido em períodos. Em cada um as exigências são recalculadas no peso médio do intervalo e a ração é refeita, por isso o consumo cresce ao longo do ciclo.")
            }
            .listRowBackground(Tema.superficie)

            Section("Resultado previsto") {
                TextoMetodo(titulo: "Compra",
                            corpo: "Por arroba, o preço combinado multiplica as arrobas de carcaça no peso de entrada (peso de entrada x rendimento / 15). Por cabeça, vale o valor informado, qualquer que seja o peso.")
                TextoMetodo(titulo: "Venda",
                            corpo: "As arrobas de carcaça no peso de abate multiplicadas pelo preço de arroba informado.")
                TextoMetodo(titulo: "Lucro",
                            corpo: "Venda menos compra menos o custo da dieta até o abate. Não entram sanidade, transporte, pastagem, mão de obra nem impostos.")
                TextoMetodo(titulo: "Arroba de equilíbrio",
                            corpo: "O investimento dividido por todas as arrobas vendidas. É o preço em que o ciclo empata; abaixo dele a venda não paga a compra mais a dieta.")
                TextoMetodo(titulo: "Resultado só da engorda",
                            corpo: "As arrobas produzidas no ciclo ao preço de venda, menos o custo da dieta. Separa o mérito da ração do mérito da compra.")
            }
            .listRowBackground(Tema.superficie)

            Section {
                Text("Os coeficientes são médias de população. Acompanhe pesagens reais e use o ajuste de consumo do lote para aproximar a previsão do que acontece no cocho.")
                    .font(.footnote)
                    .foregroundStyle(Tema.textoSuave)
            }
            .listRowBackground(Tema.superficie)
        }
        .navigationTitle("Metodologia")
        .navigationBarTitleDisplayMode(.inline)
        .listaEscura()
        .barraEscura()
    }
}

struct TextoMetodo: View {
    let titulo: String
    let corpo: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(titulo)
                .font(.subheadline.weight(.semibold))
            Text(corpo)
                .font(.footnote)
                .foregroundStyle(Tema.textoSuave)
        }
        .padding(.vertical, 2)
    }
}
