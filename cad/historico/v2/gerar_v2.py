# Gera o conjunto v2 do alimentador a partir do IoT3D.FCStd (que NÃO é alterado):
#   - superfície inclinada a 45° (bocal, luva e suporte do motor mantidos)
#   - 3 calços da superfície (substituem o Suporte_superficie_inclinada)
#   - tampa atuadora com agitador em "U" (substitui o prego)
#   - funil sem a lasca que ocupava a parede do PVC
#   - extensão do funil prolongada a 45° até dentro da vasilha
#   - base: caixa de eletrônica (eleva o tubo), tampa traseira, base da balança, plataforma
# Saída: cad/historico/v2/IoT3D_v2.FCStd  (objetos "Pxx_*" são imprimíveis; "REF_*" são referência)
#
# Rodar da raiz do projeto:
#   cad/scripts/fc.sh "cad/historico/v2/gerar_v2.py"
import math
import os

import FreeCAD as App
import Part

V = App.Vector
ROOT = os.getcwd()
SRC = os.path.join(ROOT, "cad", "historico", "v1", "IoT3D.FCStd")
DST = os.path.join(ROOT, "cad", "historico", "v2", "IoT3D_v2.FCStd")

# ---------------------------------------------------------------- parâmetros
# Projeto TOLERANTE: nada depende de medir peça comprada. Só o tubo tem medida fixa (norma).
# PVC — NBR 5688, esgoto série normal DN 100: DE 101,6 mm, parede 1,8 mm (ficha Wavin).
TUBO_DE = 101.6
TUBO_PAREDE = 1.8
TUBO_L = 400.0            # comprimento do corte recomendado (modelo antigo: 300)
TUBO_Z0 = -177.0          # fundo do tubo no sistema do modelo (apoia direto na caixa — sem cap embaixo)
SOQUETE_H = 20.0          # quanto o tubo entra no soquete da caixa
# Cap de cima: só referência visual (qualquer cap DN100 encaixa no tubo)
CAP_D_EXT, CAP_H, CAP_FUNDO = 108.0, 45.0, 3.0

ANG_PLACA = 45.0          # inclinação da superfície (antes: 30)
T_PLACA = 3.0             # espessura da placa (antes: 2)

# Vasilha: o projeto aceita qualquer vasilha dentro deste envelope (ex.: inox 15 cm × 3,5 cm)
VAS_D_MIN, VAS_D_MAX = 140.0, 160.0     # Ø da borda
VAS_H_MAX = 60.0                         # altura máxima
VAS_D_FUNDO = 125.0                      # só para o desenho de referência

# Célula de carga 5 kg (barra YZC-131 e similares): anúncios variam entre 75 e 80 mm, furos M4/M5,
# 4–6 mm da ponta, passo 10–20 mm. Os furos viram rasgos que aceitam qualquer combinação.
CEL_C_MIN, CEL_C_MAX = 75.0, 80.0
CEL_L, CEL_A = 12.7, 12.7
RASGO_L = 5.4                            # passa M4 e M5
FIXO_COMPR = 27.0                        # trecho apoiado em cada ponta (não chega nos extensômetros)

FOLGA_BICO = 10.0         # saída do bico acima da borda da vasilha
FOLGA_PLAT = 8.0          # plataforma ↔ caixa de eletrônica
GAP_BATENTE = 1.0
BAY_LADO = 140.0
PAREDE = 3.0
PISO_BAL = 5.0
BOSS_H = 6.0
PLAT_T = 6.0
PLAT_D = 130.0
BICO_DY = 32.0            # quanto o bico avança em −Y a 45°

# ---------------------------------------------------------------- utilidades
src = App.openDocument(SRC)


def peca(label):
    o = src.getObjectsByLabel(label)[0]
    s = o.Shape.copy()
    s.Placement = o.getGlobalPlacement()
    return s


# Sistema do bocal: eixo a 30° (z' ao longo do bocal). Centro do bocal em x'=30; eixo da luva/servo em x'=29.
A = V(0.5, 0, math.sqrt(3) / 2)
R_W2F = App.Rotation(A, V(0, 0, 1))
R_F2W = R_W2F.inverted()


def fr(x, y, z):
    return R_F2W.multVec(V(x, y, z))


def fdir(x, y, z):
    return R_F2W.multVec(V(x, y, z))


def cyl_f(r, h, cx, cy, z0, d=(0, 0, 1)):
    return Part.makeCylinder(r, h, fr(cx, cy, z0), fdir(*d))


def unico(s):
    s = s.removeSplitter()
    if len(s.Solids) != 1:
        raise RuntimeError("esperado 1 sólido, veio %d" % len(s.Solids))
    return s.Solids[0]


def setor(r_in, r_out, ang_c, meia_larg, z0, h):
    a0 = math.radians(ang_c - meia_larg)
    anel = Part.makeCylinder(r_out, h, V(0, 0, z0)).cut(Part.makeCylinder(r_in, h, V(0, 0, z0)))
    fatia = Part.makeCylinder(r_out + 5, h, V(0, 0, z0), V(0, 0, 1), 2 * meia_larg)
    fatia.rotate(V(0, 0, 0), V(0, 0, 1), math.degrees(a0))
    return anel.common(fatia)


placa_orig = peca("superficie_inclinada")
tampa_orig = peca("tampa_atuador")
motor = peca("Suporte_motor")
funil_solidos = peca("Funil_interno").Solids
extensao = peca("extensao_funil")

R_INT_PECAS = 48.75
R_TUBO_INT = TUBO_DE / 2 - TUBO_PAREDE

# ---------------------------------------------------------------- funil (sem a lasca na parede do PVC)
def raio_max(s):
    return max(math.hypot(v.X, v.Y) for v in s.Vertexes) if s.Vertexes else 0


funil = [s for s in funil_solidos if raio_max(s) <= R_INT_PECAS + 0.1 and s.common(extensao).Volume < 1][0]
Z_FUNIL_TOPO = funil.BoundBox.ZMax

# ---------------------------------------------------------------- superfície inclinada 45°
N45 = V(math.sin(math.radians(ANG_PLACA)), 0, math.cos(math.radians(ANG_PLACA)))
C0 = fr(30, 0, 0)                                  # topo do bocal (face de baixo da placa antiga)
envelope_luva = cyl_f(23.0, 31.0, 29, 0, -34.3)    # volume varrido pela luva girando (até z' = -3.3)
lim_tubo = Part.makeCylinder(R_INT_PECAS, 1000, V(0, 0, -500))


def montar_placa(delta):
    q = C0 + A * (2.0 + delta)                     # ponto da face de cima, no eixo do bocal
    slab = Part.makeCylinder(200, T_PLACA, q - N45 * T_PLACA, N45).common(lim_tubo)
    acima_topo = Part.makeCylinder(600, 600, q, N45)
    acima_fundo = Part.makeCylinder(600, 600, q - N45 * T_PLACA, N45)
    return q, slab, acima_topo, acima_fundo


DELTA = None
for i in range(0, 60):
    d = i * 0.5
    q, slab, _, _ = montar_placa(d)
    if slab.distToShape(envelope_luva)[0] >= 1.5 and slab.distToShape(funil)[0] >= 1.0:
        DELTA = d
        break
if DELTA is None:
    raise RuntimeError("não achei elevação da placa sem interferência")
Q, slab, ACIMA_TOPO, ACIMA_FUNDO = montar_placa(DELTA)

bocal = placa_orig.common(cyl_f(22.0, 40.0, 30, 0, -40.0))
anel_ext = cyl_f(21.5, 80.0, 30, 0, 0).cut(cyl_f(20.0, 80.0, 30, 0, 0)).cut(ACIMA_TOPO)

# pilar: liga a aba do suporte do motor (face z'=0) à nova placa
aba = max((f for f in motor.Faces if f.Surface.__class__.__name__ == "Plane"
           and abs(abs(f.normalAt(0, 0).dot(A)) - 1) < 1e-3 and f.BoundBox.ZMax > -10),
          key=lambda f: f.CenterOfMass.z)
pilar = aba.extrude(A * 80).cut(ACIMA_TOPO)

placa = slab.fuse([bocal, anel_ext, pilar]).cut(cyl_f(20.0, 120.0, 30, 0, -0.5))
placa = unico(placa)

# calços: 3 apoios na parede do tubo, topo seguindo a face de baixo da placa
calcos = []
for ang in (180.0, 90.0, 270.0):
    px, py = R_TUBO_INT * math.cos(math.radians(ang)), R_TUBO_INT * math.sin(math.radians(ang))
    z_fundo = Q.z - (T_PLACA + N45.x * (px - Q.x)) / N45.z
    h = min(20.0, z_fundo - (Z_FUNIL_TOPO + 1.0))
    bloco = setor(R_TUBO_INT - 12, R_TUBO_INT - 0.2, ang, 10.0, z_fundo - h, h + 15).cut(ACIMA_FUNDO)
    zc = z_fundo - h / 2
    furo = Part.makeCylinder(1.4, 20, V(px, py, zc) * 1.0 + V(-math.cos(math.radians(ang)), -math.sin(math.radians(ang)), 0) * 15,
                             V(math.cos(math.radians(ang)), math.sin(math.radians(ang)), 0))
    calcos.append((ang, unico(bloco.cut(furo))))

# ---------------------------------------------------------------- tampa atuadora com agitador em U
Z_PISO_LUVA = -31.3
Z_BARRA = 2.0 + DELTA + 12.0
R_HASTE, R_POS = 3.5, 11.0
agit = []
for sy in (-1, 1):
    agit.append(cyl_f(R_HASTE, Z_BARRA - Z_PISO_LUVA, 29, sy * R_POS, Z_PISO_LUVA))
    agit.append(Part.makeCone(5.5, R_HASTE, 4.0, fr(29, sy * R_POS, Z_PISO_LUVA), fdir(0, 0, 1)))
    agit.append(Part.makeSphere(R_HASTE, fr(29, sy * R_POS, Z_BARRA)))
    agit.append(cyl_f(3.0, 6.0, 29, sy * R_POS, Z_BARRA))
    agit.append(Part.makeSphere(3.0, fr(29, sy * R_POS, Z_BARRA + 6.0)))
agit.append(cyl_f(R_HASTE, 2 * R_POS, 29, -R_POS, Z_BARRA, d=(0, 1, 0)))
agit.append(cyl_f(6.5, 7.0, 29, 0, Z_BARRA - 3.5))
tampa = tampa_orig.fuse(agit).cut(cyl_f(3.6, 20.0, 29, 0, Z_BARRA - 10))  # passagem da chave de fenda
tampa = unico(tampa)

# ---------------------------------------------------------------- extensão do funil prolongada
face_saida = [f for f in extensao.Faces if f.Surface.__class__.__name__ == "Plane"
              and abs(f.normalAt(0, 0).y + 1) < 1e-6][0]
Y_SAIDA_ANT = face_saida.CenterOfMass.y
prolong = face_saida.extrude(V(0, -BICO_DY, -BICO_DY))
extensao2 = unico(extensao.fuse(prolong))
Z_BICO_MIN = extensao2.BoundBox.ZMin
Y_BICO = Y_SAIDA_ANT - BICO_DY

# ---------------------------------------------------------------- base
STACK = PISO_BAL + BOSS_H + CEL_A + BOSS_H + PLAT_T      # mesa → topo da plataforma
Z_CAP_FUNDO = TUBO_Z0                                      # topo da caixa = fundo do tubo
Z_MESA_MAX = Z_BICO_MIN - FOLGA_BICO - VAS_H_MAX - STACK
H_BAY = math.ceil(Z_CAP_FUNDO - Z_MESA_MAX)
Z_MESA = Z_CAP_FUNDO - H_BAY
Z_PISO = Z_MESA + PISO_BAL
Z_PLAT_FUNDO = Z_PISO + BOSS_H + CEL_A + BOSS_H
Z_PLAT_TOPO = Z_PLAT_FUNDO + PLAT_T
HB = BAY_LADO / 2
Y_VAS = -HB - FOLGA_PLAT - PLAT_D / 2

# caixa de eletrônica
bay = Part.makeBox(BAY_LADO, BAY_LADO, H_BAY, V(-HB, -HB, Z_MESA))
bay = bay.cut(Part.makeBox(BAY_LADO - 2 * PAREDE, BAY_LADO - 2 * PAREDE, H_BAY - PAREDE - 4.0,
                           V(-HB + PAREDE, -HB + PAREDE, Z_MESA + PAREDE)))
r_soq = TUBO_DE / 2 + 0.3                                                                  # soquete segura o próprio tubo
bay = bay.fuse(Part.makeCylinder(r_soq + PAREDE, SOQUETE_H, V(0, 0, Z_CAP_FUNDO)))
bay = bay.cut(Part.makeCylinder(r_soq, SOQUETE_H + 1, V(0, 0, Z_CAP_FUNDO)))
bay = bay.cut(Part.makeCylinder(12.5, 10, V(0, 25, Z_CAP_FUNDO - 6)))                  # passagem de cabos
for sx in (-1, 1):                                                                         # parafusos do tubo
    bay = bay.cut(Part.makeCylinder(1.4, 10, V(sx * (r_soq - 1), 0, Z_CAP_FUNDO + SOQUETE_H / 2), V(sx, 0, 0)))
JAN_W, JAN_H = 100.0, H_BAY - 25.0
bay = bay.cut(Part.makeBox(JAN_W, 10, JAN_H, V(-JAN_W / 2, HB - 5, Z_MESA + 8)))          # janela traseira
for sx in (-1, 1):
    bay = bay.fuse(Part.makeCylinder(4.0, 8.0, V(sx * 60, HB - PAREDE, Z_MESA + 8 + JAN_H / 2), V(0, -1, 0)))
    bay = bay.cut(Part.makeCylinder(1.3, 12.0, V(sx * 60, HB + 1, Z_MESA + 8 + JAN_H / 2), V(0, -1, 0)))
bay = bay.cut(Part.makeCylinder(4.0, 10, V(HB - 5, 20, Z_MESA + 40), V(1, 0, 0)))          # jack P4 Ø8
bay = bay.cut(Part.makeBox(10, 19.2, 12.8, V(HB - 5, -20 - 9.6, Z_MESA + 40 - 6.4)))       # chave gangorra
bay = bay.cut(Part.makeCylinder(3.0, 10, V(20, -HB - 5, Z_MESA + 12), V(0, 1, 0)))         # cabo da célula
for sx in (-1, 1):                                                                         # fixação da base da balança
    bay = bay.cut(Part.makeCylinder(1.7, 10, V(sx * 50, -HB - 5, Z_MESA + 18), V(0, 1, 0)))
for sx in (-1, 1):
    for sy in (-1, 1):
        bay = bay.cut(Part.makeCylinder(6.0, 1.5, V(sx * (HB - 12), sy * (HB - 12), Z_MESA)))  # pés de borracha
bay = unico(bay)

tampa_tras = Part.makeBox(130, PAREDE, JAN_H + 6, V(-65, HB, Z_MESA + 5))
for sx in (-1, 1):
    tampa_tras = tampa_tras.cut(Part.makeCylinder(1.7, 10, V(sx * 60, HB - 2, Z_MESA + 8 + JAN_H / 2), V(0, 1, 0)))
tampa_tras = unico(tampa_tras)

# base da balança — célula em balanço, furos em rasgo
Y_FIX0 = -HB - 20.0                                  # ponta fixa da célula (20 mm à frente da caixa)
CEL_C = CEL_C_MAX
cel_y0 = Y_FIX0 - CEL_C
# lado fixo: apoio de Y_FIX0 até Y_FIX0-27, rasgo cobre furos de 3 a 24 mm da ponta
FIX_Y0, FIX_Y1 = Y_FIX0 - FIXO_COMPR, Y_FIX0
RFIX = (Y_FIX0 - 24.0, Y_FIX0 - 3.0)
# lado livre: a ponta fica entre Y_FIX0-80 e Y_FIX0-75; apoio de -78 a -51, rasgo de -76,5 a -52,5
LIV_Y0, LIV_Y1 = Y_FIX0 - CEL_C_MAX + 2.0, Y_FIX0 - CEL_C_MIN + 24.0
RLIV = (LIV_Y0 + 1.5, LIV_Y1 - 1.5)
Y_VAS = (LIV_Y0 + LIV_Y1) / 2                        # vasilha centrada sobre a ponta livre


def rasgo(y0, y1, larg, z0, h):
    r = larg / 2
    return Part.makeBox(larg, (y1 - y0) - larg, h, V(-r, y0 + r, z0)).fuse(
        [Part.makeCylinder(r, h, V(0, y0 + r, z0)), Part.makeCylinder(r, h, V(0, y1 - r, z0))])


BAL_Y0 = Y_VAS - PLAT_D / 2 - 10
base_bal = Part.makeBox(150, -HB - BAL_Y0, PISO_BAL, V(-75, BAL_Y0, Z_MESA))
base_bal = base_bal.fuse(Part.makeBox(16, FIX_Y1 - FIX_Y0, BOSS_H, V(-8, FIX_Y0, Z_PISO)))
base_bal = base_bal.cut(rasgo(RFIX[0], RFIX[1], RASGO_L, Z_MESA - 1, 30))
base_bal = base_bal.cut(rasgo(RFIX[0] - 2.5, RFIX[1] + 2.5, 10.0, Z_MESA - 0.01, 3.0))   # cabeça do parafuso
for sx in (-1, 1):                                                                         # abas presas à caixa
    base_bal = base_bal.fuse(Part.makeBox(16, 4, 25, V(sx * 50 - 8, -HB - 4, Z_MESA)))
    base_bal = base_bal.cut(Part.makeCylinder(1.7, 10, V(sx * 50, -HB - 6, Z_MESA + 18), V(0, 1, 0)))
for ang in (30, 150, 270):                                                                 # batentes de sobrecarga
    bx, by = 60 * math.cos(math.radians(ang)), Y_VAS + 60 * math.sin(math.radians(ang))
    h_post = (Z_PLAT_FUNDO - 3.0) - Z_PISO
    base_bal = base_bal.fuse(Part.makeCylinder(6.0, h_post, V(bx, by, Z_PISO)))
    base_bal = base_bal.cut(Part.makeCylinder(1.4, h_post, V(bx, by, Z_PISO + 2)))
for sx in (-1, 1):
    base_bal = base_bal.cut(Part.makeCylinder(6.0, 1.5, V(sx * 60, BAL_Y0 + 12, Z_MESA)))
base_bal = unico(base_bal)

# plataforma flutuante: lisa, com sulcos concêntricos para centralizar qualquer vasilha
plat = Part.makeCylinder(PLAT_D / 2, PLAT_T, V(0, Y_VAS, Z_PLAT_FUNDO))
for d in (100, 110, 120):
    plat = plat.cut(Part.makeCylinder(d / 2 + 0.4, 0.6, V(0, Y_VAS, Z_PLAT_TOPO - 0.6)).cut(
        Part.makeCylinder(d / 2 - 0.4, 0.6, V(0, Y_VAS, Z_PLAT_TOPO - 0.6))))
# espaçador separado (assim a plataforma imprime com o fundo plano na mesa)
espac = Part.makeBox(16, LIV_Y1 - LIV_Y0, BOSS_H, V(-8, LIV_Y0, Z_PLAT_FUNDO - BOSS_H))
furo = rasgo(RLIV[0], RLIV[1], RASGO_L, Z_PLAT_FUNDO - BOSS_H - 1, 40)
plat = plat.cut(furo).cut(rasgo(RLIV[0] - 2.5, RLIV[1] + 2.5, 10.0, Z_PLAT_TOPO - 3.0, 3.01))
espac = espac.cut(furo)
plat = unico(plat)
espac = unico(espac)

# ---------------------------------------------------------------- referências
tubo = Part.makeCylinder(TUBO_DE / 2, TUBO_L, V(0, 0, TUBO_Z0)).cut(
    Part.makeCylinder(R_TUBO_INT, TUBO_L, V(0, 0, TUBO_Z0)))


def cap(z_fundo, para_cima):
    c = Part.makeCylinder(CAP_D_EXT / 2, CAP_H, V(0, 0, z_fundo))
    c = c.cut(Part.makeCylinder(TUBO_DE / 2, CAP_H - CAP_FUNDO, V(0, 0, z_fundo + CAP_FUNDO)))
    if not para_cima:
        c.rotate(V(0, 0, z_fundo + CAP_H / 2), V(1, 0, 0), 180)
    return c


cap_sup = cap(TUBO_Z0 + TUBO_L + CAP_FUNDO - CAP_H, False)
celula = Part.makeBox(CEL_L, CEL_C, CEL_A, V(-CEL_L / 2, cel_y0, Z_PISO + BOSS_H))
def vasilha(d_topo, h):
    return Part.makeCone(VAS_D_FUNDO / 2, d_topo / 2, h, V(0, Y_VAS, Z_PLAT_TOPO)).cut(
        Part.makeCone(VAS_D_FUNDO / 2 - 2, d_topo / 2 - 2, h, V(0, Y_VAS, Z_PLAT_TOPO + 2)))


vas = vasilha(VAS_D_MAX, VAS_H_MAX)          # pior caso para folgas
celula_curta = Part.makeBox(CEL_L, CEL_C_MIN, CEL_A, V(-CEL_L / 2, Y_FIX0 - CEL_C_MIN, Z_PISO + BOSS_H))

# ---------------------------------------------------------------- verificações
erros = []


def checar(nome, ok, info=""):
    print(("OK   " if ok else "ERRO ") + nome + ("  " + info if info else ""))
    if not ok:
        erros.append(nome)


# o agitador não pode tocar no bocal em nenhum ângulo (a luva em si é comparada com a original)
eixo_luva_p, eixo_luva_d = fr(29, 0, 0), fdir(0, 0, 1)
so_agitador = tampa.cut(tampa_orig)
pior_ag, pior_dif = 0.0, 0.0
for ang in range(0, 360, 15):
    t, t0, ag = tampa.copy(), tampa_orig.copy(), so_agitador.copy()
    for x in (t, t0, ag):
        x.rotate(eixo_luva_p, eixo_luva_d, ang)
    pior_ag = max(pior_ag, ag.common(placa).Volume)
    pior_dif = max(pior_dif, t.common(placa).Volume - t0.common(placa_orig).Volume)
d_ag = so_agitador.distToShape(placa)[0]
checar("agitador gira 360° sem bater no bocal", pior_ag < 0.5, "interseção máx %.2f mm³, folga em 0° %.1f mm" % (pior_ag, d_ag))
checar("luva gira igual à original", pior_dif < 1.0, "diferença máx %.1f mm³" % pior_dif)
flutuante = plat.fuse([vas, espac])
for nome, s in [("caixa", bay), ("base da balança", base_bal), ("tubo", tubo),
                ("extensão do funil", extensao2), ("tampa traseira", tampa_tras)]:
    d = flutuante.distToShape(s)[0]
    checar("plataforma+vasilha livres de %s" % nome, d >= 3.0 - 1e-6, "folga %.1f mm" % d)
for nome_c, c in (("80 mm", celula), ("75 mm", celula_curta)):
    cb = c.BoundBox
    checar("espaçador apoia na ponta livre da célula de %s" % nome_c,
           espac.distToShape(c)[0] < 0.01 and espac.BoundBox.YMax <= cb.YMin + 30)
    meio = Part.makeBox(CEL_L, 1, CEL_A, V(-CEL_L / 2, (cb.YMin + cb.YMax) / 2 - 0.5, cb.ZMin))
    dm = min(espac.distToShape(meio)[0], base_bal.distToShape(meio)[0])
    checar("meio da célula de %s sem apoio" % nome_c, dm > 5, "%.1f mm até o apoio mais próximo" % dm)
d_bat = Z_PLAT_FUNDO - (Z_PISO + (Z_PLAT_FUNDO - 3.0 - Z_PISO))
checar("batentes abaixo da plataforma", d_bat > GAP_BATENTE, "folga sem parafuso %.1f mm (ajustar para %.1f com parafuso M3)" % (d_bat, GAP_BATENTE))
borda_vas = Z_PLAT_TOPO + VAS_H_MAX
checar("bico acima da borda da vasilha mais alta", Z_BICO_MIN - borda_vas >= FOLGA_BICO - 0.01, "%.1f mm" % (Z_BICO_MIN - borda_vas))
invade = (Y_VAS + VAS_D_MIN / 2 - 2) - Y_BICO
checar("bico dentro da vasilha mais estreita ≥ 15 mm", invade >= 15, "%.1f mm" % invade)
for nome, a, b in [("placa × funil", placa, funil), ("placa × suporte motor", placa, motor),
                   ("placa × tubo", placa, tubo)] + [("calço %d° × %s" % (ang, n), c, s) for ang, c in calcos
                                                     for n, s in [("funil", funil), ("suporte motor", motor), ("tubo", tubo), ("placa", placa)]]:
    v = a.common(b).Volume
    checar(nome + " sem interferência", v < 1.0, "%.1f mm³" % v)
checar("extensão × caixa", extensao2.distToShape(bay)[0] > 2, "%.1f mm" % extensao2.distToShape(bay)[0])

# capacidade do reservatório (acima da placa até o topo do tubo)
reserv = Part.makeCylinder(R_TUBO_INT, TUBO_L, V(0, 0, TUBO_Z0)).cut(slab.fuse(Part.makeCylinder(600, 600, Q, N45).common(Part.makeCylinder(R_TUBO_INT, 1000, V(0, 0, -500))).cut(Part.makeCylinder(600, 600, Q, N45))))
reserv = Part.makeCylinder(R_TUBO_INT, TUBO_L, V(0, 0, TUBO_Z0)).common(ACIMA_TOPO)
litros = reserv.Volume / 1e6

print("\nResumo")
print("  elevação da placa no eixo do bocal: %.1f mm" % DELTA)
print("  placa: z mín %.1f / z máx %.1f" % (slab.BoundBox.ZMin, slab.BoundBox.ZMax))
print("  bico: sai em Y=%.1f, z mín %.1f" % (Y_BICO, Z_BICO_MIN))
print("  caixa de eletrônica: %.0f x %.0f x %.0f mm" % (BAY_LADO, BAY_LADO, H_BAY))
print("  mesa em z=%.1f; plataforma topo z=%.1f; borda da vasilha z=%.1f" % (Z_MESA, Z_PLAT_TOPO, borda_vas))
print("  centro da vasilha Y=%.1f" % Y_VAS)
print("  altura total (mesa → topo do cap): %.0f mm" % (cap_sup.BoundBox.ZMax - Z_MESA))
print("  reservatório: %.2f L (≈ %.2f–%.2f kg de ração seca)" % (litros, litros * 0.45, litros * 0.6))

# ---------------------------------------------------------------- salvar
doc = App.newDocument("IoT3D_v2")
objs = [
    ("P01_superficie_inclinada_45", placa), ("P03_tampa_atuador_agitador", tampa),
    ("P04_suporte_motor", motor), ("P05_funil", funil), ("P06_extensao_funil_longa", extensao2),
    ("P08_caixa_eletronica", bay), ("P09_tampa_traseira", tampa_tras),
    ("P10_base_balanca", base_bal), ("P11_plataforma", plat), ("P12_espacador_plataforma", espac),
    ("REF_tubo_PVC_DN100", tubo), ("REF_cap_superior", cap_sup),
    ("REF_celula_5kg", celula), ("REF_vasilha_maior", vas),
]
for ang, c in calcos:
    objs.append(("P02_calco_%03d" % int(ang), c))
for nome, s in objs:
    o = doc.addObject("Part::Feature", nome)
    o.Shape = s
    o.Visibility = True
doc.recompute()
doc.saveAs(DST)


# Visibilidade/cores: o freecadcmd não grava a parte visual; rode depois preparar_visual.sh (abre a GUI e salva).
print("\nsalvo", DST)
if erros:
    print("\nATENÇÃO: %d verificação(ões) falharam" % len(erros))
