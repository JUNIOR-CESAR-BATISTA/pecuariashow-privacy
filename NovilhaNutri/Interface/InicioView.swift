import SwiftUI

/// Telas apresentadas em folha a partir do início.
enum FolhaInicio: String, Identifiable {
    case novoLote
    case conversor

    var id: String { rawValue }
}

/// Painel inicial: atalhos, situação do lote ativo e acesso rápido.
struct InicioView: View {
    @EnvironmentObject private var estado: AppEstado
    @Binding var aba: Aba

    @State private var folha: FolhaInicio?

    private let colunasCategorias = Array(repeating: GridItem(.flexible(), spacing: 10), count: 4)

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 26) {
                cabecalho
                faixaResumo
                categorias
                acoesRapidas
                destaque
                acessoRapido
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .fundoTela()
        .toolbar(.hidden, for: .navigationBar)
        // Aqui não pode ser .overlay: o overlay se alinha pela moldura da
        // rolagem, que vai até a borda de baixo da tela, por baixo da barra de
        // abas - e o botão ficava escondido atrás dela. O safeAreaInset se
        // alinha pela área segura, que já desconta a barra, e ainda reserva o
        // espaço para o conteúdo não passar por trás do botão.
        .safeAreaInset(edge: .bottom, alignment: .trailing, spacing: 0) {
            BotaoFlutuante(titulo: "Novo lote") { folha = .novoLote }
                .padding(.trailing, 18)
                .padding(.bottom, 12)
        }
        // Tampa o vão do relógio e da bateria. Sem barra de navegação, o
        // conteúdo rolava por baixo do status e os textos se sobrepunham.
        .overlay(alignment: .top) {
            Tema.fundo
                .frame(height: 0)
                .ignoresSafeArea(edges: .top)
        }
        .sheet(item: $folha) { qual in
            switch qual {
            case .novoLote:
                LoteEditorView(lote: estado.novoLote(), novo: true)
            case .conversor:
                ConversorView()
            }
        }
    }

    // MARK: - Cabeçalho

    private var cabecalho: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Tema.ouro.opacity(0.12))
                .overlay(Circle().stroke(Tema.ouro.opacity(0.55), lineWidth: 1))
                .frame(width: 48, height: 48)
                .overlay(
                    Image(systemName: "leaf.fill")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(Tema.ouro)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(Tema.saudacao())
                    .font(.subheadline)
                    .foregroundStyle(Tema.textoSuave)
                Text("NovilhaNutri")
                    .font(.title.bold())
                    .foregroundStyle(Tema.texto)
            }

            Spacer(minLength: 4)

            BotaoCircular(simbolo: "chart.line.uptrend.xyaxis") { aba = .relatorios }

            NavigationLink {
                DadosView()
            } label: {
                CirculoIcone(simbolo: "lock.shield")
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Faixa do lote ativo

    @ViewBuilder
    private var faixaResumo: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(estado.loteSelecionado == nil ? Tema.textoTenue : Tema.verdeClaro)
                .frame(width: 7, height: 7)
            Text(estado.loteSelecionado == nil ? "SEM LOTE" : "LOTE ATIVO")
                .font(.caption2.weight(.bold))
                .kerning(1.2)
                .foregroundStyle(Tema.textoSuave)

            Rectangle()
                .fill(Tema.borda)
                .frame(width: 1, height: 18)

            if let lote = estado.loteSelecionado {
                let exigencia = estado.exigencia(para: lote)
                Text("🐄")
                Text(lote.nome)
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(Tema.textoSuave)
                    .lineLimit(1)
                Text(Formatadores.kg(exigencia.consumoMateriaSeca) + " MS")
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(Tema.ouro)
                Spacer(minLength: 0)
                Image(systemName: "arrow.up.right")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Tema.verdeClaro)
                Text(Formatadores.numero(lote.ganhoMetaDiario, casas: 3) + " kg/d")
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(Tema.verdeClaro)
            } else {
                Text("Cadastre o primeiro lote para começar")
                    .font(.footnote)
                    .foregroundStyle(Tema.textoSuave)
                Spacer(minLength: 0)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Tema.superficie, in: RoundedRectangle(cornerRadius: Tema.raioPequeno, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Tema.raioPequeno, style: .continuous)
                .stroke(Tema.borda, lineWidth: 1)
        )
    }

    // MARK: - Categorias

    private var categorias: some View {
        VStack(alignment: .leading, spacing: 14) {
            TituloSecao(texto: "Categorias")
            LazyVGrid(columns: colunasCategorias, spacing: 10) {
                CartaoCategoria(emoji: "🐄", titulo: "Rebanho") { aba = .rebanho }
                CartaoCategoria(emoji: "🌾", titulo: "Ração") { aba = .racao }
                CartaoCategoria(emoji: "📦", titulo: "Insumos") { aba = .insumos }
                CartaoCategoria(emoji: "📊", titulo: "Abate") { aba = .relatorios }
            }
        }
    }

    // MARK: - Ações rápidas

    private var acoesRapidas: some View {
        VStack(alignment: .leading, spacing: 14) {
            TituloSecao(texto: "Ações rápidas")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    Chip(texto: "Novo lote", simbolo: "plus") { folha = .novoLote }
                    Chip(texto: "Conversor de sacas", simbolo: "arrow.left.arrow.right") {
                        folha = .conversor
                    }
                    Chip(texto: "Cadastrar insumo", simbolo: "shippingbox") { aba = .insumos }
                    Chip(texto: "Planejar abate", simbolo: "flag.checkered") { aba = .relatorios }
                    Chip(texto: "Análise do histórico", simbolo: "chart.bar") { aba = .analise }
                }
                .padding(.horizontal, 2)
                .padding(.vertical, 2)
            }
        }
    }

    // MARK: - Lote em destaque

    @ViewBuilder
    private var destaque: some View {
        VStack(alignment: .leading, spacing: 14) {
            if estado.lotes.isEmpty {
                TituloSecao(texto: "Em destaque")
            } else {
                TituloSecao(texto: "Em destaque",
                            textoAcao: "Ver todos",
                            acao: { aba = .rebanho })
            }

            if let lote = estado.loteSelecionado {
                CartaoLoteDestaque(lote: lote,
                                   exigencia: estado.exigencia(para: lote)) {
                    aba = .racao
                }
            } else {
                EstadoVazio(simbolo: "tray",
                            titulo: "Nenhum lote por aqui ainda",
                            mensagem: "Cadastre o primeiro lote de novilhas e o aplicativo calcula PB, NDT e a ração diária.",
                            textoBotao: "Criar lote de exemplo") {
                    estado.criarLoteExemplo()
                }
                .cartao()
            }
        }
    }

    // MARK: - Acesso rápido

    private var acessoRapido: some View {
        VStack(alignment: .leading, spacing: 14) {
            TituloSecao(texto: "Acesso rápido")
            VStack(spacing: 10) {
                NavigationLink {
                    MetodologiaView()
                } label: {
                    LinhaAtalho(simbolo: "function",
                                titulo: "Como os cálculos são feitos",
                                detalhe: "Equações de PB, NDT e formulação")
                }
                .buttonStyle(.plain)

                NavigationLink {
                    DadosView()
                } label: {
                    LinhaAtalho(simbolo: "lock.shield.fill",
                                titulo: "Dados e privacidade",
                                detalhe: "Tudo gravado só neste aparelho")
                }
                .buttonStyle(.plain)

                Button {
                    folha = .conversor
                } label: {
                    LinhaAtalho(simbolo: "arrow.left.arrow.right",
                                titulo: "Conversor de quilos e sacas",
                                detalhe: "60, 50, 40, 30, 25 e 20 kg")
                }
                .buttonStyle(.plain)
            }
        }
    }
}

/// Bloco quadrado de categoria com emoji.
struct CartaoCategoria: View {
    let emoji: String
    let titulo: String
    var acao: () -> Void

    var body: some View {
        Button(action: acao) {
            VStack(spacing: 8) {
                Text(emoji)
                    .font(.system(size: 30))
                Text(titulo)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Tema.texto)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Tema.superficie, in: RoundedRectangle(cornerRadius: Tema.raioPequeno, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Tema.raioPequeno, style: .continuous)
                    .stroke(Tema.borda, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

/// Linha de atalho com ícone, título e descrição.
struct LinhaAtalho: View {
    let simbolo: String
    let titulo: String
    let detalhe: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: simbolo)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Tema.ouro)
                .frame(width: 38, height: 38)
                .background(Tema.ouro.opacity(0.12), in: RoundedRectangle(cornerRadius: 11))
            VStack(alignment: .leading, spacing: 2) {
                Text(titulo)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Tema.texto)
                Text(detalhe)
                    .font(.caption)
                    .foregroundStyle(Tema.textoSuave)
                    .lineLimit(1)
            }
            Spacer(minLength: 4)
            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Tema.textoTenue)
        }
        .cartao(espacamento: 12, raio: Tema.raioPequeno)
        .contentShape(Rectangle())
    }
}

/// Cartão de resumo do lote ativo.
struct CartaoLoteDestaque: View {
    let lote: Lote
    let exigencia: ExigenciaDiaria
    var acao: () -> Void

    private var progresso: Double {
        let total = lote.pesoAlvoAbate - lote.pesoMedioInicial
        guard total > 0 else { return 1 }
        return min(max((lote.pesoAtual - lote.pesoMedioInicial) / total, 0), 1)
    }

    var body: some View {
        Button(action: acao) {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text(lote.nome)
                        .font(.headline.bold())
                        .foregroundStyle(Tema.texto)
                        .lineLimit(1)
                    Spacer(minLength: 8)
                    Etiqueta(texto: lote.fase.nome)
                }

                HStack(spacing: 18) {
                    MiniIndicador(titulo: "PB",
                                  valor: Formatadores.gramas(exigencia.proteinaBrutaGramas),
                                  cor: Tema.azul)
                    MiniIndicador(titulo: "NDT",
                                  valor: Formatadores.kg(exigencia.ndtKg),
                                  cor: Tema.ouro)
                    MiniIndicador(titulo: "Matéria seca",
                                  valor: Formatadores.kg(exigencia.consumoMateriaSeca),
                                  cor: Tema.verdeClaro)
                }

                VStack(alignment: .leading, spacing: 6) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Tema.superficieAlta)
                            Capsule()
                                .fill(Tema.verdeClaro)
                                .frame(width: max(6, geo.size.width * progresso))
                        }
                    }
                    .frame(height: 8)
                    HStack {
                        Text("\(Formatadores.numero(lote.pesoAtual, casas: 0)) kg hoje")
                        Spacer()
                        Text("faltam \(Formatadores.numero(lote.ganhoRestante, casas: 0)) kg")
                    }
                    .font(.caption)
                    .foregroundStyle(Tema.textoSuave)
                }
            }
            .cartao()
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// Número pequeno com rótulo, usado dentro de cartões.
struct MiniIndicador: View {
    let titulo: String
    let valor: String
    var cor: Color = Tema.ouro

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(titulo)
                .font(.caption2)
                .foregroundStyle(Tema.textoSuave)
                .lineLimit(1)
            Text(valor)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(cor)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
