import SwiftUI

struct RaizView: View {
    @EnvironmentObject private var estado: AppEstado

    var body: some View {
        TabView {
            NavigationStack { RebanhoView() }
                .tabItem { Label("Rebanho", systemImage: "list.bullet.rectangle") }

            NavigationStack { ResumoView() }
                .tabItem { Label("Resumo", systemImage: "chart.pie.fill") }

            NavigationStack { InsumosView() }
                .tabItem { Label("Insumos", systemImage: "shippingbox.fill") }

            NavigationStack { RelatorioView() }
                .tabItem { Label("Relatorios", systemImage: "doc.text.fill") }

            NavigationStack { DadosView() }
                .tabItem { Label("Dados", systemImage: "lock.shield.fill") }
        }
        .alert("Aviso",
               isPresented: Binding(get: { estado.mensagemErro != nil },
                                    set: { if !$0 { estado.mensagemErro = nil } })) {
            Button("Entendi", role: .cancel) { estado.mensagemErro = nil }
        } message: {
            Text(estado.mensagemErro ?? "")
        }
    }
}

/// Botao de troca de lote usado nas telas que dependem de um lote ativo.
struct SeletorLoteBotao: View {
    @EnvironmentObject private var estado: AppEstado

    var body: some View {
        if estado.lotes.count > 1 {
            Menu {
                ForEach(estado.lotes) { lote in
                    Button {
                        estado.loteSelecionadoID = lote.id
                    } label: {
                        if lote.id == estado.loteSelecionado?.id {
                            Label(lote.nome, systemImage: "checkmark")
                        } else {
                            Text(lote.nome)
                        }
                    }
                }
            } label: {
                Label("Trocar lote", systemImage: "arrow.left.arrow.right.circle")
            }
        }
    }
}

/// Mensagem padrao quando ainda nao existe lote cadastrado.
struct SemLoteView: View {
    @EnvironmentObject private var estado: AppEstado

    var body: some View {
        EstadoVazio(simbolo: "hare",
                    titulo: "Nenhum lote cadastrado",
                    mensagem: "Cadastre um lote de novilhas na aba Rebanho para ver as exigencias e os relatorios.",
                    textoBotao: "Criar lote de exemplo") {
            estado.criarLoteExemplo()
        }
    }
}
