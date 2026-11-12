# Exporta a montagem detalhada para o MANUAL DE MONTAGEM (site/manual/montagem.glb, Y para cima, em mm):
# um nó por objeto da montagem (cada peça impressa, resistor, perna, terminal, parafuso, fio...), com a cor real
# por vértice e as texturas dos adesivos (furação da protoboard, nomes dos pinos). O manual (site/manual/manual.js)
# escolhe, passo a passo, o que aparece, o que é destacado e o que é animado.
#   /Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd site/ferramentas/exportar_glb_manual.py
# Depois: npx @gltf-transform/cli@4.1.1 meshopt site/manual/montagem.glb site/manual/montagem.min.glb
import json
import os
import re
import struct
import zipfile

import FreeCAD as App

RAIZ = os.getcwd()
MONT = os.path.join(RAIZ, "cad", "montagem", "IoT3D_v3_montagem.FCStd")
TEX = os.path.join(RAIZ, "cad", "montagem", "texturas")
OUT = os.path.join(RAIZ, "site", "manual", "montagem.glb")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
TOL = {"Tubo_PVC_DN100": 0.3, "Cap_superior": 0.3, "Vasilha_inox": 0.3}


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
        cores[m.group(1)] = (b[11] / 255, b[10] / 255, b[9] / 255)
    return cores


def malha(shape, tol, cor):
    pos, nor, idx, col = [], [], [], []
    for f in shape.Faces:
        try:
            pts, tris = f.tessellate(tol)
        except Exception:
            continue
        if not tris:
            continue
        base = len(pos) // 3
        acum = [[0.0, 0.0, 0.0] for _ in pts]
        for a, b, c in tris:
            n = (pts[b] - pts[a]).cross(pts[c] - pts[a])
            for k in (a, b, c):
                acum[k][0] += n.x; acum[k][1] += n.y; acum[k][2] += n.z
        for p, n in zip(pts, acum):
            l = (n[0] ** 2 + n[1] ** 2 + n[2] ** 2) ** 0.5 or 1.0
            pos += [p.x, p.z, -p.y]                      # Z-up → Y-up
            nor += [n[0] / l, n[2] / l, -n[1] / l]
            col += [c ** 2.2 for c in cor]               # glTF guarda cor de vértice linear
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


def add_mesh(nome, pos, nor, idx, col=None, uv=None, material=None, extras=None):
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
    n = {"name": nome, "mesh": len(meshes) - 1}
    if extras:
        n["extras"] = extras
    nodes.append(n)


cores = cores_montagem()
dm = App.openDocument(MONT)
grupo_de = {}
for g in dm.Objects:
    if g.TypeId == "App::DocumentObjectGroup":
        for x in g.Group:
            grupo_de[x.Name] = g.Label
texturas = json.load(open(os.path.join(RAIZ, "cad", "montagem", "texturas.json")))

def eixo_do_fio(o):
    """Linha central de um fio varrido: média de cada seção circular da face lateral (em Y para cima)."""
    f = max(o.Shape.Faces, key=lambda x: x.Area)
    u0, u1, v0, v1 = f.ParameterRange
    ao_longo_de_v = f.valueAt(u0, v0).distanceToPoint(f.valueAt(u0, v1)) > f.valueAt(u0, v0).distanceToPoint(f.valueAt(u1, v0))
    pts = []
    for i in range(61):
        t = i / 60
        roda = [f.valueAt(u0 + (u1 - u0) * k / 8, v0 + (v1 - v0) * t) if ao_longo_de_v else
                f.valueAt(u0 + (u1 - u0) * t, v0 + (v1 - v0) * k / 8) for k in range(8)]
        c = sum(roda, App.Vector()) * (1 / 8)
        if not pts or (c - App.Vector(*pts[-1])).Length > 0.6:
            pts.append((c.x, c.y, c.z))
    return [[round(x, 2), round(z, 2), round(-y, 2)] for x, y, z in pts]


fios = {}
n_obj = 0
for o in dm.Objects:
    if not hasattr(o, "Shape") or o.TypeId != "Part::Feature" or o.Shape.isNull():
        continue
    cor = cores.get(o.Name, (0.6, 0.6, 0.6))
    if o.Label.startswith(("Fio_", "Servo_fio_")):           # fio: só o traçado; o manual.js desenha o tubo
        fios[o.Label] = {"cor": "#%02x%02x%02x" % tuple(int(255 * k) for k in cor), "pts": eixo_do_fio(o)}
        continue
    tol = TOL.get(o.Label, 0.12 if o.Label.startswith("P") else 0.06)
    pos, nor, idx, col = malha(o.Shape, tol, cor)
    add_mesh(o.Label, pos, nor, idx, col, extras={"grupo": grupo_de.get(o.Name, "")})
    n_obj += 1

# adesivos com textura: só a face da frente (−Y), UV pelo retângulo em X × Z (mesmo mapeamento do Coin no FreeCAD)
for nome, arq in texturas.items():
    o = dm.getObject(nome)
    if o is None:
        continue
    face = min(o.Shape.Faces, key=lambda f: f.normalAt(*f.ParameterRange[0::2]).y)
    bb = face.BoundBox
    pts, tris = face.tessellate(0.05)
    pos, nor, uv = [], [], []
    longo_x = bb.XLength >= bb.ZLength
    for p in pts:
        pos += [p.x, p.z, -(p.y - 0.02)]
        nor += [0.0, 0.0, 1.0]
        fx, fz = (p.x - bb.XMin) / bb.XLength, (p.z - bb.ZMin) / bb.ZLength
        s, t = (fx, fz) if longo_x else (fz, fx)
        uv += [s, 1 - t]
    idx = [i for t in tris for i in t]
    web = os.path.join(TEX, "web", arq.replace(".png", ".jpg"))
    dados = open(web if os.path.exists(web) else os.path.join(TEX, arq), "rb").read()
    images.append({"bufferView": add_view(dados), "mimeType": "image/jpeg" if os.path.exists(web) else "image/png"})
    textures.append({"source": len(images) - 1})
    materials.append({"pbrMetallicRoughness": {"baseColorTexture": {"index": len(textures) - 1}, "metallicFactor": 0, "roughnessFactor": 0.7}})
    add_mesh(nome + "#tex", pos, nor, idx, uv=uv, material=len(materials) - 1)

gltf = {"asset": {"version": "2.0", "generator": "alimentador-v3-manual", "extras": {"fios": fios}}, "scene": 0,
        "scenes": [{"nodes": list(range(len(nodes)))}], "nodes": nodes, "meshes": meshes,
        "accessors": accessors, "bufferViews": views, "buffers": [{"byteLength": 0}]}
if images:
    gltf.update(images=images, textures=textures, materials=materials, samplers=[{"magFilter": 9729, "minFilter": 9987}])
    for t in textures:
        t["sampler"] = 0
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
print("glb", n_obj, "objetos", len(nodes), "nós", round(total / 1e6, 2), "MB")
