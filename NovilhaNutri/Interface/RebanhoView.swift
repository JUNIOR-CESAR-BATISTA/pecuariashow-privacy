import SwiftUI

/// Lista dos lotes cadastrados.
struct RebanhoView: View {
    @EnvironmentObject private var estado: AppEstado
    @State private var loteEmEdicao: Lote?
    @State private var criandoLote = false

    var body: some View {
        Group {
            if estado.lotes.isEmpty {
                ScrollView {
                    EstadoVazio(simbolo: "hare",
                                titulo: "Comece pelo rebanho",
                                mensagem: "Cadastre o lote de novilhas com peso de entrada, meta de ganho e fase. O aplicativo calcula as exigências de PB e NDT e monta a ração.",
                                textoBotao: "Criar lote de exemplo") {
                        estado.criarLoteExemplo()
                    }
                }
            } else {
                List {
                    Section {
                        ForEach(estado.lotes) { lote in
                            Button {
                                estado.loteSelecionadoID = lote.id
                                loteEmEdicao = lote
                            } label: {
                                LinhaLote(lote: lote,
                                          selecionado: lote.id == estado.loteSelecionado?.id)
                            }
                            .buttonStyle(.plain)
                        }
                        .onDelete { estado.removerLotes(em: $0) }
                    } header: {
                        Text("\(estado.lotes.count) lote\(estado.lotes.count == 1 ? "" : "s")")
                    } footer: {
                        Text("Toque em um lote para editar. Deslize para a esquerda para excluir.")
                    }

                    Section("Rebanho total") {
                        LinhaDado(rotulo: "Animais",
                                  valor: "\(estado.lotes.reduce(0) { $0 + $1.quantidadeAnimais })")
                        LinhaDado(rotulo: "Peso vivo total",
                                  valor: Formatadores.kg(estado.lotes.reduce(0) { $0 + $1.pesoTotalLote }))
                        LinhaDado(rotulo: "Arrobas no peso atual",
                                  valor: Formatadores.arroba(estado.lotes.reduce(0) {
                                      $0 + $1.arrobasAtuais * Double($1.quantidadeAnimais)
                                  }))
                    }
                }
            }
        }
        .navigationTitle("Rebanho")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    criandoLote = true
                } label: {
                    Label("Novo lote", systemImage: "plus")
                }
            }
        }
        .sheet(item: $loteEmEdicao) { lote in
            LoteEditorView(lote: lote, novo: false)
        }
        .sheet(isPresented: $criandoLote) {
            LoteEditorView(lote: estado.novoLote(), novo: true)
        }
    }
}

/// Linha da lista de lotes.
struct LinhaLote: View {
    let lote: Lote
    var selecionado: Bool

    private var progresso: Double {
        let total = lote.pesoAlvoAbate - lote.pesoMedioInicial
        guard total > 0 else { return 1 }
        return min(max((lote.pesoAtual - lote.pesoMedioInicial) / total, 0), 1)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(lote.nome.isEmpty ? "Lote sem nome" : lote.nome)
                    .font(.headline)
                if selecionado {
                    Image(systemName: "star.fill")
                        .font(.caption2)
                        .foregroundStyle(Paleta.energia)
                }
                Spacer()
                if lote.estaPronto {
                    Etiqueta(texto: "Pronto para abate", cor: Paleta.terra)
                } else {
                    Etiqueta(texto: lote.fase.nome, cor: Paleta.verde)
                }
            }

            HStack(spacing: 14) {
                Label("\(lote.quantidadeAnimais)", systemImage: "hare.fill")
                Label(Formatadores.kg(lote.pesoAtual), systemImage: "scalemass.fill")
                Label("\(Formatadores.numero(lote.ganhoMetaDiario, casas: 3)) kg/dia",
                      systemImage: "arrow.up.right")
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            ProgressView(value: progresso)
                .tint(Paleta.verde)
            HStack {
                Text("\(Formatadores.numero(lote.pesoMedioInicial, casas: 0)) kg")
                Spacer()
                Text("meta \(Formatadores.numero(lote.pesoAlvoAbate, casas: 0)) kg")
            }
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }
}
