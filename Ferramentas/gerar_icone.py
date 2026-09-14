"""Gera o icone do NovilhaNutri: cabeca bovina dourada sobre verde escuro."""
from PIL import Image, ImageDraw

S = 4                      # supersampling
L = 1024 * S               # lado do canvas de trabalho

FUNDO_TOPO = (0x27, 0x5C, 0x41)
FUNDO_BASE = (0x0D, 0x18, 0x11)
OURO = (0xE4, 0xC0, 0x53)
OURO_ESCURO = (0xC9, 0xA3, 0x3A)


def gradiente():
    img = Image.new("RGB", (L, L))
    d = ImageDraw.Draw(img)
    for y in range(L):
        t = y / (L - 1)
        t = t ** 0.85
        cor = tuple(int(a + (b - a) * t) for a, b in zip(FUNDO_TOPO, FUNDO_BASE))
        d.line([(0, y), (L, y)], fill=cor)
    return img


def elipse_rotacionada(camada, bbox, angulo, cor):
    """PIL nao rotaciona elipse: desenha numa camada propria e gira."""
    x0, y0, x1, y1 = bbox
    w, h = int(x1 - x0), int(y1 - y0)
    lado = int((w ** 2 + h ** 2) ** 0.5) + 4
    tmp = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    ImageDraw.Draw(tmp).ellipse(
        [(lado - w) // 2, (lado - h) // 2, (lado + w) // 2, (lado + h) // 2], fill=cor
    )
    tmp = tmp.rotate(angulo, resample=Image.BICUBIC)
    cx, cy = int((x0 + x1) / 2), int((y0 + y1) / 2)
    camada.alpha_composite(tmp, (cx - lado // 2, cy - lado // 2))


def desenhar():
    base = gradiente().convert("RGBA")
    figura = Image.new("RGBA", (L, L), (0, 0, 0, 0))
    d = ImageDraw.Draw(figura)

    def p(*vals):
        return [v * S for v in vals]

    # --- chifres: crescentes que sobem e abrem para fora ---
    largura_chifre = 34 * S
    d.arc(p(215, 75, 565, 425), start=100, end=200, fill=OURO, width=largura_chifre)
    d.arc(p(459, 75, 809, 425), start=340, end=80, fill=OURO, width=largura_chifre)
    # Pontas arredondadas: o arco do PIL termina em corte reto.
    r = largura_chifre // 2
    for cx, cy in ((226, 190), (798, 190)):
        d.ellipse([cx * S - r, cy * S - r, cx * S + r, cy * S + r], fill=OURO)

    # --- orelhas ---
    elipse_rotacionada(figura, p(168, 392, 388, 512), 28, OURO_ESCURO)
    elipse_rotacionada(figura, p(636, 392, 856, 512), -28, OURO_ESCURO)

    # --- testa / cabeca ---
    d.ellipse(p(300, 316, 724, 700), fill=OURO)
    d.polygon(p(330, 560, 694, 560, 620, 752, 404, 752), fill=OURO)

    # --- focinho ---
    d.rounded_rectangle(p(392, 640, 632, 810), radius=88 * S, fill=OURO_ESCURO)

    # --- olhos e narinas, vazados no fundo ---
    vazio = (0, 0, 0, 0)
    for cx in (410, 614):
        d.ellipse(p(cx - 34, 452, cx + 34, 520), fill=vazio)
    for cx in (472, 552):
        d.ellipse(p(cx - 26, 706, cx + 26, 756), fill=vazio)

    base.alpha_composite(figura)
    return base.convert("RGB").resize((1024, 1024), Image.LANCZOS)


if __name__ == "__main__":
    import sys

    saida = sys.argv[1]
    desenhar().save(saida, "PNG")
    print("gerado", saida)
