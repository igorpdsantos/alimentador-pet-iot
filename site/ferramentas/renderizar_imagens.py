# Renderiza as imagens do site (site/img/) a partir do modelo v3, com a mesma paleta do visualizador 3D.
# Roda DENTRO do FreeCAD com interface (console Python ou macro):
#   exec(open("<raiz>/site/ferramentas/renderizar_imagens.py").read())
# Depois, cortar as margens:  python3 site/ferramentas/aparar_imagens.py
import os

import FreeCAD
import FreeCADGui
import Part
from FreeCAD import Vector as V

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) if "__file__" in dir() else \
    os.getcwd()
IMG = os.path.join(RAIZ, "site", "img")
os.makedirs(os.path.join(IMG, "pecas"), exist_ok=True)

H = lambda h: tuple(((h >> s) & 255) / 255 for s in (16, 8, 0))
COR = {"grafite": H(0x3a403d), "cinza": H(0xc3c8c1), "sinal": H(0xf2be0f), "branco": H(0xf3f4f0),
       "inox": H(0xc9cdd3), "aluminio": H(0xc9ced6), "servo": H(0x1b1f22), "pilhas": H(0x30343a), "placa": H(0xe6e3da), "ima": H(0x9aa0a8)}


def cor(nome):   # mesma paleta do site: estrutura grafite, o que mexe/abre em amarelo, balança cinza
    tab = {"REF_tubo_PVC_DN100": "branco", "REF_cap_superior": "branco", "REF_vasilha_maior": "inox",
           "REF_celula_5kg": "aluminio", "REF_servo_MG90S_360": "servo", "REF_braco_servo": "branco",
           "REF_pilhas_6AA": "pilhas", "REF_protoboard_ESP32_modulos": "placa", "REF_imas_6x2_gaveta": "ima"}
    if nome in tab:
        return COR[tab[nome]]
    c = nome[:3]
    if c in ("P03", "P11", "P13"):
        return COR["sinal"]
    if c in ("P07", "P08", "P09"):
        return COR["cinza"]
    return COR["grafite"]


doc = FreeCAD.openDocument(os.path.join(RAIZ, "cad", "IoT3D_v3.FCStd"))
gd = FreeCADGui.getDocument(doc.Name)
FreeCADGui.ActiveDocument = gd
v = gd.ActiveView
try:
    v.setAxisCross(False)
except Exception:
    pass
v.setCameraType("Perspective")
for o in doc.Objects:
    o.ViewObject.ShapeColor = cor(o.Label)
    o.ViewObject.Transparency = 0
    o.ViewObject.LineColor = (0.09, 0.1, 0.1)
    o.ViewObject.LineWidth = 1.0
todos = [o.Label for o in doc.Objects]
pecas = [n for n in todos if n[:1] == "P" and n[1:3].isdigit()]
refs = [n for n in todos if n.startswith("REF_")]


def mostrar(nomes):
    for o in doc.Objects:
        o.ViewObject.Visibility = o.Label in nomes


def foto(arq, w=1600, h=1200, vista="iso", girar=0):
    {"iso": v.viewIsometric, "frente": v.viewFront}[vista]()
    if girar:
        v.setCameraOrientation(FreeCAD.Rotation(V(0, 0, 1), girar).multiply(v.getCameraOrientation()))
    v.fitAll()
    v.saveImage(os.path.join(IMG, arq), w, h, "Transparent")


for p in pecas:                                                     # miniaturas
    mostrar([p])
    foto("pecas/%s.png" % p, 800, 600)

mostrar(pecas + refs)                                               # conjunto
doc.getObject("REF_tubo_PVC_DN100").ViewObject.Transparency = 72
doc.getObject("REF_cap_superior").ViewObject.Transparency = 45
foto("conjunto.png", 1400, 1800)

quarto = Part.makeBox(400, 400, 1000, V(0, -400, -100))             # corte em quarto
tmp = []
for n in pecas + refs:
    if n == "REF_vasilha_maior" or n.startswith(("P07", "P08", "P09", "P12_pata_F", "P13_tampa_F")):
        continue
    s = doc.getObject(n).Shape.cut(quarto)
    if s.Volume < 1:
        continue
    t = doc.addObject("Part::Feature", "TMPc_" + n)
    t.Shape = s
    t.ViewObject.ShapeColor = cor(n)
    t.ViewObject.LineColor = (0.09, 0.1, 0.1)
    tmp.append(t.Name)
doc.recompute()
for o in doc.Objects:
    o.ViewObject.Visibility = o.Name in tmp or o.Label in ("P07_base_balanca", "P08_plataforma", "P09_espacador", "REF_vasilha_maior")
foto("corte.png", 1400, 1800)
for n in tmp:
    doc.removeObject(n)

mostrar(["P01_piso_dosador", "P02_anel_escudo", "P03_rotor", "P10_chapeu", "REF_servo_MG90S_360", "REF_braco_servo"])
foto("cartucho.png", 1400, 1200)

mostrar(["P06_pedestal", "P11_gaveta_pilhas", "REF_pilhas_6AA", "REF_imas_6x2_gaveta"] + [n for n in pecas if n.startswith(("P12", "P13"))])
for n in ("P11_gaveta_pilhas", "REF_pilhas_6AA"):
    doc.getObject(n).Placement.Base = V(-55, 0, 0)
foto("pedestal.png", 1400, 1000, girar=-90)

mostrar(["P07_base_balanca", "P08_plataforma", "P09_espacador", "REF_celula_5kg"])
doc.getObject("P08_plataforma").ViewObject.Transparency = 55
foto("balanca.png", 1400, 1000)

FreeCAD.closeDocument(doc.Name)                                    # descarta as mudanças de vista
FreeCAD.openDocument(os.path.join(RAIZ, "cad", "IoT3D_v3.FCStd"))
print("imagens em", IMG)
