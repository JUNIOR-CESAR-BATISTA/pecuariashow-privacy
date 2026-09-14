"""Gera o ícone do NovilhaNutri.

Cabeça de nelore em silhueta dourada sobre verde profundo: orelhas caídas e
chifres em lira, que é o que identifica a raça de longe. O contorno é montado
com curvas de Bézier em vez de formas geométricas prontas, porque é a curva
que separa um desenho de um clip-art.

Uso:  python3 Ferramentas/gerar_icone.py caminho/do/AppIcon.png
"""
import sys

from PIL import Image, ImageDraw, ImageFilter

S = 4                       # supersampling: desenha grande e reduz
LADO = 1024
L = LADO * S

VERDE_CENTRO = (0x2B, 0x6B, 0x4A)
VERDE_BORDA = (0x0A, 0x14, 0x0E)
OURO = (0xE8, 0xC7, 0x62)
OURO_SOMBRA = (0xC2, 0x9E, 0x40)
FOCINHO = (0xB2, 0x8B, 0x36)


# --------------------------------------------------------------------------
# geometria
# --------------------------------------------------------------------------
def cubica(p0, p1, p2, p3, n=48):
    """Amostra uma Bézier cúbica."""
    saida = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        x = u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0]
        y = u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]
        saida.append((x, y))
    return saida


def traçado(inicio, segmentos):
    """Concatena segmentos cúbicos [(c1, c2, fim), ...] a partir de um ponto."""
    pontos = [inicio]
    atual = inicio
    for c1, c2, fim in segmentos:
        pontos.extend(cubica(atual, c1, c2, fim)[1:])
        atual = fim
    return pontos


def faixa(centro, largura_base, largura_ponta, expoente=1.6):
    """Engrossa uma linha de centro, afinando até a ponta.

    Traçar chifre por duas bordas independentes não funciona: elas divergem e
    o resultado vira cunha. Aqui a espessura é dada ao longo do caminho, então
    o afilamento é real e a curva manda na forma.
    """
    n = len(centro)
    esquerda, direita = [], []
    for i, (x, y) in enumerate(centro):
        t = i / (n - 1)
        anterior = centro[max(i - 1, 0)]
        seguinte = centro[min(i + 1, n - 1)]
        tx, ty = seguinte[0] - anterior[0], seguinte[1] - anterior[1]
        norma = (tx * tx + ty * ty) ** 0.5 or 1.0
        nx, ny = -ty / norma, tx / norma
        meia = (largura_ponta + (largura_base - largura_ponta) * (1 - t) ** expoente) / 2
        esquerda.append((x + nx * meia, y + ny * meia))
        direita.append((x - nx * meia, y - ny * meia))
    return esquerda + direita[::-1]


def espelhar(pontos):
    """Reflete no eixo vertical do ícone, para a simetria sair exata."""
    return [(LADO - x, y) for x, y in pontos]


def escalar(pontos):
    """Enquadra a figura e leva para as coordenadas do canvas ampliado.

    O desenho nasce menor e alto no quadro, porque os chifres puxam a massa
    para cima. Aqui ele é ampliado em torno do próprio centro visual e descido,
    para o conjunto ficar opticamente centrado e ocupar o ícone.
    """
    k, eixo, descida = 1.14, 462, 50
    return [
        ((512 + (x - 512) * k) * S, (eixo + (y - eixo) * k + descida) * S)
        for x, y in pontos
    ]


# --------------------------------------------------------------------------
# peças do desenho
# --------------------------------------------------------------------------
def cabeca():
    """Testa larga afinando para o focinho. Sem orelha, sem detalhe."""
    direita = traçado((512, 398), [
        ((614, 400), (674, 470), (670, 558)),
        ((666, 650), (600, 744), (512, 746)),
    ])
    return direita + espelhar(direita)[::-1]


def chifre_direito():
    """Chifre em lira: nasce dentro da testa, abre, sobe e curva na ponta."""
    centro = traçado((534, 446), [
        ((666, 372), (824, 330), (812, 178)),
    ])
    return faixa(centro, largura_base=104, largura_ponta=9)


def olho_direito():
    """Amêndoa inclinada, só o suficiente para a forma virar rosto."""
    return traçado((562, 534), [
        ((580, 508), (620, 506), (632, 530)),
        ((620, 558), (578, 560), (562, 534)),
    ])


# --------------------------------------------------------------------------
# fundo
# --------------------------------------------------------------------------
def fundo():
    """Gradiente radial suave: claro no alto ao centro, fechando nas bordas."""
    pequeno = 128
    img = Image.new("RGB", (pequeno, pequeno))
    px = img.load()
    cx, cy = pequeno * 0.5, pequeno * 0.40
    maior = (pequeno ** 2 + pequeno ** 2) ** 0.5
    for y in range(pequeno):
        for x in range(pequeno):
            d = (((x - cx) ** 2 + (y - cy) ** 2) ** 0.5) / (maior * 0.62)
            t = min(1.0, d) ** 1.15
            px[x, y] = tuple(
                int(a + (b - a) * t) for a, b in zip(VERDE_CENTRO, VERDE_BORDA)
            )
    return img.resize((L, L), Image.BICUBIC)


# --------------------------------------------------------------------------
def desenhar():
    base = fundo().convert("RGBA")

    figura = Image.new("RGBA", (L, L), (0, 0, 0, 0))
    d = ImageDraw.Draw(figura)

    # Uma cor só: chifres e cabeça formam uma silhueta contínua. Camadas de
    # tom diferente pediriam detalhe, e detalhe é o oposto do que se quer aqui.
    for peça in (chifre_direito(), espelhar(chifre_direito()), cabeca()):
        d.polygon(escalar(peça), fill=OURO)

    # olhos vazados, deixando o fundo aparecer
    recorte = Image.new("RGBA", (L, L), (0, 0, 0, 0))
    dr = ImageDraw.Draw(recorte)
    dr.polygon(escalar(olho_direito()), fill=(0, 0, 0, 255))
    dr.polygon(escalar(espelhar(olho_direito())), fill=(0, 0, 0, 255))
    figura.paste((0, 0, 0, 0), (0, 0), recorte)

    # sombra curta sob a figura, só para ela não flutuar
    sombra = Image.new("RGBA", (L, L), (0, 0, 0, 0))
    sombra.paste((0, 0, 0, 90), (0, 10 * S), figura.split()[3])
    sombra = sombra.filter(ImageFilter.GaussianBlur(9 * S))

    base.alpha_composite(sombra)
    base.alpha_composite(figura)
    return base.convert("RGB").resize((LADO, LADO), Image.LANCZOS)


if __name__ == "__main__":
    destino = sys.argv[1] if len(sys.argv) > 1 else "AppIcon.png"
    desenhar().save(destino, "PNG")
    print("gerado", destino)
