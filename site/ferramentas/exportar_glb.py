# Exporta o alimentador para site/modelo/alimentador.glb (Y para cima, em mm):
#  - peças impressas, tubo, tampão e vasilha do modelo v3 (uma malha por peça; cor e material ficam no app.js);
#  - componentes da montagem detalhada (placas, servo, pilhas, célula, ímãs, parafusos e fios), cada conjunto numa
#    malha só com a cor original de cada objeto por vértice, e os adesivos das placas com a textura de verdade.
# Nomes "hospede#sufixo" acompanham a peça hospedeira no explodir (parafusos).
#   /Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd site/ferramentas/exportar_glb.py
# Depois: npx @gltf-transform/cli@4.1.1 meshopt site/modelo/alimentador.glb site/modelo/alimentador.min.glb
import json
import os
import re
import struct
import zipfile

import FreeCAD as App

RAIZ = os.getcwd()
V3 = os.path.join(RAIZ, "cad", "IoT3D_v3.FCStd")
MONT = os.path.join(RAIZ, "cad", "montagem", "IoT3D_v3_montagem.FCStd")
TEX = os.path.join(RAIZ, "cad", "montagem", "texturas")
OUT = os.path.join(RAIZ, "site", "modelo", "alimentador.glb")
TOL = {"REF_tubo_PVC_DN100": 0.35, "REF_cap_superior": 0.35, "REF_vasilha_maior": 0.3}
DO_V3 = ("REF_tubo_PVC_DN100", "REF_cap_superior", "REF_vasilha_maior")   # o resto das referências vem da montagem


def cores_montagem():
    """Cor difusa de cada objeto, lida do GuiDocument.xml (ShapeAppearance) — o freecadcmd não tem ViewObject."""
    z = zipfile.ZipFile(MONT)
    gui = z.read("GuiDocument.xml").decode("utf-8")
    cores = {}
    for m in re.finditer(r'<ViewProvider name="([^"]+)"(.*?)</ViewProvider>', gui, re.S):
        a = re.search(r'name="ShapeAppearance".*?file="([^"]+)"', m.group(2), re.S)
        if not a:
            continue
        b = z.read(a.group(1))
        if len(b) < 12:
            continue
        r, g, bl = b[11], b[10], b[9]          # difusa: 4.º ao 1.º byte do 2.º uint32 (RGBA little-endian)
        cores[m.group(1)] = (r / 255, g / 255, bl / 255)
    return cores


def malha(shape, tol, cor=None, so_face=None):
    pos, nor, idx, col, uv = [], [], [], [], []
    for f in shape.Faces:
        if so_face is not None and f.hashCode() != so_face.hashCode():
            continue
        try:
            pts, tris = f.tessellate(tol)
        except Exception:
            continue
        if not tris:
            continue
        base = len(pos) // 3
        acum = [[0.0, 0.0, 0.0] for _ in pts]
        for a, b, c in tris:
            pa, pb, pc = pts[a], pts[b], pts[c]
            n = (pb - pa).cross(pc - pa)
            for k in (a, b, c):
                acum[k][0] += n.x; acum[k][1] += n.y; acum[k][2] += n.z
        for p, n in zip(pts, acum):
            l = (n[0] ** 2 + n[1] ** 2 + n[2] ** 2) ** 0.5 or 1.0
            pos += [p.x, p.z, -p.y]                      # Z-up → Y-up
            nor += [n[0] / l, n[2] / l, -n[1] / l]
            if cor:
                col += [c ** 2.2 for c in cor]           # glTF guarda cor de vértice linear
        for a, b, c in tris:
            idx += [base + a, base + b, base + c]
    return pos, nor, idx, col


nodes, meshes, accessors, views, materials, textures, images = [], [], [], [], [], [], []
blob = bytearray()


def add_view(data, target=None):
    global blob
    while len(blob) % 4:
        blob += b"\0"
    v = {"buffer": 0, "byteOffset": len(blob), "byteLength": len(data)}
    if target:
        v["target"] = target
    views.append(v)
    blob += data
    return len(views) - 1


def add_mesh(nome, pos, nor, idx, col=None, uv=None, material=None):
    if not idx:
        return
    nv = len(pos) // 3
    xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
    attrs = {}
    accessors.append({"bufferView": add_view(struct.pack("<%df" % len(pos), *pos), 34962), "componentType": 5126, "count": nv,
                      "type": "VEC3", "min": [min(xs), min(ys), min(zs)], "max": [max(xs), max(ys), max(zs)]})
    attrs["POSITION"] = len(accessors) - 1
    accessors.append({"bufferView": add_view(struct.pack("<%df" % len(nor), *nor), 34962), "componentType": 5126, "count": nv, "type": "VEC3"})
    attrs["NORMAL"] = len(accessors) - 1
    if col:
        accessors.append({"bufferView": add_view(struct.pack("<%df" % len(col), *col), 34962), "componentType": 5126, "count": nv, "type": "VEC3"})
        attrs["COLOR_0"] = len(accessors) - 1
    if uv:
        accessors.append({"bufferView": add_view(struct.pack("<%df" % len(uv), *uv), 34962), "componentType": 5126, "count": nv, "type": "VEC2"})
        attrs["TEXCOORD_0"] = len(accessors) - 1
    big = nv > 65535
    accessors.append({"bufferView": add_view(struct.pack("<%d%s" % (len(idx), "I" if big else "H"), *idx), 34963),
                      "componentType": 5125 if big else 5123, "count": len(idx), "type": "SCALAR"})
    prim = {"attributes": attrs, "indices": len(accessors) - 1}
    if material is not None:
        prim["material"] = material
    meshes.append({"name": nome, "primitives": [prim]})
    nodes.append({"name": nome, "mesh": len(meshes) - 1})


# ------------------------------------------------------------------ 1. peças do v3
d3 = App.openDocument(V3)
centro_pata = {}
for o in d3.Objects:
    rotulo = o.Label
    if rotulo.startswith("P12"):
        c = o.Shape.BoundBox.Center
        centro_pata[rotulo] = (c.x, c.y)
    if not (rotulo[:1] == "P" and rotulo[1:3].isdigit()) and rotulo not in DO_V3:
        continue
    pos, nor, idx, _ = malha(o.Shape, TOL.get(rotulo, 0.12))
    add_mesh(rotulo, pos, nor, idx)

# ------------------------------------------------------------------ 2. componentes da montagem
cores = cores_montagem()
dm = App.openDocument(MONT)
grupo_de = {}
for g in dm.Objects:
    if g.TypeId == "App::DocumentObjectGroup":
        for x in g.Group:
            grupo_de[x.Name] = g.Label
texturas = json.load(open(os.path.join(RAIZ, "cad", "montagem", "texturas.json")))
PAINEL = ("Jack_P4", "Chave_KCD11", "Botao_", "LED_")      # o painel do pedestal é desenhado (e clicável) no app.js


def conjunto(o):
    """Em qual malha do site o objeto entra (None = fica de fora)."""
    n, g = o.Label, grupo_de.get(o.Name, "")
    if n.startswith(("Txt", "ESP32_fita")) or n.startswith(PAINEL) or n in texturas:
        return None
    if g.startswith(("4 ", "5 ")):
        return "REF_protoboard_ESP32_modulos"
    if g.startswith("8 "):
        return "REF_fios"
    if n == "Servo_braco_duplo":
        return "REF_braco_servo"
    if g.startswith("6 "):
        return "REF_servo_MG90S_360"
    if n.startswith(("Suporte_6xAA", "Pilha_AA")):
        return "REF_pilhas_6AA"
    if g.startswith("7 "):
        return "REF_celula_5kg"
    if n.startswith("Imas"):
        return "REF_imas_6x2_gaveta"
    if n.startswith("Parafuso_"):
        if "_pedestal" in n:
            return "P06_pedestal#paraf"
        if "_cartucho" in n or "_moldura" in n:
            return "P01_piso_dosador#paraf"
        if "_braco" in n or "_batente" in n:
            return "P07_base_balanca#paraf"
        if "_celula" in n:
            return "REF_celula_5kg#paraf"
        if "_pata" in n:
            c = o.Shape.BoundBox.Center
            perto = min(centro_pata, key=lambda k: (centro_pata[k][0] - c.x) ** 2 + (centro_pata[k][1] - c.y) ** 2)
            return perto + "#paraf"
    return None


def eixo_do_fio(o):
    """Linha central de um fio varrido: média de cada seção circular da face lateral (em Y para cima)."""
    f = max(o.Shape.Faces, key=lambda x: x.Area)
    u0, u1, v0, v1 = f.ParameterRange
    ao_longo_de_v = f.valueAt(u0, v0).distanceToPoint(f.valueAt(u0, v1)) > f.valueAt(u0, v0).distanceToPoint(f.valueAt(u1, v0))
    pts = []
    for i in range(41):
        t = i / 40
        roda = [f.valueAt(u0 + (u1 - u0) * k / 8, v0 + (v1 - v0) * t) if ao_longo_de_v else
                f.valueAt(u0 + (u1 - u0) * t, v0 + (v1 - v0) * k / 8) for k in range(8)]
        c = sum(roda, App.Vector()) * (1 / 8)
        if not pts or (c - App.Vector(*pts[-1])).Length > 0.8:
            pts.append((c.x, c.y, c.z))
    return [[round(x, 2), round(z, 2), round(-y, 2)] for x, y, z in pts]


fios = []
lotes = {}
for o in dm.Objects:
    if not hasattr(o, "Shape") or o.Shape.isNull() or o.TypeId == "App::DocumentObjectGroup":
        continue
    if o.Label.startswith(("Fio_", "Servo_fio_")):
        c = cores.get(o.Name, (0.6, 0.6, 0.6))
        fios.append({"cor": "#%02x%02x%02x" % tuple(int(255 * k) for k in c), "pts": eixo_do_fio(o)})
        continue
    alvo = conjunto(o)
    if not alvo:
        continue
    pos, nor, idx, col = malha(o.Shape, 0.08 if alvo == "REF_fios" else 0.06, cores.get(o.Name, (0.6, 0.6, 0.6)))
    L = lotes.setdefault(alvo, [[], [], [], []])
    base = len(L[0]) // 3
    L[0] += pos; L[1] += nor; L[3] += col
    L[2] += [base + i for i in idx]
for alvo, (pos, nor, idx, col) in lotes.items():
    add_mesh(alvo, pos, nor, idx, col)
    if alvo == "REF_fios":
        nodes[-1]["extras"] = {"fios": fios}      # o app.js desenha cada fio como tubo a partir do traçado

# adesivos com textura: só a face da frente (−Y), UV pelo retângulo em X × Z
for nome, arq in texturas.items():
    o = dm.getObject(nome)
    if o is None:
        continue
    face = min(o.Shape.Faces, key=lambda f: f.normalAt(*f.ParameterRange[0::2]).y)
    bb = face.BoundBox
    pts, tris = face.tessellate(0.05)
    pos, nor, uv = [], [], []
    # mesmo mapeamento do Coin no FreeCAD: s ao longo do lado mais comprido da face, t ao longo do outro
    longo_x = bb.XLength >= bb.ZLength
    for p in pts:
        pos += [p.x, p.z, -p.y]
        nor += [0.0, 0.0, 1.0]
        fx, fz = (p.x - bb.XMin) / bb.XLength, (p.z - bb.ZMin) / bb.ZLength
        s, t = (fx, fz) if longo_x else (fz, fx)
        uv += [s, 1 - t]
    idx = [i for t in tris for i in t]
    web = os.path.join(TEX, "web", arq.replace(".png", ".jpg"))       # JPEG gerado por texturas_montagem.py
    dados = open(web if os.path.exists(web) else os.path.join(TEX, arq), "rb").read()
    images.append({"bufferView": add_view(dados), "mimeType": "image/jpeg" if os.path.exists(web) else "image/png"})
    textures.append({"source": len(images) - 1})
    materials.append({"pbrMetallicRoughness": {"baseColorTexture": {"index": len(textures) - 1}, "metallicFactor": 0, "roughnessFactor": 0.7}})
    hospede = "REF_protoboard_ESP32_modulos"
    add_mesh(hospede + "#tex", pos, nor, idx, uv=uv, material=len(materials) - 1)

gltf = {"asset": {"version": "2.0", "generator": "alimentador-v3"}, "scene": 0,
        "scenes": [{"nodes": list(range(len(nodes)))}], "nodes": nodes, "meshes": meshes,
        "accessors": accessors, "bufferViews": views, "buffers": [{"byteLength": len(blob)}]}
if images:
    gltf.update(images=images, textures=textures, materials=materials,
                samplers=[{"magFilter": 9729, "minFilter": 9987}])
    for t in textures:
        t["sampler"] = 0
js = json.dumps(gltf, separators=(",", ":")).encode()
while len(js) % 4:
    js += b" "
while len(blob) % 4:
    blob += b"\0"
gltf["buffers"][0]["byteLength"] = len(blob)
js = json.dumps(gltf, separators=(",", ":")).encode()
while len(js) % 4:
    js += b" "
total = 12 + 8 + len(js) + 8 + len(blob)
with open(OUT, "wb") as f:
    f.write(struct.pack("<III", 0x46546C67, 2, total))
    f.write(struct.pack("<II", len(js), 0x4E4F534A) + js)
    f.write(struct.pack("<II", len(blob), 0x004E4942) + blob)
print("glb", len(nodes), "malhas", round(total / 1e6, 2), "MB")
