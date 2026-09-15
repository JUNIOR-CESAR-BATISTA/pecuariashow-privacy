import SwiftUI
import UIKit

/// Cartão com um número em destaque.
struct CartaoIndicador: View {
    let titulo: String
    let valor: String
    var detalhe: String? = nil
    var simbolo: String = "chart.bar.fill"
    var cor: Color = Tema.ouro

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: simbolo)
                    .font(.caption)
                    .foregroundStyle(cor)
                    .frame(width: 26, height: 26)
                    .background(cor.opacity(0.14), in: RoundedRectangle(cornerRadius: 8))
                Text(titulo)
                    .font(.caption)
                    .foregroundStyle(Tema.textoSuave)
                    .lineLimit(1)
            }
            Text(valor)
                .font(.title3.weight(.bold))
                .foregroundStyle(Tema.texto)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            if let detalhe {
                Text(detalhe)
                    .font(.caption2)
                    .foregroundStyle(Tema.textoTenue)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cartao(espacamento: 14, raio: Tema.raioPequeno)
    }
}

/// Linha de rótulo e valor dentro de uma seção.
struct LinhaDado: View {
    let rotulo: String
    let valor: String
    var destaque: Bool = false
    var cor: Color? = nil

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(rotulo)
                .font(destaque ? .subheadline.weight(.semibold) : .subheadline)
                .foregroundStyle(destaque ? Tema.texto : Tema.textoSuave)
            Spacer(minLength: 12)
            Text(valor)
                .font(.subheadline.weight(destaque ? .bold : .semibold))
                .foregroundStyle(cor ?? Tema.texto)
                .multilineTextAlignment(.trailing)
        }
    }
}

/// Campo de entrada numérica com teclado decimal.
struct CampoNumerico: View {
    let titulo: String
    @Binding var valor: Double
    var casas: Int = 2
    var sufixo: String = ""

    var body: some View {
        HStack {
            Text(titulo)
                .foregroundStyle(Tema.texto)
            Spacer(minLength: 8)
            TextField(titulo, value: $valor,
                      format: .number.precision(.fractionLength(0...casas)))
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .foregroundStyle(Tema.ouro)
                .font(.body.weight(.semibold))
                .frame(maxWidth: 110)
            if !sufixo.isEmpty {
                Text(sufixo)
                    .foregroundStyle(Tema.textoSuave)
                    .frame(minWidth: 34, alignment: .leading)
            }
        }
    }
}

/// Campo de entrada de números inteiros.
struct CampoInteiro: View {
    let titulo: String
    @Binding var valor: Int
    var sufixo: String = ""

    var body: some View {
        HStack {
            Text(titulo)
                .foregroundStyle(Tema.texto)
            Spacer(minLength: 8)
            TextField(titulo, value: $valor, format: .number)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
                .foregroundStyle(Tema.ouro)
                .font(.body.weight(.semibold))
                .frame(maxWidth: 110)
            if !sufixo.isEmpty {
                Text(sufixo)
                    .foregroundStyle(Tema.textoSuave)
                    .frame(minWidth: 34, alignment: .leading)
            }
        }
    }
}

/// Faixa de aviso.
struct Aviso: View {
    let texto: String
    var simbolo: String = "exclamationmark.triangle.fill"
    var cor: Color = Tema.laranja

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: simbolo)
                .foregroundStyle(cor)
                .font(.footnote)
            Text(texto)
                .font(.footnote)
                .foregroundStyle(Tema.textoSuave)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Fatia da barra de composição.
struct ParteComposicao: Identifiable {
    var id: UUID
    var nome: String
    var valor: Double
    var cor: Color
}

/// Barra proporcional que mostra a participação de cada alimento na matéria seca.
struct BarraComposicao: View {
    let partes: [ParteComposicao]

    private var total: Double {
        max(partes.reduce(0) { $0 + $1.valor }, 0.0001)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            GeometryReader { geo in
                HStack(spacing: 2) {
                    ForEach(partes) { parte in
                        Rectangle()
                            .fill(parte.cor)
                            .frame(width: max(0, geo.size.width * parte.valor / total))
                    }
                }
            }
            .frame(height: 14)
            .clipShape(Capsule())

            LegendaComposicao(partes: partes, total: total)
        }
    }
}

/// Legenda em linhas para a barra de composição.
struct LegendaComposicao: View {
    let partes: [ParteComposicao]
    let total: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(partes) { parte in
                HStack(spacing: 8) {
                    Circle()
                        .fill(parte.cor)
                        .frame(width: 8, height: 8)
                    Text(parte.nome)
                        .font(.caption)
                        .foregroundStyle(Tema.textoSuave)
                        .lineLimit(1)
                    Spacer(minLength: 4)
                    Text(Formatadores.percentual(parte.valor / total * 100))
                        .font(.caption.weight(.semibold).monospacedDigit())
                        .foregroundStyle(Tema.texto)
                }
            }
        }
    }
}

/// Ponto do gráfico de evolução de peso.
struct PontoGrafico: Hashable {
    var dia: Double
    var peso: Double
}

/// Gráfico simples de evolução de peso ao longo dos períodos.
struct GraficoEvolucao: View {
    let pontos: [PontoGrafico]
    var cor: Color = Tema.ouro

    private func posicoes(em tamanho: CGSize) -> [CGPoint] {
        guard !pontos.isEmpty else { return [] }
        let dias = pontos.map { $0.dia }
        let pesos = pontos.map { $0.peso }
        let minX = dias.min() ?? 0
        let maxX = dias.max() ?? 1
        let minY = (pesos.min() ?? 0) * 0.97
        let maxY = (pesos.max() ?? 1) * 1.02
        let faixaX = max(maxX - minX, 0.0001)
        let faixaY = max(maxY - minY, 0.0001)
        return pontos.map { ponto in
            CGPoint(x: (ponto.dia - minX) / faixaX * tamanho.width,
                    y: tamanho.height - (ponto.peso - minY) / faixaY * tamanho.height)
        }
    }

    var body: some View {
        GeometryReader { geo in
            let posicoes = posicoes(em: geo.size)
            ZStack {
                Path { caminho in
                    for i in 0...3 {
                        let y = geo.size.height * Double(i) / 3
                        caminho.move(to: CGPoint(x: 0, y: y))
                        caminho.addLine(to: CGPoint(x: geo.size.width, y: y))
                    }
                }
                .stroke(Tema.borda, lineWidth: 1)

                if posicoes.count > 1 {
                    Path { caminho in
                        caminho.move(to: CGPoint(x: 0, y: geo.size.height))
                        for posicao in posicoes { caminho.addLine(to: posicao) }
                        caminho.addLine(to: CGPoint(x: geo.size.width, y: geo.size.height))
                        caminho.closeSubpath()
                    }
                    .fill(LinearGradient(colors: [cor.opacity(0.28), cor.opacity(0.02)],
                                         startPoint: .top, endPoint: .bottom))

                    Path { caminho in
                        caminho.move(to: posicoes[0])
                        for posicao in posicoes.dropFirst() { caminho.addLine(to: posicao) }
                    }
                    .stroke(cor, style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
                }

                ForEach(Array(posicoes.enumerated()), id: \.offset) { _, posicao in
                    Circle()
                        .fill(Tema.fundo)
                        .overlay(Circle().stroke(cor, lineWidth: 2))
                        .frame(width: 7, height: 7)
                        .position(posicao)
                }
            }
        }
    }
}

/// Rótulo colorido pequeno.
struct Etiqueta: View {
    let texto: String
    var cor: Color = Tema.ouro

    var body: some View {
        Text(texto)
            .font(.caption2.weight(.bold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(cor.opacity(0.14), in: Capsule())
            .overlay(Capsule().stroke(cor.opacity(0.35), lineWidth: 1))
            .foregroundStyle(cor)
    }
}

/// Estado vazio com ação sugerida.
struct EstadoVazio: View {
    let simbolo: String
    let titulo: String
    let mensagem: String
    var textoBotao: String? = nil
    var acao: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: 14) {
            Circle()
                .fill(Tema.ouro.opacity(0.10))
                .overlay(Circle().stroke(Tema.ouro.opacity(0.45), lineWidth: 1))
                .frame(width: 74, height: 74)
                .overlay(
                    Image(systemName: simbolo)
                        .font(.system(size: 28, weight: .regular))
                        .foregroundStyle(Tema.ouro)
                )
            Text(titulo)
                .font(.headline.bold())
                .foregroundStyle(Tema.texto)
                .multilineTextAlignment(.center)
            Text(mensagem)
                .font(.subheadline)
                .foregroundStyle(Tema.textoSuave)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            if let textoBotao, let acao {
                Button(action: acao) {
                    Text(textoBotao)
                        .font(.subheadline.bold())
                        .foregroundStyle(Tema.fundo)
                        .padding(.horizontal, 22)
                        .padding(.vertical, 12)
                        .background(Tema.ouro, in: Capsule())
                }
                .buttonStyle(.plain)
                .padding(.top, 2)
            }
        }
        .padding(28)
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Compartilhamento

/// Embrulho identificável do que vai ser compartilhado.
///
/// O `.sheet(item:)` só abre quando recebe algo identificável, e é ele que
/// garante que a folha use o conteúdo montado no toque, não um de antes.
private struct ConteudoCompartilhado: Identifiable {
    let id = UUID()
    let itens: [Any]
}

/// A folha de compartilhamento do sistema.
///
/// O `ShareLink` do SwiftUI é mais enxuto e era o que estava aqui, mas dentro
/// de uma `NavigationStack` que é trocada por aba ele nem sempre chega a
/// apresentar a folha. Este caminho, pelo `UIActivityViewController`, é o que
/// o sistema usa há anos e não depende de onde a tela está na hierarquia.
struct FolhaCompartilhar: UIViewControllerRepresentable {
    let itens: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: itens, applicationActivities: nil)
    }

    func updateUIViewController(_ controlador: UIActivityViewController, context: Context) {}
}

/// Botão que abre a folha de compartilhamento com o que a closure devolver.
///
/// O conteúdo é montado só no toque: o relatório é um texto longo e não há
/// motivo para gerá-lo de novo a cada redesenho da tela.
struct BotaoCompartilhar<Rotulo: View>: View {
    let itens: () -> [Any]
    @ViewBuilder let rotulo: () -> Rotulo

    @State private var conteudo: ConteudoCompartilhado?

    var body: some View {
        Button {
            conteudo = ConteudoCompartilhado(itens: itens())
        } label: {
            rotulo()
        }
        .sheet(item: $conteudo) { pronto in
            FolhaCompartilhar(itens: pronto.itens)
        }
    }
}
