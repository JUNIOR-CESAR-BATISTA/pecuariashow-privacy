import SwiftUI

/// Telas apresentadas em folha a partir do rebanho.
enum FolhaRebanho: Identifiable {
    case editar(Lote)
    case novo(Lote)
    case encerrar(Lote)

    var id: String {
        switch self {
        case .editar(let lote): return "editar-" + lote.id.uuidString
        case .novo: return "novo"
        case .encerrar(let lote): return "encerrar-" + lote.id.uuidString
        }
    }
}

/// Lista dos lotes cadastrados.
struct RebanhoView: View {
    @EnvironmentObject private var estado: AppEstado
    @State private var folha: FolhaRebanho?

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
                    .cartao()
                    .padding(16)
                }
                .fundoTela()
            } else {
                lista
            }
        }
        .navigationTitle("Rebanho")
        .barraEscura()
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    folha = .novo(estado.novoLote())
                } label: {
                    Image(systemName: "plus")
                        .foregroundStyle(Tema.ouro)
                }
            }
        }
        // Pela área segura, e não por overlay: o overlay punha o botão por
        // baixo da barra de abas.
        .safeAreaInset(edge: .bottom, alignment: .trailing, spacing: 0) {
            if !estado.lotes.isEmpty {
                BotaoFlutuante(titulo: "Novo lote") { folha = .novo(estado.novoLote()) }
                    .padding(.trailing, 18)
                    .padding(.bottom, 12)
            }
        }
        .sheet(item: $folha) { qual in
            switch qual {
            case .editar(let lote):
                LoteEditorView(lote: lote, novo: false)
            case .novo(let lote):
                LoteEditorView(lote: lote, novo: true)
            case .encerrar(let lote):
                EncerrarCicloView(lote: lote)
            }
        }
    }

    private var lista: some View {
        List {
            Section {
                ForEach(estado.lotes) { lote in
                    Button {
                        estado.loteSelecionadoID = lote.id
                        folha = .editar(lote)
                    } label: {
                        CartaoLote(lote: lote,
                                   selecionado: lote.id == estado.loteSelecionado?.id)
                    }
                    .buttonStyle(.plain)
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            estado.remover(loteID: lote.id)
                        } label: {
                            Label("Excluir", systemImage: "trash")
                        }
                    }
                    .swipeActions(edge: .leading) {
                        Button {
                            folha = .encerrar(lote)
                        } label: {
                            Label("Encerrar", systemImage: "flag.checkered")
                        }
                        .tint(Tema.verde)
                    }
                }
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 5, leading: 16, bottom: 5, trailing: 16))
            } header: {
                Text("\(estado.lotes.count) lote\(estado.lotes.count == 1 ? "" : "s")")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Tema.textoSuave)
            }

            Section {
                VStack(spacing: 10) {
                    LinhaDado(rotulo: "Animais",
                              valor: "\(estado.lotes.reduce(0) { $0 + $1.quantidadeAnimais })")
                    LinhaDado(rotulo: "Peso vivo total",
                              valor: Formatadores.kg(estado.lotes.reduce(0) { $0 + $1.pesoTotalLote }))
                    LinhaDado(rotulo: "Arrobas no peso atual",
                              valor: Formatadores.arroba(estado.lotes.reduce(0) {
                                  $0 + $1.arrobasAtuais * Double($1.quantidadeAnimais)
                              }),
                              destaque: true)
                }
                .cartao()
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 5, leading: 16, bottom: 5, trailing: 16))
            } header: {
                Text("Rebanho total")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Tema.textoSuave)
            } footer: {
                Text("Toque em um lote para editar. Deslize para a direita para encerrar o ciclo depois do abate, ou para a esquerda para excluir.")
                    .font(.caption2)
                    .foregroundStyle(Tema.textoTenue)
                    .padding(.bottom, 90)
            }
        }
        .listStyle(.plain)
        .listaEscura()
    }
}

/// Cartão de um lote na lista do rebanho.
struct CartaoLote: View {
    let lote: Lote
    var selecionado: Bool

    private var progresso: Double {
        let total = lote.pesoAlvoAbate - lote.pesoMedioInicial
        guard total > 0 else { return 1 }
        return min(max((lote.pesoAtual - lote.pesoMedioInicial) / total, 0), 1)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Text(lote.nome.isEmpty ? "Lote sem nome" : lote.nome)
                    .font(.headline.bold())
                    .foregroundStyle(Tema.texto)
                    .lineLimit(1)
                if selecionado {
                    Image(systemName: "star.fill")
                        .font(.caption2)
                        .foregroundStyle(Tema.ouro)
                }
                Spacer(minLength: 6)
                if lote.estaPronto {
                    Etiqueta(texto: "Pronto para abate", cor: Tema.laranja)
                } else {
                    Etiqueta(texto: lote.fase.nome, cor: Tema.verdeClaro)
                }
            }

            HStack(spacing: 16) {
                Label("\(lote.quantidadeAnimais)", systemImage: "hare.fill")
                Label(Formatadores.kg(lote.pesoAtual), systemImage: "scalemass.fill")
                Label("\(Formatadores.numero(lote.ganhoMetaDiario, casas: 3)) kg/d",
                      systemImage: "arrow.up.right")
            }
            .font(.caption)
            .foregroundStyle(Tema.textoSuave)

            VStack(alignment: .leading, spacing: 6) {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Tema.superficieAlta)
                        Capsule()
                            .fill(lote.estaPronto ? Tema.laranja : Tema.verdeClaro)
                            .frame(width: max(6, geo.size.width * progresso))
                    }
                }
                .frame(height: 8)
                HStack {
                    Text("\(Formatadores.numero(lote.pesoMedioInicial, casas: 0)) kg")
                    Spacer()
                    Text("meta \(Formatadores.numero(lote.pesoAlvoAbate, casas: 0)) kg")
                }
                .font(.caption2)
                .foregroundStyle(Tema.textoTenue)
            }
        }
        .cartao()
        .contentShape(Rectangle())
    }
}
