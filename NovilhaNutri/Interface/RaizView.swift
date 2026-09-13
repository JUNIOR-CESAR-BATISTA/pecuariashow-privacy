import SwiftUI

/// Abas principais do aplicativo.
enum Aba: String, CaseIterable, Identifiable, Hashable {
    case inicio
    case rebanho
    case racao
    case relatorios
    case insumos
    case analise

    var id: String { rawValue }

    var titulo: String {
        switch self {
        case .inicio: return "Início"
        case .rebanho: return "Rebanho"
        case .racao: return "Ração"
        case .relatorios: return "Abate"
        case .insumos: return "Insumos"
        case .analise: return "Análise"
        }
    }

    var simbolo: String {
        switch self {
        case .inicio: return "house.fill"
        case .rebanho: return "list.bullet.rectangle.fill"
        case .racao: return "chart.pie.fill"
        case .relatorios: return "doc.text.fill"
        case .insumos: return "shippingbox.fill"
        case .analise: return "chart.bar.fill"
        }
    }
}

struct RaizView: View {
    @EnvironmentObject private var estado: AppEstado
    @State private var aba: Aba = .inicio

    var body: some View {
        ZStack {
            Tema.fundo.ignoresSafeArea()

            Group {
                switch aba {
                case .inicio:
                    NavigationStack { InicioView(aba: $aba) }
                case .rebanho:
                    NavigationStack { RebanhoView() }
                case .racao:
                    NavigationStack { ResumoView() }
                case .relatorios:
                    NavigationStack { RelatorioView() }
                case .insumos:
                    NavigationStack { InsumosView() }
                case .analise:
                    NavigationStack { AnaliseView(aba: $aba) }
                }
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            BarraNavegacao(selecionada: $aba)
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

/// Barra inferior com a aba ativa em destaque dourado.
struct BarraNavegacao: View {
    @Binding var selecionada: Aba

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Aba.allCases) { aba in
                Button {
                    selecionada = aba
                } label: {
                    ItemBarra(aba: aba, ativa: aba == selecionada)
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.top, 10)
        .padding(.bottom, 6)
        .padding(.horizontal, 2)
        .background(
            Tema.superficie
                .overlay(alignment: .top) {
                    Rectangle().fill(Tema.borda).frame(height: 1)
                }
                .ignoresSafeArea(edges: .bottom)
        )
    }
}

/// Um item da barra inferior.
struct ItemBarra: View {
    let aba: Aba
    let ativa: Bool

    var body: some View {
        VStack(spacing: 5) {
            RoundedRectangle(cornerRadius: 11, style: .continuous)
                .fill(ativa ? Tema.ouro : Color.clear)
                .frame(width: 42, height: 30)
                .overlay(
                    Image(systemName: aba.simbolo)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(ativa ? Tema.fundo : Tema.textoSuave)
                )
            Text(aba.titulo)
                .font(.system(size: 10, weight: ativa ? .bold : .medium))
                .foregroundStyle(ativa ? Tema.ouro : Tema.textoSuave)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
        .contentShape(Rectangle())
    }
}

/// Mensagem padrão quando ainda não existe lote cadastrado.
struct SemLoteView: View {
    @EnvironmentObject private var estado: AppEstado

    var body: some View {
        ScrollView {
            EstadoVazio(simbolo: "tray",
                        titulo: "Nenhum lote por aqui ainda",
                        mensagem: "Cadastre um lote de novilhas na aba Rebanho para ver as exigências e os relatórios.",
                        textoBotao: "Criar lote de exemplo") {
                estado.criarLoteExemplo()
            }
            .cartao()
            .padding(16)
        }
        .fundoTela()
    }
}

/// Botão de troca de lote usado nas telas que dependem de um lote ativo.
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
                Image(systemName: "arrow.left.arrow.right.circle")
                    .foregroundStyle(Tema.ouro)
            }
        }
    }
}
