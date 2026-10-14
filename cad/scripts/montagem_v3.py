# Montagem detalhada do alimentador v3 — roda DENTRO do FreeCAD com interface (via console Python ou macro).
# Cria o documento "Montagem_v3" com as peças impressas, os componentes reais (cores, texturas com o nome
# dos pinos), parafusos e todos os fios, exatamente nas posições do projeto.
#   Pré-requisitos: exportar_dados_montagem.py (brep + params.json) e texturas_montagem.py (PNG).
#   Uso no console Python do FreeCAD:
#       import sys; sys.path.insert(0, ".../cad/scripts"); import montagem_v3 as m
#       m.tudo()            # ou m.etapa1() ... m.etapa8()
#       m.aplicar_texturas()  # depois de reabrir o arquivo salvo (textura não fica gravada no .FCStd)
import json
import math
import os

import FreeCAD as App
import FreeCADGui as Gui
import Part

V = App.Vector
BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "montagem")
P = json.load(open(os.path.join(BASE, "params.json")))
TEX = os.path.join(BASE, "texturas")
DOC = "Montagem_v3"

COR = {"vermelho": (0.85, 0.08, 0.08), "preto": (0.08, 0.08, 0.08), "amarelo": (0.95, 0.83, 0.12),
       "laranja": (1.0, 0.5, 0.0), "verde": (0.12, 0.65, 0.22), "azul": (0.12, 0.32, 0.9),
       "branco": (0.95, 0.95, 0.95), "roxo": (0.55, 0.2, 0.8), "cinza": (0.55, 0.55, 0.55),
       "ciano": (0.0, 0.75, 0.85), "marrom": (0.45, 0.25, 0.1), "metal": (0.78, 0.78, 0.8),
       "ouro": (0.85, 0.7, 0.3), "pcb_preto": (0.07, 0.07, 0.09), "pcb_verde": (0.08, 0.47, 0.24),
       "pcb_azul": (0.1, 0.27, 0.63), "aluminio": (0.82, 0.83, 0.85), "petg": (0.93, 0.93, 0.9),
       "pvc": (0.97, 0.97, 0.97)}

# ---------------------------------------------------------------- protoboard: mapa de furos (igual às texturas)
PITCH = 2.54
LINHAS = {"a": -13.97, "b": -11.43, "c": -8.89, "d": -6.35, "e": -3.81,
          "f": 3.81, "g": 6.35, "h": 8.89, "i": 11.43, "j": 13.97}
TRILHO = {"5V": -24.13, "GND_E": -21.59, "GND_D": 21.59, "3V3": 24.13}
Y_FACE = P["Y_ESP"] - P["PROTO"][2]          # face da frente da protoboard (componentes para −Y)


def z_col(c):
    return P["Z_PROTO0"] + (P["PROTO"][1] - 62 * PITCH) / 2 + (c - 1) * PITCH


def furo(ref):
    """'c19' ou 'GND_E@40' -> ponto (x, y, z) na face da protoboard."""
    if "@" in ref:
        t, c = ref.split("@")
        return V(TRILHO[t], Y_FACE, z_col(int(c)))
    return V(LINHAS[ref[0]], Y_FACE, z_col(int(ref[1:])))


# ---------------------------------------------------------------- utilidades de documento
def doc():
    # o arquivo salvo abre com o nome "IoT3D_v3_montagem"; só cria documento novo se nenhum dos dois estiver aberto
    for d in App.listDocuments().values():
        if d.Name == DOC or (d.FileName and os.path.basename(d.FileName) == "IoT3D_v3_montagem.FCStd"):
            return d
    return App.newDocument(DOC)


def grupo(nome):
    d = doc()
    achados = d.getObjectsByLabel(nome)
    if achados:
        return achados[0]
    g = d.addObject("App::DocumentObjectGroup", "Grupo")
    g.Label = nome
    return g


def add(nome, shape, cor, gr, transp=0):
    d = doc()
    old = d.getObject(nome)
    if old is not None:
        d.removeObject(nome)
    o = d.addObject("Part::Feature", nome)
    o.Shape = shape
    grupo(gr).addObject(o)
    vo = o.ViewObject
    vo.ShapeColor = cor if isinstance(cor, tuple) else COR[cor]
    vo.Transparency = transp
    return o


def texto(nome, txt, pos, gr):
    d = doc()
    if d.getObject(nome) is not None:
        d.removeObject(nome)
    a = d.addObject("App::Annotation", nome)
    a.LabelText = txt if isinstance(txt, list) else [txt]
    a.Position = pos
    grupo(gr).addObject(a)
    a.ViewObject.FontSize = 14
    a.ViewObject.TextColor = (0.1, 0.1, 0.5)
    return a


TEXTURAS = {}                                 # nome do objeto -> arquivo


def textura(nome, arquivo):
    TEXTURAS[nome] = arquivo
    _aplicar(nome, arquivo)


def _aplicar(nome, arquivo):
    from pivy import coin
    o = doc().getObject(nome)
    if o is None:
        return
    vo = o.ViewObject
    vo.ShapeColor = (1.0, 1.0, 1.0)
    tex = coin.SoTexture2()
    tex.filename = os.path.join(TEX, arquivo)
    tex.model = coin.SoTexture2.DECAL
    vo.RootNode.insertChild(tex, 1)


def aplicar_texturas():
    mapa = json.load(open(os.path.join(BASE, "texturas.json")))
    for nome, arq in mapa.items():
        _aplicar(nome, arq)


def vista(tipo="iso", fit=True):
    v = Gui.ActiveDocument.ActiveView
    {"iso": v.viewIsometric, "frente": v.viewFront, "direita": v.viewRight, "topo": v.viewTop,
     "tras": v.viewRear, "esquerda": v.viewLeft}[tipo]()
    if fit:
        Gui.SendMsgToActiveView("ViewFit")


def mostrar(nomes_grupos):
    d = doc()
    for g in d.Objects:
        if g.TypeId == "App::DocumentObjectGroup":
            ver = g.Label in nomes_grupos
            g.ViewObject.Visibility = ver
            for o in g.Group:
                o.ViewObject.Visibility = ver


def caixa(dx, dy, dz, cx, cy, z0):
    return Part.makeBox(dx, dy, dz, V(cx - dx / 2, cy - dy / 2, z0))


def cil(r, h, p, d=(0, 0, 1)):
    return Part.makeCylinder(r, h, p, V(*d))


def brep(nome):
    s = Part.Shape()
    s.read(os.path.join(BASE, "brep", nome + ".brep"))
    return s


# ================================================================ etapa 1 — estrutura (peças impressas + tubo)
def etapa1():
    d = doc()
    cores = {"P01": (0.85, 0.3, 0.25), "P02": (0.25, 0.45, 0.85), "P03": (0.25, 0.7, 0.35), "P04": (0.95, 0.6, 0.15),
             "P05": (0.6, 0.45, 0.8), "P06": (0.88, 0.88, 0.85), "P07": (0.7, 0.55, 0.35), "P08": (0.9, 0.9, 0.88),
             "P09": (0.5, 0.5, 0.5), "P10": (0.55, 0.75, 0.9), "P11": (0.9, 0.55, 0.2), "P12": (0.88, 0.88, 0.85), "P13": (0.82, 0.82, 0.78)}
    for nome in ["P06_pedestal", "P05_bandeja_espinha", "P01_piso_dosador", "P02_anel_escudo", "P03_rotor",
                 "P04_bica", "P07_base_balanca", "P08_plataforma", "P09_espacador", "P10_chapeu", "P11_gaveta_pilhas",
                 "P12_pata_TD", "P12_pata_TE", "P12_pata_FE", "P12_pata_FD",
                 "P13_tampa_TD", "P13_tampa_TE", "P13_tampa_FE", "P13_tampa_FD"]:
        add(nome, brep(nome), cores[nome[:3]], "1 Peças impressas")
    add("Tubo_PVC_DN100", brep("REF_tubo_PVC_DN100"), "pvc", "2 Comprados - mecânica", transp=70)
    add("Cap_superior", brep("REF_cap_superior"), "pvc", "2 Comprados - mecânica", transp=40)
    add("Vasilha_inox", brep("REF_vasilha_maior"), "metal", "2 Comprados - mecânica", transp=30)
    add("Imas_neodimio_6x2_gaveta", brep("REF_imas_6x2_gaveta"), (0.25, 0.25, 0.3), "2 Comprados - mecânica")
    d.recompute()
    vista("iso")


def hexagono(d_chaves, esp, p, eixo):
    """Porca sextavada: d_chaves = medida entre faces, eixo 'x' ou 'y'."""
    r = d_chaves / math.sqrt(3)
    pts = [V(r * math.cos(math.radians(60 * k)), r * math.sin(math.radians(60 * k)), 0) for k in range(6)]
    f = Part.Face(Part.makePolygon(pts + [pts[0]])).extrude(V(0, 0, esp))
    f.cut(cil(1.6, esp, V(0, 0, 0)))
    if eixo == "x":
        f.rotate(V(0, 0, 0), V(0, 1, 0), 90)
    else:
        f.rotate(V(0, 0, 0), V(1, 0, 0), -90)
    f.translate(p)
    return f


def selecionar_e_mostrar(nomes):
    Gui.Selection.clearSelection()
    for n in nomes:
        o = doc().getObject(n)
        if o is not None:
            Gui.Selection.addSelection(o)
    Gui.SendMsgToActiveView("ViewSelection")
    Gui.Selection.clearSelection()


# ================================================================ etapa 2 — pedestal: pilhas, jack, chave, botão, LED
def etapa2():
    d = doc()
    G = "3 Pedestal"
    z0, h = P["PED_FUNDO"], P["PILHAS"][2]
    w, l = P["PILHAS"][0], P["PILHAS"][1]
    # suporte 6×AA chato (preto, aberto em cima) + 6 pilhas deitadas ao longo de Y
    sup = caixa(w, l, h, 0, 0, z0).cut(caixa(w - 3, l - 3, h, 0, 0, z0 + 1.5))
    add("Suporte_6xAA", sup, "preto", G)
    for i in range(6):
        x = -36.25 + i * 14.5
        sentido = 1 if i % 2 == 0 else -1
        corpo = cil(7.25, 48.0, V(x, -24.0, z0 + 1.5 + 7.25), (0, 1, 0))
        add("Pilha_AA_%d" % (i + 1), corpo, (0.15, 0.15, 0.15), G)
        faixa = cil(7.3, 16.0, V(x, -24.0 if sentido > 0 else 8.0, z0 + 1.5 + 7.25), (0, 1, 0))
        add("Pilha_AA_%d_faixa" % (i + 1), faixa, (0.8, 0.5, 0.15), G)
        polo = cil(2.6, 1.2, V(x, 24.0 if sentido > 0 else -25.2, z0 + 1.5 + 7.25), (0, 1, 0))
        add("Pilha_AA_%d_polo" % (i + 1), polo, "metal", G)
    # jack P4 de painel (traseira, eixo +Y, z = 9)
    zj = 9.0
    add("Jack_P4_rosca", cil(4.0, 8.5, V(0, 63.0, zj), (0, 1, 0)), "metal", G)
    add("Jack_P4_flange", cil(5.5, 1.5, V(0, 70.2, zj), (0, 1, 0)), "metal", G)
    add("Jack_P4_porca", hexagono(11.0, 2.5, V(0, 64.0, zj), "y"), "metal", G)
    add("Jack_P4_corpo", cil(5.0, 13.0, V(0, 50.0, zj), (0, 1, 0)), "preto", G)
    for k, dz in enumerate((-3.0, 0.0, 3.0)):
        add("Jack_P4_terminal_%d" % k, caixa(2.5, 4.0, 0.4, 0, 48.0, zj + dz), "metal", G)
    # chave gangorra KCD11 (lateral direita, eixo +X)
    zc, yc = P["Z_PAINEL"], P["Y_CHAVE"]
    rx, rz = P["CHAVE_RECORTE"]
    add("Chave_KCD11_corpo", caixa(13.9, rx - 0.2, rz - 0.2, 56.0 + 6.95, yc, zc - (rz - 0.2) / 2), "preto", G)
    add("Chave_KCD11_moldura", caixa(1.8, 15.2, 10.2, 70.9, yc, zc - 5.1), "preto", G)
    gang = caixa(1.8, 12.0, 7.0, 72.7, yc, zc - 3.5)
    gang.rotate(V(71.8, yc, zc), V(0, 0, 1), 8)
    add("Chave_KCD11_gangorra", gang, (0.2, 0.2, 0.2), G)
    add("Chave_KCD11_marca_I", caixa(0.3, 0.8, 3.0, 73.7, yc - 3.5, zc - 1.5), "branco", G)
    for k, dy in enumerate((-3.5, 3.5)):
        add("Chave_KCD11_terminal_%d" % k, caixa(5.0, 2.8, 0.5, 53.5, yc + dy, zc), "metal", G)
    # botão de painel 12 mm (lateral direita)
    yb = P["Y_BOTAO"]
    xs = math.sqrt(P["PED_R"] ** 2 - yb ** 2)
    add("Botao_rosca", cil(6.0, xs - 50.0, V(50.0, yb, zc), (1, 0, 0)), "metal", G)
    add("Botao_cabeca", cil(7.5, 2.4, V(xs, yb, zc), (1, 0, 0)), "metal", G)
    add("Botao_atuador", cil(4.5, 1.2, V(xs + 2.4, yb, zc), (1, 0, 0)), (0.15, 0.15, 0.15), G)
    add("Botao_porca", hexagono(15.0, 2.5, V(60.4, yb, zc), "x"), "metal", G)
    for k, dz in enumerate((-2.5, 2.5)):
        add("Botao_terminal_%d" % k, caixa(4.0, 2.0, 0.5, 48.0, yb, zc + dz), "metal", G)
    # LED 5 mm (entra por dentro)
    yl = P["Y_LED"]
    xl = math.sqrt(P["PED_R"] ** 2 - yl ** 2)
    led = cil(2.5, xl + 0.6 - 59.5, V(59.5, yl, zc), (1, 0, 0)).fuse(Part.makeSphere(2.5, V(xl + 0.6, yl, zc)))
    add("LED_5mm", led, (0.2, 0.95, 0.3), G, transp=20)
    add("LED_flange", cil(2.9, 1.0, V(58.5, yl, zc), (1, 0, 0)), (0.2, 0.95, 0.3), G, transp=20)
    for k, dz in enumerate((-1.27, 1.27)):
        add("LED_perna_%s" % ("anodo" if k else "catodo"), cil(0.25, 8.0, V(50.5, yl, zc + dz), (1, 0, 0)), "metal", G)
    # parafusos tubo ↔ pedestal (M3 × 20, laterais)
    for k, az in enumerate((0, 180)):
        dvec = V(math.cos(math.radians(az)), math.sin(math.radians(az)), 0)
        p_cab = dvec * P["PED_R"] + V(0, 0, P["Z_TB"] + 7.5)
        add("Parafuso_M3x20_pedestal_%d" % k, cil(1.5, 20.0, p_cab, tuple(-dvec)).fuse(
            cil(2.75, 2.1, p_cab, tuple(dvec))), "metal", "9 Parafusos")
    texto("Txt_pilhas", ["Pilhas 6xAA (reserva)", "suporte chato 89x58x16"], V(0, -40, 30), G)
    texto("Txt_jack", "Jack P4 12 V (traseira)", V(0, 80, 20), G)
    texto("Txt_lateral", ["Lateral direita:", "LED | chave | botão"], V(85, 0, 25), G)
    o = d.getObject("P06_pedestal")
    o.ViewObject.Transparency = 65
    d.getObject("P05_bandeja_espinha").ViewObject.Transparency = 65
    d.recompute()
    vista("iso", fit=False)
    selecionar_e_mostrar(["P06_pedestal"])


def enquadrar(nomes, zoom=1.0, direcao="iso"):
    """Aproxima a câmera nos objetos: seleciona, 'Ver seleção', limpa a seleção."""
    vista(direcao, fit=False)
    Gui.Selection.clearSelection()
    for n in nomes:
        if doc().getObject(n) is not None:
            Gui.Selection.addSelection(DOC, n)
    Gui.SendMsgToActiveView("ViewSelection")
    Gui.updateGui()
    Gui.Selection.clearSelection()
    if zoom != 1.0:
        cam = Gui.ActiveDocument.ActiveView.getCameraNode()
        try:
            cam.height.setValue(cam.height.getValue() / zoom)
        except Exception:
            pass


def foto(caminho, w=1400, h=900):
    Gui.updateGui()
    Gui.ActiveDocument.ActiveView.saveImage(caminho, w, h, "Current")


def decal_xz(nome, x0, x1, y, z0, z1, arquivo, gr):
    """Adesivo fino na face −Y (visto de frente)."""
    s = Part.makeBox(x1 - x0, 0.05, z1 - z0, V(x0, y - 0.05, z0))
    add(nome, s, "branco", gr)
    textura(nome, arquivo)


def pino(x, z, y0, y1, gr, nome):
    add(nome, cil(0.32, y0 - y1, V(x, y1, z), (0, 1, 0)), "ouro", gr)


def axial(nome, p1, p2, cor_corpo, faixas, gr, r=1.15, comp=6.3, altura=3.0):
    """Componente axial (resistor/diodo) com pernas nos furos p1 e p2, corpo afastado 'altura' mm da placa."""
    q1, q2 = p1 + V(0, -altura, 0), p2 + V(0, -altura, 0)
    for k, (a, b) in enumerate([(p1, q1), (p2, q2)]):
        add(nome + "_perna%d" % k, Part.makePolygon([a + V(0, 1.5, 0), b]).makePipe(Part.Wire(Part.makeCircle(0.25, a + V(0, 1.5, 0), b - a - V(0, 1.5, 0)))) if False else
            Part.Wire(Part.makePolygon([a + V(0, 2.0, 0), b])).makePipe(Part.Wire(Part.makeCircle(0.25, a + V(0, 2.0, 0), V(0, -1, 0)))), "metal", gr)
    meio = (q1 + q2) * 0.5
    d = q2 - q1
    L = d.Length
    d.normalize()
    add(nome + "_perna_lig", Part.makeCylinder(0.25, L, q1, d), "metal", gr)
    corpo = Part.makeCylinder(r, comp, meio - d * (comp / 2), d)
    add(nome, corpo, cor_corpo, gr)
    for k, (pos, cor) in enumerate(faixas):
        add(nome + "_faixa%d" % k, Part.makeCylinder(r + 0.05, 0.6, meio - d * (comp / 2) + d * pos, d), cor, gr)


# ================================================================ etapa 3 — protoboard e componentes de baixo
def etapa3():
    d = doc()
    G = "4 Protoboard"
    Pw, Pl, Pt = P["PROTO"]
    z0 = P["Z_PROTO0"]
    add("Protoboard_MB102", caixa(Pw, Pt, Pl, 0, Y_FACE + Pt / 2, z0), (0.94, 0.94, 0.92), G)
    decal_xz("Protoboard_furacao", -Pw / 2, Pw / 2, Y_FACE, z0, z0 + Pl, "protoboard.png", G)
    # regulador MP1584: IN+ c19-c, IN− c19-h, OUT+ c27-c, OUT− c27-h
    yb = Y_FACE - 3.5
    zc = (z_col(19) + z_col(27)) / 2
    add("MP1584_placa", caixa(19, 1.2, 24, 0, yb - 0.6, zc - 12), "pcb_azul", G)
    decal_xz("MP1584_adesivo", -9.5, 9.5, yb - 1.2, zc - 12, zc + 12, "mp1584.png", G)
    add("MP1584_indutor", caixa(6.5, 3.5, 6.5, 2.5, yb - 1.2 - 1.75, zc - 3.25), (0.12, 0.12, 0.12), G)
    add("MP1584_trimpot", caixa(4, 2.5, 4, -4.5, yb - 1.2 - 1.25, zc + 3), (0.15, 0.4, 0.9), G)
    for ref in ("c19", "h19", "c27", "h27"):
        p = furo(ref)
        pino(p.x, p.z, Y_FACE + 2.0, yb - 1.4, G, "MP1584_pino_" + ref)
    # diodos 1N5819 (faixa = catodo, do lado do nó comum c7)
    axial("D1_1N5819_fonte", furo("c3"), furo("c7"), (0.1, 0.1, 0.1), [(5.0, (0.75, 0.75, 0.75))], G, r=1.35, comp=5.2)
    axial("D2_1N5819_pilhas", furo("d11"), furo("d7"), (0.1, 0.1, 0.1), [(5.0, (0.75, 0.75, 0.75))], G, r=1.35, comp=5.2)
    # resistores dos divisores (cores: 100k marrom-preto-amarelo, 22k vermelho-vermelho-laranja, 27k vermelho-violeta-laranja)
    bege = (0.85, 0.75, 0.55)
    ouro = COR["ouro"]
    axial("R1_100k_fonte", furo("g3"), furo("g7"), bege, [(1.0, COR["marrom"]), (2.0, COR["preto"]), (3.0, COR["amarelo"]), (5.0, ouro)], G)
    axial("R2_22k_fonte", furo("h7"), furo("GND_D@7"), bege, [(1.0, COR["vermelho"]), (2.0, COR["vermelho"]), (3.0, COR["laranja"]), (5.0, ouro)], G)
    axial("R3_100k_pilhas", furo("g11"), furo("g15"), bege, [(1.0, COR["marrom"]), (2.0, COR["preto"]), (3.0, COR["amarelo"]), (5.0, ouro)], G)
    axial("R4_27k_pilhas", furo("h15"), furo("GND_D@15"), bege, [(1.0, COR["vermelho"]), (2.0, COR["roxo"]), (3.0, COR["laranja"]), (5.0, ouro)], G)
    axial("R5_220_LED", furo("b13"), furo("b17"), bege, [(1.0, COR["vermelho"]), (2.0, COR["vermelho"]), (3.0, COR["marrom"]), (5.0, ouro)], G)
    # capacitores cerâmicos 100 nF (GPIO35 e GPIO34 para GND)
    for nome, a, b in [("C1_100nF_GPIO35", "i7", "GND_D@9"), ("C2_100nF_GPIO34", "i15", "GND_D@16")]:
        axial(nome, furo(a), furo(b), (0.95, 0.75, 0.1), [], G, r=2.0, comp=2.5, altura=4.0)
    # eletrolítico 470 µF entre os trilhos 5V e GND (coluna 55), em pé
    pc = (furo("5V@55") + furo("GND_E@55")) * 0.5
    add("C3_470uF", cil(4.0, 12.0, pc + V(0, -2.5, 0), (0, -1, 0)), (0.1, 0.15, 0.45), G)
    add("C3_470uF_faixa_negativo", cil(4.05, 12.0, pc + V(0, -2.5, 0), (0, -1, 0)).common(
        caixa(3, 20, 10, pc.x + 3.0, pc.y - 8, pc.z - 5)), (0.75, 0.75, 0.8), G)
    for ref in ("5V@55", "GND_E@55"):
        p = furo(ref)
        pino(p.x, p.z, Y_FACE + 2.0, Y_FACE - 2.5, G, "C3_perna_" + ref.split("@")[0])
    # conector do servo: barra de 3 pinos macho em c60, c61, c62 (fileira c)
    for c in (60, 61, 62):
        p = furo("c%d" % c)
        add("Header_servo_base_%d" % c, caixa(2.5, 2.5, 2.54, p.x, Y_FACE - 1.25, p.z - 1.27), "preto", G)
        pino(p.x, p.z, Y_FACE + 2.0, Y_FACE - 8.5, G, "Header_servo_pino_%d" % c)
    texto("Txt_mp1584", ["Regulador MP1584", "(ajustar 5,0 V antes!)"], V(-45, -10, zc), G)
    texto("Txt_divisores", ["Divisores de tensão:", "fonte (c3-c7) e pilhas (c11-c15)"], V(45, -10, z_col(9)), G)
    texto("Txt_header", ["Conector do servo", "c60 GND | c61 5V | c62 sinal"], V(-45, -10, z_col(61)), G)
    d.recompute()
    mostrar(["1 Peças impressas", "3 Pedestal", "4 Protoboard", "9 Parafusos"])
    for n in ("P01_piso_dosador", "P02_anel_escudo", "P03_rotor", "P04_bica", "P07_base_balanca", "P08_plataforma", "P09_espacador"):
        doc().getObject(n).ViewObject.Visibility = False
    enquadrar(["Protoboard_MB102"], zoom=1.0, direcao="frente")


# ---------------------------------------------------------------- ESP32 (colada de cabeça para baixo) — pinos
ESQ_LISTA = ["EN", "VP", "VN", "D34", "D35", "D32", "D33", "D25", "D26", "D27", "D14", "D12", "D13", "GND", "VIN"]
DIR_LISTA = ["D23", "D22", "TX0", "RX0", "D21", "D19", "D18", "D5", "TX2", "RX2/16", "D4", "D2", "D15", "GND", "3V3"]
ESP_ZC = z_col(47)
FITA = 2.5                                   # 2 camadas de fita dupla-face de espuma (folga para o plugue USB)
ESP_Y_PCB = Y_FACE - FITA - 2.4 - 0.8        # face de trás (lado dos componentes) da placa da ESP32
ESP_Y_FRENTE = ESP_Y_PCB - 1.6               # face da frente (lado de baixo, com os pinos)
ESP_Y_PONTA = ESP_Y_FRENTE - 2.5 - 6.0       # ponta dos pinos


def pino_esp(nome):
    """('VIN') -> ponto da ponta do pino. Coluna EN…VIN fica à DIREITA (+X) porque a placa está virada."""
    if nome in ESQ_LISTA:
        i, x = ESQ_LISTA.index(nome), 12.7
    else:
        i, x = DIR_LISTA.index(nome), -12.7
    return V(x, ESP_Y_PONTA, ESP_ZC + 17.78 - i * PITCH)


def pino_esp_gnd_esq():
    return V(12.7, ESP_Y_PONTA, ESP_ZC + 17.78 - 13 * PITCH)


HX_X0 = LINHAS["j"] - 3.5                   # borda esquerda da placa do HX711
HX_ZC = (z_col(29) + z_col(32)) / 2
HX_Y = Y_FACE - 2.5                         # face de trás da placa do HX711 (sobre o espaçador do conector)


def pad_hx(nome):
    lista = ["E+", "E-", "A-", "A+", "B-", "B+"]
    i = lista.index(nome)
    return V(HX_X0 + 34.0 - 3.0, HX_Y - 1.2, HX_ZC + 6.35 - i * PITCH)


# ================================================================ etapa 4 — ESP32 e HX711
def etapa4():
    d = doc()
    G = "5 ESP32 e HX711"
    bw, bl = P["ESP32"][0], P["ESP32"][1]
    z0 = ESP_ZC - bl / 2
    add("ESP32_fita_dupla_face", caixa(16, FITA, 18, 0, Y_FACE - FITA / 2, ESP_ZC + 4), (0.55, 0.55, 0.6), G)
    add("ESP32_blindagem_WROOM", caixa(16, 2.4, 17.5, 0, Y_FACE - FITA - 1.2, ESP_ZC + 4.2), "metal", G)
    add("ESP32_modulo_PCB", caixa(18, 0.8, 25.5, 0, ESP_Y_PCB + 0.4, z0 + bl - 25.5), "pcb_preto", G)
    add("ESP32_placa", caixa(bw, 1.6, bl, 0, ESP_Y_PCB - 0.8, z0), "pcb_preto", G)
    decal_xz("ESP32_adesivo_pinos", -bw / 2, bw / 2, ESP_Y_FRENTE, z0, z0 + bl, "esp32_baixo.png", G)
    add("ESP32_USB", caixa(8, 3, 5.6, 0, ESP_Y_PCB + 1.5, z0 - 1.0), "metal", G)
    for k, x in enumerate((-7.5, 7.5)):
        add("ESP32_botao_%s" % ("EN" if k else "BOOT"), caixa(3.5, 1.8, 3.5, x, ESP_Y_PCB + 0.9, z0 + 4), (0.15, 0.15, 0.15), G)
    for lado, x in (("dir", 12.7), ("esq", -12.7)):
        add("ESP32_barra_pinos_" + lado, caixa(2.5, 2.5, 15 * PITCH, x, ESP_Y_FRENTE - 1.25, ESP_ZC - 15 * PITCH / 2),
            (0.1, 0.1, 0.1), G)
        pinos = [cil(0.32, 6.0 + 2.5 + 1.6, V(x, ESP_Y_PONTA, ESP_ZC + 17.78 - i * PITCH), (0, 1, 0)) for i in range(15)]
        add("ESP32_pinos_" + lado, Part.makeCompound(pinos), "ouro", G)
    # HX711
    add("HX711_espacador_conector", caixa(2.5, 2.5, 4 * PITCH, LINHAS["j"], Y_FACE - 1.25, HX_ZC - 2 * PITCH), (0.1, 0.1, 0.1), G)
    add("HX711_placa", caixa(34, 1.2, 20, HX_X0 + 17, HX_Y - 0.6, HX_ZC - 10), "pcb_verde", G)
    s = Part.makeBox(34, 0.05, 20, V(HX_X0, HX_Y - 1.25, HX_ZC - 10))
    add("HX711_adesivo", s, "branco", G)
    textura("HX711_adesivo", "hx711.png")
    add("HX711_chip", caixa(9.5, 1.5, 6.5, HX_X0 + 17, HX_Y - 1.2 - 0.75, HX_ZC - 3.25), (0.08, 0.08, 0.08), G)
    for c in (29, 30, 31, 32):
        p = furo("j%d" % c)
        pino(p.x, p.z, Y_FACE + 2.0, HX_Y - 1.5, G, "HX711_pino_c%d" % c)
    texto("Txt_esp32", ["ESP32 colada DE CABEÇA PARA BAIXO", "(fita dupla-face 2 camadas no módulo)", "jumpers FÊMEA direto nos pinos"],
          V(-50, -20, ESP_ZC + 10), G)
    texto("Txt_hx711", ["HX711: VCC c32 | SCK c31 | DT c30 | GND c29", "fios da célula soldados à direita"],
          V(55, -15, HX_ZC), G)
    d.recompute()
    enquadrar(["ESP32_placa", "HX711_placa", "MP1584_placa"], direcao="frente")


# ---------------------------------------------------------------- fios
def fio(nome, pts, cor, r=0.6, gr="8 Fios"):
    pts = [V(p) for p in pts]
    bs = Part.BSplineCurve()
    bs.interpolate(pts)
    w = Part.Wire(bs.toShape())
    t0 = bs.tangent(bs.FirstParameter)[0]
    perfil = Part.Wire(Part.makeCircle(r, pts[0], t0))
    try:
        s = w.makePipeShell([perfil], True, True)
    except Exception:
        s = w.makePipe(perfil)
    return add(nome, s, cor, gr)


def dupont_macho(nome, p, gr="8 Fios"):
    """Ponta macho encaixada no furo p da protoboard; devolve o ponto de saída do fio."""
    add(nome, caixa(2.5, 14.0, 2.5, p.x, p.y - 7.0, p.z - 1.25), "preto", gr)
    return V(p.x, p.y - 14.0, p.z)


def dupont_femea(nome, p_ponta, gr="8 Fios"):
    """Ponta fêmea encaixada no pino (p_ponta = ponta do pino, pino apontando para −Y)."""
    y0 = p_ponta.y + 6.0
    add(nome, caixa(2.5, 14.0, 2.5, p_ponta.x, y0 - 7.0, p_ponta.z - 1.25), "preto", gr)
    return V(p_ponta.x, y0 - 14.0, p_ponta.z)


# ================================================================ etapa 5 — servo + cabo + conector
def etapa5():
    d = doc()
    G = "6 Servo"
    add("Servo_MG90S_360", brep("REF_servo_MG90S_360"), (0.12, 0.12, 0.14), G)
    add("Servo_braco_duplo", brep("REF_braco_servo"), "branco", G)
    zc = P["Z_SV0"] + 3.5
    x_saida = P["SV_CX"] - P["SV_C"] / 2
    add("Servo_saida_cabo", caixa(2.0, 4.0, 4.0, x_saida - 1.0, 0, zc - 2.0), (0.12, 0.12, 0.14), G)
    p60 = furo("c60")
    y_con = Y_FACE - 2.5
    add("Servo_conector_femea", caixa(2.5, 14.0, 3 * PITCH, p60.x, y_con - 7.0, z_col(60) - 1.27), "preto", G)
    for k, (cor, c) in enumerate([("marrom", 60), ("vermelho", 61), ("laranja", 62)]):
        dz = (k - 1) * 1.1
        pts = [(x_saida - 2.0, 0, zc + dz), (x_saida - 7, -3, zc - 2 + dz), (-22, -12 - k * 0.6, 190 + dz),
               (p60.x - 2, y_con - 18, z_col(c) + 1), (p60.x, y_con - 14.0, z_col(c))]
        fio("Servo_fio_%s" % cor, pts, cor, r=0.5, gr=G)
    texto("Txt_servo", ["Servo MG90S 360°", "marrom=GND  vermelho=5V  laranja=sinal", "conector em c60-c62 (topo da protoboard)"],
          V(-60, -20, 200), G)
    d.recompute()


# ================================================================ etapa 6 — balança (célula) e parafusos
def etapa6():
    d = doc()
    G = "7 Balança"
    cel = brep("REF_celula_5kg")
    b = cel.BoundBox
    yc = (b.YMin + b.YMax) / 2
    zc = (b.ZMin + b.ZMax) / 2
    furo_bin = cil(4.2, 20, V(-10, yc - 5, zc), (1, 0, 0)).fuse([cil(4.2, 20, V(-10, yc + 5, zc), (1, 0, 0)),
                                                                caixa(20, 10, 3.0, 0, yc, zc - 1.5)])
    add("Celula_carga_5kg", cel.cut(furo_bin), "aluminio", G)
    add("Celula_extensometro_silicone", caixa(9, 14, 1.2, 0, yc, b.ZMax), "branco", G, transp=20)
    texto("Txt_celula", ["Célula 5 kg: seta para BAIXO", "vermelho E+ | preto E- | verde A+ | branco A-"], V(60, yc, 40), G)
    # parafusos (aparência: cabeça panela + corpo)
    GP = "9 Parafusos"

    def parafuso(nome, cab, direcao, comp, r=1.5, rc=2.75, hc=2.1):
        dv = V(*direcao)
        add(nome, cil(r, comp, cab, direcao).fuse(cil(rc, hc, cab - dv * hc, direcao)), "metal", GP)

    zf = P["Z_F"] - 4 - 5
    for k, az in enumerate((30, 90, 150)):
        dvec = V(math.cos(math.radians(az)), math.sin(math.radians(az)), 0)
        parafuso("Parafuso_M3x10_cartucho_%d" % k, dvec * P["TUBO_RE"] + V(0, 0, zf), tuple(-dvec), 10)
    for k, sx in enumerate((-15, 15)):
        y0 = -math.sqrt((P["TUBO_RE"] + 3.3) ** 2 - sx ** 2)
        parafuso("Parafuso_M3x8_moldura_%d" % k, V(sx, y0, P["Z_F"] + 3.0), (0, 1, 0), 8)
    for k, sx in enumerate((-12, 12)):
        parafuso("Parafuso_M3x12_braco_%d" % k, V(sx, -P["PED_R"] - 2.8, 20), (0, 1, 0), 12)
    for k, (p0, dd) in enumerate(P.get("PARAF_PATAS", [])):                   # patas anti-tombamento (aba de 3 mm)
        dv = V(*dd)
        parafuso("Parafuso_M3x12_pata_%d" % k, V(*p0) - dv * (P.get("PATA_ABA_T", 3.0) + 0.3), tuple(dd), 12)
    for k, ang in enumerate((30, 150, 270)):
        bx, by = 50 * math.cos(math.radians(ang)), P["Y_VAS"] + 50 * math.sin(math.radians(ang))
        parafuso("Parafuso_M3x12_batente_%d" % k, V(bx, by, P["Z_PLAT_FUNDO"] - 3.0), (0, 0, -1), 12)
    for k, dy in enumerate((5, 20)):
        parafuso("Parafuso_M5x16_celula_fixo_%d" % k, V(0, P["Y_FIX0"] - dy, 3.0), (0, 0, 1), 16, r=2.5, rc=4.2, hc=3.0)
    for k, dy in enumerate((5, 20)):
        y = P["Y_FIX0"] - P["CEL_C_MAX"] + dy
        parafuso("Parafuso_M4x16_celula_livre_%d" % k, V(0, y, P["STACK"] - 3.0), (0, 0, -1), 16, r=2.0, rc=3.6, hc=2.6)
    d.recompute()


# ================================================================ etapa 7 — todas as ligações
LIGACOES = [
    # (nome, origem, destino, cor) — origem/destino: "furo:c3", "esp:VIN", "pt:x,y,z" (terminal soldado), "hx:E+"
    ("Fonte+ (jack centro) -> c3", "pt:0,47.5,9", "furo:a3", "vermelho"),
    ("Fonte- (jack) -> GND", "pt:0,47.5,6", "furo:GND_E@4", "preto"),
    ("Pilhas+ -> c11", "pt:-30,29,12", "furo:a11", "vermelho"),
    ("Pilhas- -> GND", "pt:-25,29,12", "furo:GND_E@10", "preto"),
    ("c7 (após diodos) -> chave", "furo:a7", "pt:51,-6.5,10.5", "amarelo"),
    ("chave -> MP1584 IN+ (c19)", "pt:51,0.5,10.5", "furo:a19", "amarelo"),
    ("ponte fonte c3 e->f", "furo:e3", "furo:f3", "laranja"),
    ("ponte pilhas c11 e->f", "furo:e11", "furo:f11", "laranja"),
    ("MP1584 IN- -> GND", "furo:j19", "furo:GND_D@21", "preto"),
    ("MP1584 OUT- -> GND", "furo:j27", "furo:GND_D@25", "preto"),
    ("MP1584 OUT+ -> trilho 5V", "furo:a27", "furo:5V@27", "vermelho"),
    ("GND esquerdo <-> GND direito", "furo:GND_E@3", "furo:GND_D@3", "preto"),
    ("trilho 5V -> ESP32 VIN", "furo:5V@39", "esp:VIN", "vermelho"),
    ("GND -> ESP32 GND", "furo:GND_E@40", "esp:GND", "preto"),
    ("ESP32 3V3 -> trilho 3V3", "esp:3V3", "furo:3V3@38", "laranja"),
    ("HX711 VCC (c32) -> 3V3", "furo:f32", "furo:3V3@37", "laranja"),
    ("HX711 GND (c29) -> GND", "furo:f29", "furo:GND_D@25", "preto"),
    ("HX711 DT (c30) -> GPIO16", "furo:g30", "esp:RX2/16", "verde"),
    ("HX711 SCK (c31) -> GPIO4", "furo:g31", "esp:D4", "azul"),
    ("divisor pilhas (c15) -> GPIO34", "furo:j15", "esp:D34", "roxo"),
    ("divisor fonte (c7) -> GPIO35", "furo:j7", "esp:D35", "cinza"),
    ("servo GND (c60) -> GND", "furo:a60", "furo:GND_E@57", "preto"),
    ("servo 5V (c61) -> 5V", "furo:b61", "furo:5V@58", "vermelho"),
    ("servo sinal (c62) -> GPIO18", "furo:e62", "esp:D18", "branco"),
    ("botão -> c1", "pt:46,13.5,10.5", "furo:a1", "amarelo"),
    ("c1 -> GPIO23", "furo:b1", "esp:D23", "amarelo"),
    ("botão -> GND", "pt:46,18.5,10.5", "furo:GND_E@5", "preto"),
    ("GPIO22 -> resistor 220 (c13)", "esp:D22", "furo:a13", "ciano"),
    ("resistor 220 (c17) -> LED anodo", "furo:a17", "pt:50.5,-20,11.77", "verde"),
    ("LED catodo -> GND", "pt:50.5,-20,9.23", "furo:GND_E@15", "preto"),
    ("célula vermelho -> HX711 E+", "pt:-4.5,-104,17.5", "hx:E+", "vermelho"),
    ("célula preto -> HX711 E-", "pt:-1.5,-104,17.5", "hx:E-", "preto"),
    ("célula branco -> HX711 A-", "pt:1.5,-104,17.5", "hx:A-", "branco"),
    ("célula verde -> HX711 A+", "pt:4.5,-104,17.5", "hx:A+", "verde"),
]


def _ponta(ref, nome, idx):
    tipo, val = ref.split(":", 1)
    if tipo == "furo":
        p = furo(val)
        return dupont_macho("Dupont_%02d_%s" % (idx, nome), p), "placa"
    if tipo == "esp":
        return dupont_femea("Dupont_%02d_%s" % (idx, nome), pino_esp(val)), "placa"
    if tipo == "hx":
        return pad_hx(val), "hx"
    x, y, z = (float(t) for t in val.split(","))
    return V(x, y, z), ("celula" if y < -90 else "pedestal")


def _rota(a, ta, b, tb, k):
    """Caminho com folga entre a e b (k = índice para espalhar os fios)."""
    y_pista = -24.0 - (k % 8) * 1.6
    x_sub = -10.0 + (k % 8) * 2.8
    pts = [a]
    for p, t in ((a, ta),):
        if t == "pedestal" and p.y > 40:
            # jack (atrás): sobe pela chaminé de trás, passa pelo furo de trás da bandeja e contorna a espinha
            pts += [V(p.x, 38.5, 12.0), V(p.x, 38.5, 26.0), V(-34.0, 30.0, 40.0), V(-34.0, y_pista, 60.0)]
        elif t == "pedestal":
            pts += [V(p.x * 0.6, p.y * 0.6, 21.0), V(x_sub, -28.0, 24.0), V(x_sub, y_pista, 45.0)]
        elif t == "celula":
            # canaleta da frente → chaminé da frente (por fora da gaveta) → furo da frente da bandeja
            pts += [V(p.x * 0.3, -96, 8.0), V(p.x * 0.3, -78, 7.5), V(p.x * 0.3, -60, 7.0), V(p.x * 0.3, -38.5, 9.0),
                    V(p.x * 0.3, -38.5, 21.0), V(4 + p.x * 0.3, -30.0, 25.0), V(6 + p.x * 0.3, y_pista, 60.0)]
        else:
            pts += [V(p.x, p.y - 3.0, p.z)]
    fim = []
    if tb == "pedestal":
        fim = [V(x_sub, y_pista, 45.0), V(x_sub, -28.0, 24.0), V(b.x * 0.6, b.y * 0.6, 21.0)]
    elif tb == "hx":
        fim = [V(b.x + 2.0, b.y - 12.0, b.z - 3.0), V(b.x + 0.5, b.y - 3.0, b.z)]
    else:
        fim = [V(b.x, b.y - 3.0, b.z)]
    meio_a = pts[-1]
    meio_b = fim[0]
    if ta == "placa" and tb == "placa":
        meio = [V(meio_a.x, y_pista + 10, meio_a.z), V(meio_b.x, y_pista + 10, meio_b.z)]
    else:
        meio = [V(meio_a.x, y_pista, meio_b.z if ta != "placa" else meio_a.z), V(meio_b.x, y_pista, meio_b.z)]
    seq = pts + meio + fim + [b]
    limpo = [seq[0]]
    for p in seq[1:]:
        if (p - limpo[-1]).Length > 1.0:
            limpo.append(p)
    return limpo


def etapa7():
    d = doc()
    for k, (nome, o, de, cor) in enumerate(LIGACOES):
        curto = nome.split(" ")[0].replace("+", "mais").replace("-", "menos")
        a, ta = _ponta(o, "%s_a" % curto, k)
        b, tb = _ponta(de, "%s_b" % curto, k)
        pts = _rota(a, ta, b, tb, k)
        try:
            fio("Fio_%02d_%s" % (k + 1, cor), pts, cor)
        except Exception as e:
            App.Console.PrintWarning("fio %s: %s\n" % (nome, e))
    texto("Txt_mapa", ["MAPA DE LIGAÇÕES (fio: de -> para)"] + ["%02d %-8s %s" % (k + 1, c, n) for k, (n, _, _, c) in enumerate(LIGACOES)],
          V(-150, -60, 300), "8 Fios")
    d.recompute()


# ================================================================ etapa 8 — finalizar: tudo visível, salvar, texturas, imagens
ARQUIVO = os.path.join(BASE, "IoT3D_v3_montagem.FCStd")
MAPA_TEXTURAS = {"Protoboard_furacao": "protoboard.png", "MP1584_adesivo": "mp1584.png",
                 "ESP32_adesivo_pinos": "esp32_baixo.png", "HX711_adesivo": "hx711.png"}
TRANSPARENCIA = {"Tubo_PVC_DN100": 70, "Cap_superior": 40, "Vasilha_inox": 30, "P06_pedestal": 55,
                 "P05_bandeja_espinha": 50, "P08_plataforma": 55}


def etapa8(pasta_imagens=None):
    d = doc()
    for o in d.Objects:
        if hasattr(o, "ViewObject") and o.ViewObject is not None:
            o.ViewObject.Visibility = True
    for n, t in TRANSPARENCIA.items():
        if d.getObject(n) is not None:
            d.getObject(n).ViewObject.Transparency = t
    json.dump(MAPA_TEXTURAS, open(os.path.join(BASE, "texturas.json"), "w"), indent=1)
    d.saveAs(ARQUIVO)
    if pasta_imagens:
        os.makedirs(pasta_imagens, exist_ok=True)
        v = Gui.ActiveDocument.ActiveView
        cenas = [("01_geral.png", "iso", None), ("02_protoboard_frente.png", "frente", ["Protoboard_MB102"]),
                 ("03_esp32_pinos.png", "frente", ["ESP32_placa"]), ("04_pedestal.png", "iso", ["P06_pedestal"]),
                 ("05_balanca.png", "iso", ["P07_base_balanca", "P08_plataforma"]),
                 ("06_servo_cartucho.png", "iso", ["Servo_MG90S_360", "P01_piso_dosador"])]
        for arq, dirc, alvo in cenas:
            if alvo:
                enquadrar(alvo, direcao=dirc)
            else:
                vista(dirc)
            Gui.updateGui()
            v.saveImage(os.path.join(pasta_imagens, arq), 1600, 1000, "Current")
    vista("iso")


def tudo(pasta_imagens=None):
    for f in (etapa1, etapa2, etapa3, etapa4, etapa5, etapa6, etapa7):
        f()
    etapa8(pasta_imagens)
