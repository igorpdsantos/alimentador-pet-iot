# Renderiza cada componente comprado (site/img/comp/<id>.png) a partir da montagem detalhada, para o passo a passo.
# Roda DENTRO do FreeCAD com interface, com a montagem aberta pela macro abrir_montagem.FCMacro (texturas):
#   exec(open("<raiz>/site/ferramentas/renderizar_componentes.py").read())
# Depois: python3 site/ferramentas/aparar_imagens.py
import os

import FreeCAD
import FreeCADGui
from PySide import QtGui

RAIZ = os.getcwd()  # rodar com a raiz do projeto como pasta atual
OUT = os.path.join(RAIZ, "site", "img", "comp")
os.makedirs(OUT, exist_ok=True)

COMPONENTES = {   # id → prefixos (ou nomes) dos objetos na montagem
    "esp32": ["ESP32_"], "hx711": ["HX711_"], "mp1584": ["MP1584_"],
    "servo": ["Servo_MG90S_360", "Servo_braco_duplo", "Servo_saida_cabo"], "celula": ["Celula_"],
    "protoboard": ["Protoboard_"], "jack": ["Jack_P4_"], "chave": ["Chave_KCD11_"], "botao": ["Botao_"],
    "led": ["LED_"], "pilhas": ["Suporte_6xAA", "Pilha_AA_"], "diodo": ["D1_1N5819_fonte"],
    "resistor": ["R1_100k_fonte"], "cap_eletrolitico": ["C3_470uF"], "cap_ceramico": ["C1_100nF_GPIO35"],
    "m3x8": ["Parafuso_M3x8_moldura_0"], "m3x10": ["Parafuso_M3x10_cartucho_0"], "m3x12": ["Parafuso_M3x12_braco_0"],
    "m3x20": ["Parafuso_M3x20_pedestal_0"], "m5x16": ["Parafuso_M5x16_celula_fixo_0"], "m4x16": ["Parafuso_M4x16_celula_livre_0"],
    "imas": ["Imas_neodimio"], "tubo": ["Tubo_PVC_DN100"], "cap": ["Cap_superior"], "vasilha": ["Vasilha_inox"],
}

d = [x for x in FreeCAD.listDocuments().values() if "montagem" in x.FileName.lower()][0]
mdi = FreeCADGui.getMainWindow().findChild(QtGui.QMdiArea)
for w in mdi.subWindowList():
    if "montagem" in w.windowTitle().lower():
        mdi.setActiveSubWindow(w)
FreeCAD.setActiveDocument(d.Name)
v = FreeCADGui.getDocument(d.Name).ActiveView
try:
    v.setAxisCross(False)
except Exception:
    pass
v.setCameraType("Perspective")
objs = [o for o in d.Objects if o.TypeId != "App::DocumentObjectGroup"]
for cid, prefixos in COMPONENTES.items():
    for o in objs:
        vis = any(o.Label.startswith(p) for p in prefixos) and "fita" not in o.Label
        o.ViewObject.Visibility = vis
        if vis:
            o.ViewObject.Transparency = 0
    v.viewIsometric()
    v.fitAll()
    v.saveImage(os.path.join(OUT, cid + ".png"), 900, 700, "Transparent")
FreeCAD.closeDocument(d.Name)   # descarta as mudanças de vista
print("componentes em", OUT)
