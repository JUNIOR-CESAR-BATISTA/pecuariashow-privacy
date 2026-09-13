import SwiftUI

/// Informacoes sobre o armazenamento local, backup manual e metodologia.
struct DadosView: View {
    @EnvironmentObject private var estado: AppEstado
    @State private var arquivoBackup: URL?
    @State private var confirmandoApagar = false
    @State private var erroBackup: String?

    var body: some View {
        List {
            Section {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "iphone.and.arrow.forward.inward")
                        .font(.title3)
                        .foregroundStyle(Paleta.verde)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Tudo fica no seu aparelho")
                            .font(.subheadline.weight(.semibold))
                        Text("O aplicativo nao tem servidor, conta de usuario nem sincronizacao. Lotes, insumos e pesagens sao gravados em um arquivo dentro da area privada do proprio aplicativo e so saem dali se voce exportar.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            } header: {
                Text("Privacidade dos dados")
            }

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

            Section {
                Button {
                    gerarBackup()
                } label: {
                    Label("Gerar arquivo de backup", systemImage: "doc.badge.plus")
                }
                if let arquivoBackup {
                    ShareLink(item: arquivoBackup) {
                        Label("Compartilhar backup", systemImage: "square.and.arrow.up")
                    }
                }
                if let erroBackup {
                    Aviso(texto: erroBackup)
                }
            } header: {
                Text("Backup manual")
            } footer: {
                Text("Gera um arquivo JSON com todos os dados. Guarde onde preferir. A exportacao e sempre uma acao sua: nada e enviado automaticamente.")
            }

            Section {
                NavigationLink {
                    MetodologiaView()
                } label: {
                    Label("Como os calculos sao feitos", systemImage: "function")
                }
            } header: {
                Text("Metodologia")
            }

            Section {
                Button(role: .destructive) {
                    confirmandoApagar = true
                } label: {
                    Label("Apagar todos os dados", systemImage: "trash")
                }
            } footer: {
                Text("Remove lotes, pesagens e insumos personalizados deste aparelho. A lista de alimentos volta ao padrao.")
            }

            Section {
                LinhaDado(rotulo: "Versao dos dados", valor: "\(DadosApp.versaoAtual)")
                Text("NovilhaNutri - controle nutricional de novilhas em semiconfinamento. Os resultados sao referencias tecnicas de planejamento e nao substituem a avaliacao de um zootecnista ou veterinario.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } header: {
                Text("Sobre")
            }
        }
        .navigationTitle("Dados")
        .confirmationDialog("Apagar todos os dados?",
                            isPresented: $confirmandoApagar,
                            titleVisibility: .visible) {
            Button("Apagar tudo", role: .destructive) {
                estado.apagarTudo()
                arquivoBackup = nil
            }
            Button("Cancelar", role: .cancel) { }
        } message: {
            Text("Esta acao nao pode ser desfeita. Gere um backup antes se quiser guardar os dados.")
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
            erroBackup = "Nao foi possivel gerar o backup: \(error.localizedDescription)"
        }
    }
}

/// Explicacao das equacoes usadas.
struct MetodologiaView: View {
    var body: some View {
        List {
            Section("Ponto de partida") {
                Text("As exigencias sao calculadas pelo sistema de energia liquida e proteina metabolizavel do NRC para gado de corte, com ajustes de grupo genetico e de atividade usuais em condicoes brasileiras. Tudo parte de tres informacoes: peso vivo, meta de ganho e o peso em que a novilha termina.")
                    .font(.footnote)
            }

            Section("Energia") {
                TextoMetodo(titulo: "Mantenca",
                            corpo: "ELm = 0,077 x fator do grupo genetico x fator de atividade x PCJ elevado a 0,75. PCJ e o peso vivo de jejum (96% do peso vivo).")
                TextoMetodo(titulo: "Ganho",
                            corpo: "ER = 0,0783 x PCVZ equivalente elevado a 0,75 x ganho de corpo vazio elevado a 1,119. Sao os coeficientes de femeas em crescimento, que depositam mais gordura por quilo ganho que os machos.")
                TextoMetodo(titulo: "Peso equivalente",
                            corpo: "O peso e corrigido pelo grau de maturidade: peso de jejum x 462 / peso de acabamento em jejum. Novilhas mais precoces exigem mais energia por quilo de ganho no mesmo peso.")
                TextoMetodo(titulo: "NDT",
                            corpo: "A densidade da dieta e encontrada procurando o teor de NDT em que o consumo necessario iguala o consumo previsto. O NDT diario e o consumo de materia seca multiplicado por esse teor.")
            }

            Section("Proteina") {
                TextoMetodo(titulo: "Mantenca",
                            corpo: "PM de mantenca = 3,8 g por PCJ elevado a 0,75.")
                TextoMetodo(titulo: "Ganho",
                            corpo: "A proteina liquida por quilo de ganho cai conforme a energia retida sobe: 268 menos 29,4 vezes a energia retida por quilo de ganho. A eficiencia de uso da proteina metabolizavel vai de 0,834 menos 0,00114 vezes o peso equivalente, com piso de 0,492.")
                TextoMetodo(titulo: "Da PM para a PB",
                            corpo: "Considera 130 g de proteina microbiana por quilo de NDT, aproveitada em 64%. O que faltar vem de proteina nao degradavel no rumen, aproveitada em 80%. A soma das duas fracoes e a proteina bruta da dieta.")
                TextoMetodo(titulo: "Piso pratico",
                            corpo: "Quando a conta resulta em menos proteina que o minimo da fase (13% na desmama, 12% na recria inicial e 11% depois), o aplicativo usa o piso para nao comprometer o ambiente ruminal.")
            }

            Section("Racao e conversoes") {
                TextoMetodo(titulo: "Balanceamento",
                            corpo: "Com volumoso, energetico e proteico o aplicativo resolve um sistema de tres equacoes: materia seca total, proteina bruta e NDT. Quando a solucao fica fora dos limites de volumoso, o volumoso e fixado no limite e o concentrado atende a proteina, mostrando o saldo de energia.")
                TextoMetodo(titulo: "Materia natural",
                            corpo: "A quantidade a fornecer no cocho e a materia seca dividida pelo teor de materia seca do alimento.")
                TextoMetodo(titulo: "Sacas",
                            corpo: "O total em quilos e dividido pelo peso da embalagem cadastrada. Tamanhos de mercado disponiveis: 60, 50, 40, 30, 25 e 20 kg, alem de granel em toneladas. A linha de compra arredonda para cima.")
                TextoMetodo(titulo: "Periodos",
                            corpo: "O ciclo e dividido em periodos. Em cada um as exigencias sao recalculadas no peso medio do intervalo e a racao e refeita, por isso o consumo cresce ao longo do ciclo.")
            }

            Section {
                Text("Os coeficientes sao medias de populacao. Acompanhe pesagens reais e use o ajuste de consumo do lote para aproximar a previsao do que acontece no cocho.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Metodologia")
        .navigationBarTitleDisplayMode(.inline)
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
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}
