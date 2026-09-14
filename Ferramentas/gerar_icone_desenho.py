"""Gera o ícone do NovilhaNutri.

Cabeça de nelore mocho em silhueta dourada sobre verde profundo. A orelha
longa e caída é o que identifica a raça de longe, e é ela que carrega o
desenho: chifre somado a orelha punha quatro apêndices saindo do mesmo oval,
e o olho lia aquilo como antena e asa.

O contorno é montado com curvas de Bézier em vez de formas geométricas
prontas, porque é a curva que separa um desenho de um clip-art. Orelha e
chifre, quando existe, nascem de uma linha de centro que é engrossada ao
longo do caminho - traçar as duas bordas em separado faz elas divergirem e a
forma vira cunha.

Uso:  python3 Ferramentas/gerar_icone.py caminho/do/AppIcon.png
"""
import math
import sys

from PIL import Image, ImageDraw, ImageFilter

S = 4                       # supersampling: desenha grande e reduz
LADO = 1024
L = LADO * S

VERDE_CENTRO = (0x2B, 0x6B, 0x4A)
VERDE_BORDA = (0x0A, 0x14, 0x0E)
OURO = (0xE8, 0xC7, 0x62)
OURO_SOMBRA = (0xC2, 0x9E, 0x40)
FOCINHO = (0xCE, 0xA9, 0x4C)


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


def perfil_orelha(t):
    """Orelha: estreita onde nasce, cheia no meio, fechando na ponta."""
    return (0.42 + 0.58 * math.sin(math.pi * t)) * (1 - t ** 5)


def faixa_perfilada(centro, largura, perfil):
    """Como faixa(), mas com a espessura dada por uma função ao longo do caminho."""
    n = len(centro)
    esquerda, direita = [], []
    for i, (x, y) in enumerate(centro):
        t = i / (n - 1)
        anterior = centro[max(i - 1, 0)]
        seguinte = centro[min(i + 1, n - 1)]
        tx, ty = seguinte[0] - anterior[0], seguinte[1] - anterior[1]
        norma = (tx * tx + ty * ty) ** 0.5 or 1.0
        nx, ny = -ty / norma, tx / norma
        meia = largura * perfil(t) / 2
        esquerda.append((x + nx * meia, y + ny * meia))
        direita.append((x - nx * meia, y - ny * meia))
    return esquerda + direita[::-1]


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
    k, eixo, descida = 1.22, 551, -39
    return [
        ((512 + (x - 512) * k) * S, (eixo + (y - eixo) * k + descida) * S)
        for x, y in pontos
    ]


# --------------------------------------------------------------------------
# peças do desenho
# --------------------------------------------------------------------------
def cabeca():
    """Cara de nelore: comprida e estreita, com o topo da cabeça abaulado."""
    direita = traçado((512, 350), [
        ((584, 354), (614, 400), (620, 454)),    # o alto abaulado, a nuca do zebu
        ((650, 502), (666, 554), (658, 608)),    # bochecha, o ponto mais largo
        ((648, 678), (594, 750), (512, 752)),    # focinho cheio, sem bico
    ])
    return direita + espelhar(direita)[::-1]


def orelha_direita():
    """A marca da raça: orelha longa e caída, larga no meio.

    Sem chifre, de propósito. Nelore mocho é comum, e chifre somado a orelha
    dava quatro apêndices saindo do mesmo oval - o olho lia aquilo como
    antena e asa, não como boi.
    """
    centro = traçado((598, 508), [
        ((706, 558), (764, 624), (756, 720)),
    ])
    return faixa_perfilada(centro, largura=118, perfil=perfil_orelha)


def narina_direita():
    """Duas vírgulas no focinho. Marcam a boca sem precisar de outra cor:
    mancha cheia naquele tamanho vira boca aberta."""
    return traçado((530, 686), [
        ((546, 678), (558, 692), (554, 708)),
        ((548, 722), (530, 720), (526, 706)),
        ((524, 698), (524, 688), (530, 686)),
    ])


def olho_direito():
    """Amêndoa inclinada, só o suficiente para a forma virar rosto."""
    return traçado((556, 558), [
        ((574, 532), (616, 530), (628, 554)),
        ((616, 582), (572, 584), (556, 558)),
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
    d.polygon(escalar(orelha_direita()), fill=OURO)
    d.polygon(escalar(espelhar(orelha_direita())), fill=OURO)

    # Fresta entre a cabeça e o que vem atrás dela. Sem isso a orelha encosta
    # na bochecha e as duas viram um bloco só, que é o que faz a silhueta
    # perder a leitura.
    contorno = escalar(cabeca())
    fresta = Image.new("L", (L, L), 0)
    ImageDraw.Draw(fresta).line(
        contorno + [contorno[0]], fill=255, width=26 * S, joint="curve"
    )
    figura.paste((0, 0, 0, 0), (0, 0), fresta)

    d.polygon(contorno, fill=OURO)

    # olhos vazados, deixando o fundo aparecer
    recorte = Image.new("RGBA", (L, L), (0, 0, 0, 0))
    dr = ImageDraw.Draw(recorte)
    for peça in (olho_direito(), narina_direita()):
        dr.polygon(escalar(peça), fill=(0, 0, 0, 255))
        dr.polygon(escalar(espelhar(peça)), fill=(0, 0, 0, 255))
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
