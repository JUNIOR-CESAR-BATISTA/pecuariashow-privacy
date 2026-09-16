"""Gera o ícone do NovilhaNutri a partir da fotografia do nelore.

O recorte é fechado na cabeça e no cupim, e não no animal inteiro. A razão é
o tamanho de uso: o ícone é visto com 60 pontos de lado na tela de início, e
ali o boi inteiro - claro sobre capim claro - vira uma mancha cinza. Fechando
no busto, ainda se reconhece um bovino.

O ajuste de contraste, cor e nitidez existe pelo mesmo motivo. A foto original
é suave e de tom baixo; reduzida a 60 pontos, some. O aumento é discreto de
perto e é o que mantém a leitura de longe.

Uso:  python3 Ferramentas/gerar_icone_foto.py caminho/do/AppIcon.png
"""
import os
import sys

from PIL import Image, ImageEnhance

ORIGEM = os.path.join(os.path.dirname(__file__), "foto_nelore.jpg")

# Janela do recorte na foto original, em pixels: cabeça, pescoço e cupim.
RECORTE = (520, 55, 870, 405)

LADO = 1024
CONTRASTE = 1.16
COR = 1.12
NITIDEZ = 1.5


def desenhar():
    foto = Image.open(ORIGEM).convert("RGB")
    icone = foto.crop(RECORTE).resize((LADO, LADO), Image.LANCZOS)
    icone = ImageEnhance.Contrast(icone).enhance(CONTRASTE)
    icone = ImageEnhance.Color(icone).enhance(COR)
    icone = ImageEnhance.Sharpness(icone).enhance(NITIDEZ)
    return icone


if __name__ == "__main__":
    destino = sys.argv[1] if len(sys.argv) > 1 else "AppIcon.png"
    desenhar().save(destino, "PNG")
    print("gerado", destino)
