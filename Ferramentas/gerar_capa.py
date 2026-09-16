"""Gera a capa fotográfica do painel inicial a partir da foto do nelore.

A capa é vista atrás de texto, então a imagem sai escurecida e com o contraste
puxado: uma foto em tom cheio faria o nome do lote brigar com o capim. O
recorte é largo e baixo, na proporção da faixa que ela ocupa no alto da tela.

Sai em WebP porque ela entra no cache do modo sem internet junto com o resto
do aplicativo, e um JPEG do mesmo tamanho pesa o dobro.

Uso:  python3 Ferramentas/gerar_capa.py web/public/capa.webp
"""
import os
import sys

from PIL import Image, ImageEnhance

ORIGEM = os.path.join(os.path.dirname(__file__), "foto_nelore.jpg")

# Duas vezes o tamanho de tela, para não serrilhar em aparelho retina.
LARGURA, ALTURA = 900, 600


def desenhar() -> Image.Image:
    foto = Image.open(ORIGEM).convert("RGB")

    # Recorte na proporção da faixa, centrado no animal.
    proporcao = LARGURA / ALTURA
    largura, altura = foto.size
    if largura / altura > proporcao:
        nova = round(altura * proporcao)
        esquerda = (largura - nova) // 2
        foto = foto.crop((esquerda, 0, esquerda + nova, altura))
    else:
        nova = round(largura / proporcao)
        topo = (altura - nova) // 2
        foto = foto.crop((0, topo, largura, topo + nova))

    foto = foto.resize((LARGURA, ALTURA), Image.LANCZOS)
    foto = ImageEnhance.Color(foto).enhance(0.72)
    foto = ImageEnhance.Contrast(foto).enhance(1.06)
    # O véu final é feito em CSS, em degradê; aqui só se tira o brilho geral,
    # que é o que deixaria o texto sem contraste em qualquer degradê.
    return ImageEnhance.Brightness(foto).enhance(0.82)


if __name__ == "__main__":
    destino = sys.argv[1] if len(sys.argv) > 1 else "capa.webp"
    desenhar().save(destino, "WEBP", quality=76, method=6)
    print("gerada", destino, os.path.getsize(destino) // 1024, "KB")
