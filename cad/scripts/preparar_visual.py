# Roda DENTRO do FreeCAD com interface (via preparar_visual.sh): deixa tudo visível, aplica cores,
# enquadra em isométrico e salva — assim o IoT3D_v2.FCStd abre pronto para ver.
import os
import FreeCAD
import FreeCADGui

CAMINHO = os.environ["FCSTD"]
CORES = {
    "P01": (0.85, 0.25, 0.25), "P02": (0.55, 0.20, 0.60), "P03": (0.20, 0.45, 0.85),
    "P04": (0.25, 0.65, 0.30), "P05": (0.95, 0.60, 0.15), "P06": (0.65, 0.50, 0.85),
    "P08": (0.20, 0.70, 0.80), "P09": (0.75, 0.75, 0.25), "P10": (0.55, 0.40, 0.30),
    "P11": (0.90, 0.55, 0.75), "P12": (0.50, 0.50, 0.50),
}
log = open(os.environ["LOG"], "w")
try:
    doc = FreeCAD.openDocument(CAMINHO)
    FreeCADGui.ActiveDocument = FreeCADGui.getDocument(doc.Name)
    for o in doc.Objects:
        vo = o.ViewObject
        vo.Visibility = True
        if o.Label.startswith("REF_"):
            vo.ShapeColor = (0.80, 0.80, 0.80)
            vo.Transparency = 75
        else:
            vo.ShapeColor = CORES.get(o.Label[:3], (0.7, 0.7, 0.7))
    view = FreeCADGui.ActiveDocument.ActiveView
    view.viewIsometric()
    view.fitAll()
    doc.save()
    log.write("OK %d objetos visíveis\n" % len(doc.Objects))
except Exception:
    import traceback
    log.write(traceback.format_exc())
log.close()
os._exit(0)
