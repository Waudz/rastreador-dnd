"""Gera os ícones do Compêndio 5e (favicons, cabeçalho, instalação da PWA) a partir de icones/compendio-simbolo.png.
Uso: python ferramentas/gerar-icones.py   (precisa de Pillow e numpy)
Símbolo e favicons: fundo transparente. Instalação: fundo preto #000000, sem texto; maskable dentro da área segura."""
from PIL import Image
import numpy as np, os, io
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(R, "icones", "compendio-simbolo.png")   # símbolo transparente já limpo: fonte dos demais tamanhos
OURO = (250, 175, 35)

im = Image.open(SRC).convert("RGBA")
a = np.array(im).astype(np.int32)
al = a[..., 3]
# a fonte já é o símbolo limpo (alfa real, sem véu ao redor): não há o que limpar aqui
out = np.zeros_like(a)
out[..., 0], out[..., 1], out[..., 2] = OURO          # cor única: o dourado do desenho (sem franjas escuras de pré-multiplicação)
out[..., 3] = al
simb = Image.fromarray(out.astype(np.uint8), "RGBA")
bb = simb.getbbox()
simb = simb.crop(bb)
print("simbolo", simb.size)

def quadrado(lado, ocupa, fundo=None, sub=4):
    """Desenha o símbolo centralizado em um quadrado; `ocupa` = fração do lado que a maior dimensão do símbolo ocupa."""
    W = lado * sub
    alvo = int(W * ocupa)
    r = alvo / max(simb.size)
    s = simb.resize((max(1, round(simb.width * r)), max(1, round(simb.height * r))), Image.LANCZOS)
    tela = Image.new("RGBA", (W, W), fundo if fundo else (0, 0, 0, 0))
    tela.alpha_composite(s, ((W - s.width) // 2, (W - s.height) // 2))
    return tela.resize((lado, lado), Image.LANCZOS)

def salvar(img, nome, rgb=False):
    p = os.path.join(R, "icones", nome)
    if rgb:
        fundo = Image.new("RGB", img.size, (0, 0, 0)); fundo.paste(img, mask=img.split()[3]); fundo.save(p, optimize=True)
    else:
        img.save(p, optimize=True)
    print(nome, img.size, os.path.getsize(p))
    return p

PRETO = (0, 0, 0, 255)
# símbolo transparente (cabeçalho, favicon, referência)
salvar(quadrado(1024, 0.96), "compendio-simbolo.png")
salvar(quadrado(96, 0.96), "compendio-logo-96.png")
salvar(quadrado(192, 0.96), "compendio-logo-192.png")        # abertura (splash)
# favicons: ocupam o máximo para continuarem reconhecíveis em tamanho pequeno
fav = {}
for t in (16, 32, 48):
    fav[t] = quadrado(t, 0.96 if t > 16 else 1.0, sub=8)
    salvar(fav[t], "compendio-favicon-%d.png" % t)
fav[48].save(os.path.join(R, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)], append_images=[fav[32], fav[16]])
print("favicon.ico", os.path.getsize(os.path.join(R, "favicon.ico")))
# instalação (fundo preto sólido, sem texto): "any" com margem; "maskable" dentro da área segura (círculo de 80%)
for t in (192, 512):
    salvar(quadrado(t, 0.64, PRETO), "compendio-app-%d.png" % t, rgb=True)
    salvar(quadrado(t, 0.52, PRETO), "compendio-maskable-%d.png" % t, rgb=True)
salvar(quadrado(180, 0.64, PRETO), "compendio-apple-touch.png", rgb=True)
