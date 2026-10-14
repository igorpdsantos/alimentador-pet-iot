# Gera as texturas (PNG) da montagem detalhada com aparência de placa real: protoboard MB-102 (plástico, furos com
# mola, trilhos), ESP32 DevKit V1 pelo lado de baixo (máscara preta, ilhas estanhadas, serigrafia), módulo HX711
# (máscara verde, trilhas, SMD) e step-down MP1584 (máscara azul, CI, capacitores, diodo).
# As ilhas ficam exatamente onde estão os pinos do modelo 3D (mesmas coordenadas de montagem_v3.py).
# As versões esquemáticas antigas (nome do pino + cor do fio) ficam em montagem/texturas/esquematicas/.
# Rodar com o Python do sistema (precisa de Pillow):
#   python3 "cad/scripts/texturas_montagem.py"
# As imagens são desenhadas "em pé" (como você vê de frente) e convertidas para o mapeamento do Coin3D:
# o eixo S da textura segue a maior dimensão da peça e o T a segunda (ver montagem_v3.py).
import json
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "montagem", "texturas")
os.makedirs(OUT, exist_ok=True)
P = json.load(open(os.path.join(ROOT, "montagem", "params.json")))
SUP = "/System/Library/Fonts/Supplemental/"
SS = 2                                                   # desenha em 2× e reduz (bordas suaves)
random.seed(7)


def fonte(px, nome="Arial Narrow Bold.ttf"):
    return ImageFont.truetype(SUP + nome, int(px * SS))


def salvar(im, nome, transverse):
    im = im.resize((im.width // SS, im.height // SS), Image.LANCZOS)
    if transverse:                     # peça mais alta que larga: S da textura vai para o eixo vertical
        im = im.transpose(Image.Transpose.TRANSVERSE)
    im.save(os.path.join(OUT, nome), optimize=True)
    os.makedirs(os.path.join(OUT, "web"), exist_ok=True)     # cópia leve para o site (o GLB embute esta)
    im.save(os.path.join(OUT, "web", nome.replace(".png", ".jpg")), quality=88, optimize=True, progressive=True)
    print("textura", nome, im.size)


def ruido(im, forca=6, grao=1.2):
    """Textura fina de máscara de solda / plástico (nada de cor chapada)."""
    n = Image.effect_noise(im.size, forca * 4).convert("L").filter(ImageFilter.GaussianBlur(grao))
    base = im.convert("RGB")
    return Image.blend(base, Image.merge("RGB", (n, n, n)), forca / 100)


class Placa:
    """Desenho em mm: origem no canto de cima à esquerda, S px por mm (já com supersampling)."""

    def __init__(self, w, h, s, cor):
        self.w, self.h, self.s = w, h, s * SS
        self.im = Image.new("RGB", (int(w * self.s), int(h * self.s)), cor)
        self.d = ImageDraw.Draw(self.im)

    def p(self, x, y):
        return (x * self.s, y * self.s)

    def ret(self, x0, y0, x1, y1, **k):
        self.d.rectangle([*self.p(x0, y0), *self.p(x1, y1)], **k)

    def rr(self, x0, y0, x1, y1, r, **k):
        self.d.rounded_rectangle([*self.p(x0, y0), *self.p(x1, y1)], radius=r * self.s, **k)

    def circ(self, x, y, r, **k):
        self.d.ellipse([*self.p(x - r, y - r), *self.p(x + r, y + r)], **k)

    def linha(self, pts, larg, cor):
        self.d.line([self.p(*q) for q in pts], fill=cor, width=max(1, int(larg * self.s)), joint="curve")

    def texto(self, x, y, txt, tam, cor, ancora="mm", nome="Arial Narrow Bold.ttf", girar=0):
        f = fonte(tam * self.s / SS, nome)
        if not girar:
            self.d.text(self.p(x, y), txt, fill=cor, font=f, anchor=ancora)
            return
        l, t, r, b = self.d.textbbox((0, 0), txt, font=f)
        tmp = Image.new("RGBA", (r - l + 8, b - t + 8), (0, 0, 0, 0))
        ImageDraw.Draw(tmp).text((4 - l, 4 - t), txt, fill=cor, font=f)
        tmp = tmp.rotate(girar, expand=True, resample=Image.BICUBIC)
        cx, cy = self.p(x, y)
        self.im.paste(tmp, (int(cx - tmp.width / 2), int(cy - tmp.height / 2)), tmp)

    def ilha(self, x, y, r=0.85, furo=0.5, quadrada=False):
        """Ilha de furo passante estanhada (HASL): anel prateado com brilho e o furo escuro."""
        k = dict(fill=(196, 198, 200), outline=(140, 142, 146), width=max(1, int(.06 * self.s)))
        (self.ret(x - r, y - r, x + r, y + r, **k) if quadrada else self.circ(x, y, r, **k))
        self.circ(x - r * .25, y - r * .3, r * .45, fill=(226, 228, 230))
        self.circ(x, y, furo, fill=(36, 34, 30))

    def smd(self, x, y, comp, larg, corpo, vertical=False, texto=None):
        """Componente 0603/0805: corpo + terminais estanhados."""
        a, b = (larg / 2, comp / 2) if vertical else (comp / 2, larg / 2)
        self.ret(x - a, y - b, x + a, y + b, fill=corpo)
        t = comp * .22
        if vertical:
            self.ret(x - a, y - b, x + a, y - b + t, fill=(200, 202, 204))
            self.ret(x - a, y + b - t, x + a, y + b, fill=(200, 202, 204))
        else:
            self.ret(x - a, y - b, x - a + t, y + b, fill=(200, 202, 204))
            self.ret(x + a - t, y - b, x + a, y + b, fill=(200, 202, 204))
        if texto:
            self.texto(x, y, texto, larg * .55, (225, 225, 220), girar=90 if vertical else 0)

    def ci(self, x, y, w, h, pinos, nome=None, lados="lr"):
        """CI SMD (SOIC/SOT): corpo preto fosco com terminais de lado e a marca do pino 1."""
        passo = (h if "l" in lados else w) / (pinos + 1)
        for i in range(pinos):
            if "l" in lados:
                yy = y - h / 2 + passo * (i + 1)
                self.ret(x - w / 2 - .7, yy - .2, x - w / 2, yy + .2, fill=(200, 202, 204))
                self.ret(x + w / 2, yy - .2, x + w / 2 + .7, yy + .2, fill=(200, 202, 204))
            else:
                xx = x - w / 2 + passo * (i + 1)
                self.ret(xx - .2, y - h / 2 - .7, xx + .2, y - h / 2, fill=(200, 202, 204))
                self.ret(xx - .2, y + h / 2, xx + .2, y + h / 2 + .7, fill=(200, 202, 204))
        self.rr(x - w / 2, y - h / 2, x + w / 2, y + h / 2, .25, fill=(28, 28, 30))
        self.circ(x - w / 2 + .7, y - h / 2 + .7, .28, fill=(52, 52, 56))
        if nome:
            self.texto(x, y, nome, min(w, h) * .3, (150, 150, 150), girar=90 if h > w * 1.4 else 0)


def trilhas(pl, segs, larg, cor):
    for s in segs:
        pl.linha(s, larg, cor)


def vias(pl, pts, anel=(150, 152, 156)):
    for x, y in pts:
        pl.circ(x, y, .38, fill=anel)
        pl.circ(x, y, .17, fill=(20, 20, 20))


# ================================================================ protoboard MB-102 (vista de frente)
PITCH = 2.54
LINHAS = {"a": -13.97, "b": -11.43, "c": -8.89, "d": -6.35, "e": -3.81,
          "f": 3.81, "g": 6.35, "h": 8.89, "i": 11.43, "j": 13.97}
TRILHOS = {"5V": -24.13, "GND_E": -21.59, "GND_D": 21.59, "3V3": 24.13}
Z0 = P["Z_PROTO0"]
Z1 = Z0 + P["PROTO"][1]
PW, PH = P["PROTO"][:2]
VERM, AZUL = (206, 38, 42), (36, 84, 196)


def z_col(c):
    return Z0 + (PH - 62 * PITCH) / 2 + (c - 1) * PITCH


def cols_trilho():
    return [3 + g * 6 + k for g in range(10) for k in range(5)]


pl = Placa(PW, PH, 12, (236, 235, 228))
X = lambda x: x + PW / 2                                       # noqa: E731
Y = lambda z: Z1 - z                                           # noqa: E731
pl.ret(X(-1.7), 1.2, X(1.7), PH - 1.2, fill=(222, 221, 213))   # canal central (rebaixado)
pl.linha([(X(-1.7), 1.2), (X(-1.7), PH - 1.2)], .18, (205, 204, 196))
pl.linha([(X(1.7), 1.2), (X(1.7), PH - 1.2)], .18, (248, 247, 242))


def furo_proto(x, z):
    """Furo quadrado com a mola de metal lá no fundo."""
    cx, cy = X(x), Y(z)
    pl.ret(cx - .62, cy - .62, cx + .62, cy + .62, fill=(196, 195, 188))
    pl.ret(cx - .5, cy - .5, cx + .5, cy + .5, fill=(58, 57, 54))
    pl.ret(cx - .5, cy - .5, cx + .5, cy - .32, fill=(32, 31, 30))
    pl.ret(cx - .2, cy - .08, cx + .2, cy + .32, fill=(150, 146, 132))


for c in range(1, 64):
    for x in LINHAS.values():
        furo_proto(x, z_col(c))
for x in TRILHOS.values():
    for c in cols_trilho():
        furo_proto(x, z_col(c))
for x, cor in [(-26.0, VERM), (-19.7, AZUL), (19.7, AZUL), (26.0, VERM)]:
    pl.linha([(X(x), 4), (X(x), PH - 4)], .32, cor)
for letra, x in LINHAS.items():
    for y in (1.6, PH - 1.4):
        pl.texto(X(x), y, letra, 1.5, (112, 112, 108), nome="Arial.ttf")
for c in [1] + list(range(5, 64, 5)):
    for x in (-17.3, 17.3):
        pl.texto(X(x), Y(z_col(c)), str(c), 1.25, (112, 112, 108), nome="Arial.ttf", girar=90)
for txt, x, cor in [("+", -26.0, VERM), ("−", -19.7, AZUL), ("−", 19.7, AZUL), ("+", 26.0, VERM)]:
    for y in (2.4, PH - 2.4):
        pl.texto(X(x), y, txt, 2.4, cor, nome="Arial Bold.ttf")
pl.im = ruido(pl.im, 4, 1.6)
salvar(pl.im, "protoboard.png", transverse=True)

# ================================================================ ESP32 DevKit V1, lado de baixo (colada ao contrário)
ESQ_LISTA = ["EN", "VP", "VN", "D34", "D35", "D32", "D33", "D25", "D26", "D27", "D14", "D12", "D13", "GND", "VIN"]
DIR_LISTA = ["D23", "D22", "TX0", "RX0", "D21", "D19", "D18", "D5", "TX2", "RX2", "D4", "D2", "D15", "GND", "3V3"]
bw, bh = P["ESP32"][0], P["ESP32"][1]
MASCARA, TRILHA = (24, 25, 28), (36, 38, 42)
pl = Placa(bw, bh, 24, MASCARA)
EX = lambda x: x + bw / 2                                      # noqa: E731
EY = lambda z: bh / 2 - z                                      # noqa: E731
# plano de terra e trilhas (aparecem levemente em relevo sob a máscara)
random.seed(3)
for k in range(9):
    y0 = 9 + k * 3.6
    trilhas(pl, [[(EX(-12.7) + 1.4, EY(17.78 - k * PITCH * 1.4)), (EX(-6), y0), (EX(6), y0 + 1.5), (EX(12.7) - 1.4, EY(17.78 - (k + 1) * PITCH * 1.3))]],
            .32, TRILHA)
trilhas(pl, [[(EX(-4), bh - 3), (EX(-4), bh - 9), (EX(3), bh - 12), (EX(3), 30)],
             [(EX(4.5), bh - 3), (EX(4.5), bh - 7), (EX(8), bh - 10)],
             [(EX(-8), 6), (EX(-2), 3.5), (EX(6), 3.5), (EX(8.5), 6)]], .45, TRILHA)
livre = lambda x, y: not (abs(x) < 6.5 and (12 < y < 23 or 24.5 < y < 34))   # noqa: E731  (não cair no texto)
vias(pl, [(EX(x), y) for x, y in ((random.uniform(-8, 8), random.uniform(7, bh - 5)) for _ in range(60)) if livre(x, y)][:24])
# área da antena (sem cobre embaixo: máscara mais clara)
pl.ret(EX(-9), 0.6, EX(9), 6.2, fill=(32, 33, 37))
for lista, x, lado in [(ESQ_LISTA, 12.7, 1), (DIR_LISTA, -12.7, -1)]:
    for i, nome in enumerate(lista):
        z = 17.78 - i * PITCH
        pl.ilha(EX(x), EY(z), .92, .5, quadrada=(i == 0))
        pl.texto(EX(x) - lado * 2.0, EY(z), nome, 1.15, (236, 236, 232), ancora="rm" if lado > 0 else "lm")
pl.texto(EX(0), 15.0, "ESP32", 2.6, (236, 236, 232), nome="Arial Bold.ttf")
pl.texto(EX(0), 18.2, "DEVKIT V1", 1.6, (236, 236, 232), nome="Arial Bold.ttf")
pl.texto(EX(0), 21.0, "DOIT", 1.4, (200, 200, 196))
pl.rr(EX(-5), 26, EX(5), 32.5, .4, outline=(220, 220, 216), width=int(.12 * pl.s))
for k, t in enumerate(["CP2102", "USB-UART", "3V3 · 600 mA"]):
    pl.texto(EX(0), 27.4 + k * 1.9, t, 1.15, (220, 220, 216))
pl.texto(EX(0), bh - 1.8, "▼ USB", 1.2, (210, 210, 206))
pl.texto(EX(0), 3.4, "▲ ANT", 1.2, (210, 210, 206))
for x in (-12.0, 12.0):                                       # furos de fixação
    for y in (2.2, bh - 2.2):
        pl.circ(EX(x), y, 1.25, fill=(170, 172, 176))
        pl.circ(EX(x), y, .85, fill=(14, 14, 14))
pl.im = ruido(pl.im, 5, 1.0)
salvar(pl.im, "esp32_baixo.png", transverse=True)

# ================================================================ HX711 (pinos de controle à esquerda, célula à direita)
hw, hh = 34.0, 20.0
VERDE, TRV = (18, 112, 58), (34, 140, 76)
pl = Placa(hw, hh, 30, VERDE)
trilhas(pl, [[(3.5, hh / 2 - 3.81 + i * PITCH), (8.0, hh / 2 - 3.81 + i * PITCH), (13.0 + i * 1.2, 12.9)] for i in range(4)], .35, TRV)
trilhas(pl, [[(hw - 3.0, hh / 2 - 6.35 + i * PITCH), (hw - 7.0, hh / 2 - 6.35 + i * PITCH), (14.0 + i * 1.2, 7.1)] for i in range(6)], .35, TRV)
trilhas(pl, [[(6, 2), (28, 2)], [(6, hh - 2), (28, hh - 2)], [(17, 13.5), (17, hh - 2)]], .6, TRV)
vias(pl, [(9, 3.5), (25, 3.4), (10, hh - 3.6), (26, hh - 3.6), (15, 15.2), (19.5, 15.4)], anel=(176, 186, 180))
for i, nome in enumerate(["VCC", "SCK", "DT", "GND"]):
    y = hh / 2 - 3.81 + i * PITCH
    pl.ilha(3.5, y, .95, .5, quadrada=(i == 0))
    pl.texto(5.4, y, nome, 1.45, (240, 240, 236), ancora="lm")
for i, nome in enumerate(["E+", "E-", "A-", "A+", "B-", "B+"]):
    y = hh / 2 - 6.35 + i * PITCH
    pl.ilha(hw - 3.0, y, .95, .5, quadrada=(i == 0))
    pl.texto(hw - 5.0, y, nome, 1.45, (240, 240, 236), ancora="rm")
pl.ci(17, 10, 9.6, 4.4, 8, lados="tb")                       # pegada do HX711 (o corpo é a peça 3D)
for x, y, v in [(10.5, 4.2, False), (10.5, 15.8, False), (23.8, 4.0, False), (23.8, 16.2, False), (13.2, 16.6, True), (20.8, 3.4, True)]:
    pl.smd(x, y, 1.9, 1.0, (30, 30, 32), vertical=v, texto="103")       # resistores
for x, y, v in [(8.6, 6.6, True), (8.6, 13.4, True), (25.8, 6.8, True), (25.8, 13.2, True), (21.3, 16.6, False)]:
    pl.smd(x, y, 1.9, 1.0, (176, 142, 92), vertical=v)                  # capacitores cerâmicos
pl.ci(13.4, 3.2, 1.5, 1.3, 1, lados="tb")                     # transistor S8550 (SOT-23)
pl.texto(17, 1.1, "HX711  24-bit ADC", 1.25, (236, 236, 232))
pl.texto(17, hh - .9, "RATE 10/80 Hz", 1.05, (220, 230, 222))
pl.im = ruido(pl.im, 5, 1.0)
salvar(pl.im, "hx711.png", transverse=False)

# ================================================================ MP1584 (entrada embaixo, saída em cima)
mw, mh = 19.0, 24.0
AZ, TRA = (22, 64, 146), (36, 86, 178)
pl = Placa(mw, mh, 30, AZ)
MX = lambda x: x + mw / 2                                      # noqa: E731
MY = lambda z: mh / 2 - z                                      # noqa: E731
trilhas(pl, [[(MX(-8.89), MY(-10.16)), (MX(-8.89), MY(-4.4)), (MX(-6), MY(-4.4))],
             [(MX(8.89), MY(-10.16)), (MX(8.89), MY(10.16))],
             [(MX(-8.89), MY(10.16)), (MX(-8.89), MY(6.5)), (MX(-1), MY(6.5))]], 1.6, TRA)
for nome, x, z in [("IN+", -8.89, -10.16), ("IN-", 8.89, -10.16), ("OUT+", -8.89, 10.16), ("OUT-", 8.89, 10.16)]:
    pl.ilha(MX(x), MY(z), 1.25, .6)
    pl.texto(MX(x) + (2.0 if x < 0 else -2.0), MY(z), nome, 1.5, (240, 240, 236), ancora="lm" if x < 0 else "rm")
pl.ci(MX(-3.6), MY(-4.4), 3.9, 4.9, 4, nome="MP1584", lados="lr")
pl.smd(MX(-1.0), MY(-8.9), 3.2, 1.6, (176, 142, 92))           # capacitor de entrada
pl.smd(MX(3.0), MY(-8.9), 3.2, 1.6, (176, 142, 92))
pl.smd(MX(2.5), MY(8.6), 3.2, 1.6, (176, 142, 92))             # capacitor de saída
pl.smd(MX(-3.6), MY(8.6), 1.9, 1.0, (30, 30, 32), texto="102")
pl.smd(MX(6.4), MY(-4.6), 1.9, 1.0, (30, 30, 32), vertical=True, texto="472")
pl.rr(MX(5.0), MY(4.8), MX(8.2), MY(1.0), .2, fill=(30, 30, 32))   # diodo SS34
pl.ret(MX(5.0), MY(4.8), MX(5.6), MY(1.0), fill=(200, 200, 196))
vias(pl, [(MX(0), MY(-6.2)), (MX(1.2), MY(-6.2)), (MX(-6.8), MY(1)), (MX(4), MY(6))], anel=(150, 170, 210))
pl.texto(MX(0), MY(-11.3), "MP1584EN  3A", 1.2, (236, 236, 232))
pl.im = ruido(pl.im, 5, 1.0)
salvar(pl.im, "mp1584.png", transverse=True)
