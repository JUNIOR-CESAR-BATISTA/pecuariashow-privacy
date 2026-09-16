import SwiftUI

extension Color {
    /// Cor a partir de um hexadecimal no formato 0xRRGGBB.
    init(hex: UInt32) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255,
                  opacity: 1)
    }
}

/// Identidade visual do aplicativo: verde escuro de fundo, dourado de destaque
/// e cartões arredondados com borda discreta.
enum Tema {
    // Superfícies
    static let fundo = Color(hex: 0x0F1A13)
    static let superficie = Color(hex: 0x18271C)
    static let superficieAlta = Color(hex: 0x1F3025)
    static let borda = Color(hex: 0x2C3E31)

    // Destaques
    static let ouro = Color(hex: 0xE4C053)
    static let ouroEscuro = Color(hex: 0xB79A3E)
    static let verde = Color(hex: 0x2E7D57)
    static let verdeClaro = Color(hex: 0x5FBF8A)
    static let vermelho = Color(hex: 0xE2564A)
    static let laranja = Color(hex: 0xE0904A)
    static let azul = Color(hex: 0x6E9BE8)

    // Texto
    static let texto = Color(hex: 0xF2F5F1)
    static let textoSuave = Color(hex: 0x8DA394)
    static let textoTenue = Color(hex: 0x62786B)

    // Medidas
    static let raio: CGFloat = 20
    static let raioPequeno: CGFloat = 14

    /// Saudação conforme a hora do aparelho.
    static func saudacao(_ data: Date = Date()) -> String {
        switch Calendar.current.component(.hour, from: data) {
        case 0..<12: return "Bom dia!"
        case 12..<18: return "Boa tarde!"
        default: return "Boa noite!"
        }
    }
}

/// Cores por papel do alimento na ração.
enum Paleta {
    static let verde = Tema.verde
    static let verdeClaro = Tema.verdeClaro
    static let terra = Tema.laranja
    static let energia = Tema.ouro
    static let proteina = Tema.azul
    static let mineral = Color(hex: 0x9AA8A0)
    static let alerta = Tema.laranja

    static func cor(de categoria: CategoriaInsumo) -> Color {
        switch categoria {
        case .volumoso: return Tema.verdeClaro
        case .energetico: return Tema.ouro
        case .proteico: return Tema.azul
        case .mineral: return mineral
        }
    }
}

// MARK: - Modificadores

/// Cartão padrão: preenchimento escuro, cantos arredondados e borda fina.
struct EstiloCartao: ViewModifier {
    var cor: Color
    var espacamento: CGFloat
    var raio: CGFloat

    func body(content: Content) -> some View {
        content
            .padding(espacamento)
            .background(cor, in: RoundedRectangle(cornerRadius: raio, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: raio, style: .continuous)
                    .stroke(Tema.borda, lineWidth: 1)
            )
    }
}

extension View {
    func cartao(cor: Color = Tema.superficie,
                espacamento: CGFloat = 16,
                raio: CGFloat = Tema.raio) -> some View {
        modifier(EstiloCartao(cor: cor, espacamento: espacamento, raio: raio))
    }

    /// Fundo escuro para telas com rolagem livre.
    func fundoTela() -> some View {
        background(Tema.fundo.ignoresSafeArea())
    }

    /// Deixa List e Form transparentes sobre o fundo do tema.
    func listaEscura() -> some View {
        scrollContentBackground(.hidden)
            .background(Tema.fundo.ignoresSafeArea())
    }

    /// Barra de navegação escura, sem o material translúcido padrão.
    func barraEscura() -> some View {
        toolbarBackground(Tema.fundo, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
    }
}

// MARK: - Peças reutilizáveis

/// Título de seção com a barra dourada à esquerda e ação opcional à direita.
struct TituloSecao: View {
    let texto: String
    var textoAcao: String? = nil
    var acao: (() -> Void)? = nil

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            RoundedRectangle(cornerRadius: 2)
                .fill(Tema.ouro)
                .frame(width: 4, height: 22)
            Text(texto)
                .font(.title3.bold())
                .foregroundStyle(Tema.texto)
            Spacer(minLength: 8)
            if let textoAcao, let acao {
                Button(action: acao) {
                    HStack(spacing: 4) {
                        Text(textoAcao)
                        Image(systemName: "arrow.right")
                    }
                    .font(.caption.bold())
                    .foregroundStyle(Tema.ouro)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .overlay(Capsule().stroke(Tema.ouro.opacity(0.45), lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
    }
}

/// Pílula de ação com borda dourada.
struct Chip: View {
    let texto: String
    var simbolo: String = "circle"
    var cor: Color = Tema.ouro
    var acao: () -> Void

    var body: some View {
        Button(action: acao) {
            HStack(spacing: 8) {
                Image(systemName: simbolo)
                    .font(.footnote.weight(.semibold))
                Text(texto)
                    .font(.subheadline.weight(.semibold))
            }
            .foregroundStyle(cor)
            .padding(.horizontal, 16)
            .padding(.vertical, 11)
            .background(cor.opacity(0.08), in: Capsule())
            .overlay(Capsule().stroke(cor.opacity(0.55), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

/// Círculo com ícone, usado no cabeçalho. Serve tanto para botão quanto
/// para link de navegação.
struct CirculoIcone: View {
    let simbolo: String
    var cor: Color = Tema.ouro
    var badge: Int = 0

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Circle()
                .fill(Tema.superficie)
                .overlay(Circle().stroke(cor.opacity(0.5), lineWidth: 1))
                .frame(width: 44, height: 44)
                .overlay(
                    Image(systemName: simbolo)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(cor)
                )
            if badge > 0 {
                Text("\(badge)")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Tema.fundo)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(Tema.ouro, in: Capsule())
                    .offset(x: 4, y: -4)
            }
        }
        .frame(width: 44, height: 44)
    }
}

/// Botão redondo com borda, usado no cabeçalho.
struct BotaoCircular: View {
    let simbolo: String
    var cor: Color = Tema.ouro
    var badge: Int = 0
    var acao: () -> Void

    var body: some View {
        Button(action: acao) {
            CirculoIcone(simbolo: simbolo, cor: cor, badge: badge)
        }
        .buttonStyle(.plain)
    }
}

/// Botão flutuante de ação principal.
struct BotaoFlutuante: View {
    var simbolo: String = "plus"
    var titulo: String
    var acao: () -> Void

    var body: some View {
        Button(action: acao) {
            VStack(spacing: 6) {
                Circle()
                    .fill(Tema.verde)
                    .frame(width: 62, height: 62)
                    .overlay(
                        Image(systemName: simbolo)
                            .font(.system(size: 26, weight: .semibold))
                            .foregroundStyle(.white)
                    )
                    .shadow(color: .black.opacity(0.35), radius: 10, y: 4)
                Text(titulo)
                    .font(.caption.bold())
                    .foregroundStyle(Tema.ouro)
            }
        }
        .buttonStyle(.plain)
    }
}
