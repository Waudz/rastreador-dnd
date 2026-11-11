"""Gera os ícones do aplicativo a partir de icones/icone-512.png (arte original, nunca alterada).

  python ferramentas/gerar-icones.py        (precisa de Pillow)

Saídas:
  icones/logo.png, icones/logo-64.png      logotipo com fundo transparente, para usar DENTRO das páginas
  icones/icone-maskable-192/512.png        ícones de instalação "maskable" (arte menor, com margem de segurança)

Transparência: o fundo escuro e as linhas internas do d20 têm a mesma cor, então não se pode apagar "pixels pretos".
O d20 é um polígono convexo: calcula-se o casco convexo da parte dourada e só o que fica FORA dele vira transparente.
As linhas escuras que ficam dentro do desenho (e o "20") são preservadas exatamente como estão.
A borda recebe alfa por cobertura geométrica (suavização), sem halo escuro.
"""
from pathlib import Path
from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
ORIGINAL = RAIZ / "icones" / "icone-512.png"
FUNDO_PWA = (16, 24, 32)          # #101820, mesma cor de fundo das páginas e do manifest
SS = 4                            # supersampling da máscara


def casco_convexo(pontos):
    pontos = sorted(set(pontos))
    def cruz(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    baixo, cima = [], []
    for p in pontos:
        while len(baixo) >= 2 and cruz(baixo[-2], baixo[-1], p) <= 0: baixo.pop()
        baixo.append(p)
    for p in reversed(pontos):
        while len(cima) >= 2 and cruz(cima[-2], cima[-1], p) <= 0: cima.pop()
        cima.append(p)
    return baixo[:-1] + cima[:-1]


def logo_transparente():
    im = Image.open(ORIGINAL).convert("RGB")
    w, h = im.size
    px = im.load()
    ouro = [(x, y) for y in range(h) for x in range(w) if sum(px[x, y]) > 270]   # fundo e linhas somam ~60
    casco = casco_convexo(ouro)
    mascara = Image.new("L", (w * SS, h * SS), 0)
    ImageDraw.Draw(mascara).polygon([(x * SS + SS / 2, y * SS + SS / 2) for x, y in casco], fill=255)
    mascara = mascara.resize((w, h), Image.LANCZOS)
    saida = im.convert("RGBA")
    saida.putalpha(mascara)
    # pixels da borda (alfa parcial) misturam ouro com o fundo escuro: usar o ouro puro para não deixar halo
    cor_ouro = px[w // 2 - 120, h // 2 - 40]
    sp = saida.load()
    for y in range(h):
        for x in range(w):
            a = sp[x, y][3]
            if 0 < a < 255:
                sp[x, y] = (*cor_ouro, a)
    xs = [p[0] for p in casco]; ys = [p[1] for p in casco]
    return saida, (min(xs), min(ys), max(xs) + 1, max(ys) + 1)


def quadrado(img, caixa, lado, margem):
    corte = img.crop(caixa)
    esc = lado * (1 - 2 * margem) / max(corte.size)
    corte = corte.resize((max(1, round(corte.width * esc)), max(1, round(corte.height * esc))), Image.LANCZOS)
    tela = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    tela.paste(corte, ((lado - corte.width) // 2, (lado - corte.height) // 2), corte)
    return tela


def main():
    img, caixa = logo_transparente()
    saidas = RAIZ / "icones"
    quadrado(img, caixa, 256, 0.04).save(saidas / "logo.png", optimize=True)
    quadrado(img, caixa, 64, 0.04).save(saidas / "logo-64.png", optimize=True)
    for lado in (192, 512):
        fundo = Image.new("RGBA", (lado, lado), (*FUNDO_PWA, 255))
        arte = quadrado(img, caixa, lado, 0.19)          # d20 ocupa ~62% do ícone: dentro da zona segura de 80%
        fundo.alpha_composite(arte)
        fundo.convert("RGB").save(saidas / f"icone-maskable-{lado}.png", optimize=True)
    print("ícones gerados em", saidas)


if __name__ == "__main__":
    main()
