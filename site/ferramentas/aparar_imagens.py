# Corta as margens transparentes das imagens do site e limita o tamanho (rodar depois de renderizar_imagens.py).
#   python3 site/ferramentas/aparar_imagens.py        (precisa de Pillow)
import glob
import os

from PIL import Image

IMG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "img")
for f in glob.glob(os.path.join(IMG, "*.png")) + glob.glob(os.path.join(IMG, "pecas", "*.png")) + glob.glob(os.path.join(IMG, "comp", "*.png")):
    im = Image.open(f).convert("RGBA")
    bb = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if not bb:
        continue
    m = int(0.04 * max(bb[2] - bb[0], bb[3] - bb[1]))
    im = im.crop((max(0, bb[0] - m), max(0, bb[1] - m), min(im.width, bb[2] + m), min(im.height, bb[3] + m)))
    limite = 640 if (os.sep + "pecas" + os.sep in f or os.sep + "comp" + os.sep in f) else 1400
    if max(im.size) > limite:
        s = limite / max(im.size)
        im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    im.save(f, optimize=True)
print("ok")
