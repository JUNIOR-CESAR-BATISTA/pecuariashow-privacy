import SwiftUI

/// Cores do aplicativo.
enum Paleta {
    static let verde = Color(red: 0.20, green: 0.52, blue: 0.28)
    static let verdeClaro = Color(red: 0.60, green: 0.78, blue: 0.48)
    static let terra = Color(red: 0.62, green: 0.44, blue: 0.24)
    static let energia = Color(red: 0.92, green: 0.64, blue: 0.18)
    static let proteina = Color(red: 0.36, green: 0.50, blue: 0.82)
    static let mineral = Color(red: 0.55, green: 0.55, blue: 0.60)
    static let alerta = Color(red: 0.85, green: 0.42, blue: 0.20)

    static func cor(de categoria: CategoriaInsumo) -> Color {
        switch categoria {
        case .volumoso: return verde
        case .energetico: return energia
        case .proteico: return proteina
        case .mineral: return mineral
        }
    }
}

/// Cartão com um número em destaque.
struct CartaoIndicador: View {
    let titulo: String
    let valor: String
    var detalhe: String? = nil
    var simbolo: String = "chart.bar.fill"
    var cor: Color = Paleta.verde

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: simbolo)
                    .font(.caption)
                    .foregroundStyle(cor)
                Text(titulo)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Text(valor)
                .font(.title3.weight(.semibold))
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            if let detalhe {
                Text(detalhe)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
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
                .foregroundStyle(destaque ? .primary : .secondary)
                .font(destaque ? .body.weight(.medium) : .body)
            Spacer(minLength: 12)
            Text(valor)
                .font(.body.weight(destaque ? .semibold : .regular))
                .foregroundStyle(cor ?? .primary)
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
            Spacer(minLength: 8)
            TextField(titulo, value: $valor,
                      format: .number.precision(.fractionLength(0...casas)))
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 110)
            if !sufixo.isEmpty {
                Text(sufixo)
                    .foregroundStyle(.secondary)
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
            Spacer(minLength: 8)
            TextField(titulo, value: $valor, format: .number)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 110)
            if !sufixo.isEmpty {
                Text(sufixo)
                    .foregroundStyle(.secondary)
                    .frame(minWidth: 34, alignment: .leading)
            }
        }
    }
}

/// Faixa de aviso.
struct Aviso: View {
    let texto: String
    var simbolo: String = "exclamationmark.triangle.fill"
    var cor: Color = Paleta.alerta

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: simbolo)
                .foregroundStyle(cor)
                .font(.footnote)
            Text(texto)
                .font(.footnote)
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
        VStack(alignment: .leading, spacing: 8) {
            GeometryReader { geo in
                HStack(spacing: 1) {
                    ForEach(partes) { parte in
                        Rectangle()
                            .fill(parte.cor)
                            .frame(width: max(0, geo.size.width * parte.valor / total))
                    }
                }
            }
            .frame(height: 16)
            .clipShape(RoundedRectangle(cornerRadius: 4))

            LegendaComposicao(partes: partes, total: total)
        }
    }
}

/// Legenda em linhas para a barra de composição.
struct LegendaComposicao: View {
    let partes: [ParteComposicao]
    let total: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(partes) { parte in
                HStack(spacing: 6) {
                    Circle()
                        .fill(parte.cor)
                        .frame(width: 8, height: 8)
                    Text(parte.nome)
                        .font(.caption)
                        .lineLimit(1)
                    Spacer(minLength: 4)
                    Text(Formatadores.percentual(parte.valor / total * 100))
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
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
    var cor: Color = Paleta.verde

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
                .stroke(Color.secondary.opacity(0.18), lineWidth: 0.5)

                if posicoes.count > 1 {
                    Path { caminho in
                        caminho.move(to: CGPoint(x: 0, y: geo.size.height))
                        for posicao in posicoes { caminho.addLine(to: posicao) }
                        caminho.addLine(to: CGPoint(x: geo.size.width, y: geo.size.height))
                        caminho.closeSubpath()
                    }
                    .fill(cor.opacity(0.15))

                    Path { caminho in
                        caminho.move(to: posicoes[0])
                        for posicao in posicoes.dropFirst() { caminho.addLine(to: posicao) }
                    }
                    .stroke(cor, style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
                }

                ForEach(Array(posicoes.enumerated()), id: \.offset) { _, posicao in
                    Circle()
                        .fill(cor)
                        .frame(width: 5, height: 5)
                        .position(posicao)
                }
            }
        }
    }
}

/// Rótulo colorido pequeno.
struct Etiqueta: View {
    let texto: String
    var cor: Color = Paleta.verde

    var body: some View {
        Text(texto)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(cor.opacity(0.16), in: Capsule())
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
        VStack(spacing: 12) {
            Image(systemName: simbolo)
                .font(.system(size: 42))
                .foregroundStyle(Paleta.verde.opacity(0.7))
            Text(titulo)
                .font(.headline)
            Text(mensagem)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            if let textoBotao, let acao {
                Button(textoBotao, action: acao)
                    .buttonStyle(.borderedProminent)
                    .tint(Paleta.verde)
                    .padding(.top, 4)
            }
        }
        .padding(28)
        .frame(maxWidth: .infinity)
    }
}
