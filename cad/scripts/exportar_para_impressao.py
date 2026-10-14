# Exporta as peças imprimíveis (objetos "Pxx_*"; padrão IoT3D_v3.FCStd → impressao_v3/; DOC=/OUT= para outro):
#   - um sólido fechado por arquivo
#   - deitada sobre a maior face plana de apoio (face com a peça inteira de um lado só)
#   - centralizada em X/Y e apoiada em Z = 0
#   - STL binário + 3MF, com checagem de malha
#
# Rodar da raiz do projeto (depois de gerar_v2.py):
#   cad/scripts/fc.sh "cad/scripts/exportar_para_impressao.py"
import glob
import math
import os

import FreeCAD as App
import MeshPart

ROOT = os.getcwd()
DOC = os.environ.get("DOC", os.path.join(ROOT, "cad", "IoT3D_v3.FCStd"))
OUT = os.environ.get("OUT", os.path.join(ROOT, "cad", "impressao_v3"))


def face_de_apoio(solid):
    pts = [v.Point for v in solid.Vertexes]
    melhores = []
    for f in solid.Faces:
        if f.Surface.__class__.__name__ != "Plane":
            continue
        n = f.normalAt(*f.Surface.parameter(f.CenterOfMass))
        c = f.CenterOfMass
        if all((p - c).dot(n) <= 0.05 for p in pts):   # peça inteira atrás da face
            melhores.append((f.Area, n))
    return max(melhores, key=lambda t: t[0])


def deitar_na_mesa(solid):
    area, n = face_de_apoio(solid)
    s = solid.copy()
    if (n - App.Vector(0, 0, -1)).Length > 1e-6:
        rot = App.Rotation(n, App.Vector(0, 0, -1))
        s.rotate(App.Vector(0, 0, 0), rot.Axis, math.degrees(rot.Angle))
    b = s.BoundBox
    s.translate(App.Vector(-(b.XMin + b.XMax) / 2, -(b.YMin + b.YMax) / 2, -b.ZMin))
    return s, area


def main():
    os.makedirs(OUT, exist_ok=True)
    for antigo in glob.glob(os.path.join(OUT, "*.stl")) + glob.glob(os.path.join(OUT, "*.3mf")):
        os.remove(antigo)
    doc = App.openDocument(DOC)
    for o in sorted((o for o in doc.Objects if o.Label.startswith("P")), key=lambda o: o.Label):
        if len(o.Shape.Solids) != 1:
            raise RuntimeError("%s tem %d sólidos" % (o.Label, len(o.Shape.Solids)))
        solid, area = deitar_na_mesa(o.Shape.Solids[0])
        mesh = MeshPart.meshFromShape(Shape=solid, LinearDeflection=0.02, AngularDeflection=0.0872665, Relative=False)
        ok = mesh.isSolid() and not mesh.hasNonManifolds() and not mesh.hasSelfIntersections()
        for ext in ("stl", "3mf"):
            mesh.write(os.path.join(OUT, "%s.%s" % (o.Label, ext)))
        b = mesh.BoundBox
        print("%-32s %s  %5.1f x %5.1f x %5.1f mm  vol=%7.0f mm3  face na mesa=%.0f mm2" % (
            o.Label, "OK  " if ok else "ERRO", b.XLength, b.YLength, b.ZLength, mesh.Volume, area))


main()
