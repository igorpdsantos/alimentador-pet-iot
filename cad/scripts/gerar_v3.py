# Gera o alimentador v3 (independente dos modelos anteriores), pensado para orçamento de ~R$ 320:
#   - cartucho dosador anti-travamento: piso + anel/escudo + rotor de 6 bolsos com pás curvas RÍGIDAS (2,4 mm),
#     girado por servo MG90S de rotação contínua (inverte quando não cai ração)
#   - chapéu (P10) sobre o cartucho: telhado inclinado + bloco fechado sobre o escudo; alivia o peso da
#     coluna de ração sobre o rotor (estudo DEM em tools/dem_dosador, specs/03-mecanica §3.1)
#   - bica que atravessa a parede do tubo, com moldura que esconde o corte
#   - eletrônica dentro do tubo (protoboard MB-102 em pé numa espinha), pilhas dentro do pedestal
#   - balança escondida sob plataforma com saia
# Saída: cad/IoT3D_v3.FCStd  ("Pxx_*" = imprimir; "REF_*" = comprado/referência)
#
# Rodar da raiz do projeto:
#   cad/scripts/fc.sh "cad/scripts/gerar_v3.py"
#   cad/scripts/preparar_visual.sh "cad/IoT3D_v3.FCStd"
import math
import os

import FreeCAD as App
import Part

V = App.Vector
ROOT = os.getcwd()
DST = os.path.join(ROOT, "cad", "IoT3D_v3.FCStd")
SQ2 = math.sqrt(2)

# ================================================================ parâmetros
# Sistema: mm, Z = 0 na mesa, tubo centrado em X = Y = 0, vasilha em −Y (frente), +Y = trás.
# Tubo PVC esgoto série normal DN100 (NBR 5688): DE 101,6 × 1,8 mm
TUBO_RE = 101.6 / 2
TUBO_RI = TUBO_RE - 1.8
TUBO_L = 640.0                    # comprimento cortado; dimensionado para CAP_MIN_KG (verificação abaixo)
CAP_MIN_KG = 1.2                  # requisito: ≥ 1,2 kg de ração com o tubo cheio (1 kg + 200 g de margem)
RHO_RACAO_MIN = 0.45              # kg/L — ração LEVE (pior caso; 0,45–0,6 típico). Medir: pesar 1 L da ração do pet
FATOR_ENCHIMENTO = 0.90           # parte do volume livre que a ração ocupa de fato (sombra do chapéu; DEM ≈ 0,9)
CAP_D_EXT, CAP_H, CAP_FUNDO = 108.0, 45.0, 3.0         # só referência visual

# Componentes comprados (medidas de catálogo — conferir com a peça na mão)
ESP32 = (28.3, 51.5, 13.0)        # DOIT DevKit V1 30 pinos: largura, comprimento, altura c/ pinos
PROTO = (55.0, 165.0, 10.0)       # MB-102 830 furos: largura, comprimento, espessura
HX711 = (20.0, 34.0, 4.0)
BUCK = (17.0, 22.0, 5.0)          # MP1584
PILHAS = (89.0, 58.0, 16.0)       # suporte 6×AA chato (1 camada)
CHAVE_RECORTE = (13.5, 9.0)       # chave gangorra KCD11 (corpo 15 × 10): recorte no painel, parede ≤ 2,5 mm
BOTAO_D = 12.0                    # push-button de painel com rosca 12 mm (porca ~16 mm)
JACK_D = 8.0                      # jack P4 fêmea de painel, rosca 8 mm
# Servo MG90S 360° (corpo, abas, eixo). Eixo fica a EIXO_OFF do centro do corpo.
SV_C, SV_L, SV_H = 22.8, 12.2, 22.7
SV_TOPO_EIXO = 31.0               # do fundo do corpo ao topo do estriado
SV_ABA_Z, SV_ABA_T, SV_ABA_C, SV_ABA_PASSO = 16.0, 2.5, 32.5, 27.8
SV_EIXO_OFF = 5.4
BRACO_SERVO = (36.0, 6.0, 2.0)    # braço duplo que vem com o servo (comprimento, largura, espessura)

# Pedestal
PED_R = 70.0
PED_FUNDO = 2.5
PED_CAV_Z1 = PED_FUNDO + 16.0 + 1.0   # topo da cavidade das pilhas (suporte chato de 16 mm + 1)
ABA_T = 3.0                       # degrau onde apoiam o tubo e a bandeja
# Gaveta das pilhas (P11): sai pela esquerda (−X), único lado livre do pedestal; troca sem virar o alimentador
GAV_FOLGA, GAV_PAREDE, GAV_FUNDO_Z0 = 0.4, 2.0, 0.3     # folga por lado, paredes, fundo da gaveta acima da mesa
GAV_FOLGA_TOPO = 1.2   # sob a ponte de ~64 mm do pedestal (impressa sem suporte, pode ceder ~1 mm)
Z_PILHAS = PED_FUNDO - 0.5                             # suporte apoiado no fundo da gaveta
# Trava da gaveta: aba na frente (encaixa num rebaixo rente à parede) com 2 pares de ímãs de neodímio
ABA_GAV_T, ABA_GAV_M, ABA_GAV_FOLGA = 4.0, 10.0, 0.2    # espessura, quanto passa do vão, folga com os ímãs encostando
IMA_D, IMA_H, IMA_REC = 6.0, 2.0, 0.5                  # ímã 6 × 2 mm (comprado); rebaixado 0,5 mm de cada lado
IMA_Z = 9.0
# Patas anti-tombamento (P12 ×4) + tampas do lastro (P13 ×4): alargam o apoio de 70 para ~120 mm do eixo
PATA_R1, PATA_PAREDE = 138.0, 2.4                     # alcance, parede
PATA_H0, PATA_H1 = 16.0, 7.0                           # altura junto ao pedestal e na ponta (topo inclinado)
PATA_R_CANTO = 15.0                                    # arredondamento do contorno ("pétala")
PATA_R_BORDA = 3.0                                     # arredondamento da borda de cima
PATA_TAMPA_M = 4.5                                     # da borda da pata até a tampa (fora do arredondamento)
PATA_ABA_H, PATA_ABA_T = 20.0, 3.0                     # aba que abraça o pedestal (2 parafusos M3 × 12)
PATA_FOLGA_PLAT = 3.0                                  # das patas da frente até a saia da plataforma (que flutua)
TAMPA_T, TAMPA_DEGRAU = 2.0, 1.5                       # tampa do bolso de lastro e degrau onde ela apoia
# janelas de cada pata (x0, x1, y0, y1): livram painel (+X, |y| < 25), jack (+Y, |x| < 7), gaveta (−X, |y| < 42)
PATAS = {"TD": (15, 300, 30, 300), "TE": (-300, -15, 45, 300), "FE": (-300, -20, -300, -45), "FD": (20, 300, -300, -30)}
# massas para a conta de tombamento (estimativa; ração no pior caso leve)
MASSAS_KG = {"tubo PVC": 0.50, "peças impressas": 0.60, "eletrônica + servo": 0.20, "pilhas + suporte": 0.16,
             "vasilha": 0.20, "lastro": 0.60}
GAV_Y = PILHAS[1] / 2 + 0.5 + GAV_PAREDE               # meia-largura externa da gaveta
SOQ_PROF = 15.0
Z_TB = PED_CAV_Z1 + ABA_T         # fundo do tubo
PED_H = Z_TB + SOQ_PROF

# Vasilha (envelope aceito) e balança
VAS_D_MIN, VAS_D_MAX, VAS_H_MAX, VAS_D_FUNDO = 140.0, 160.0, 60.0, 125.0
CEL_C_MIN, CEL_C_MAX, CEL_L, CEL_A = 75.0, 80.0, 12.7, 12.7
RASGO_L, FIXO_COMPR = 5.4, 27.0
PISO_BAL, BOSS_H, PLAT_T = 5.0, 6.0, 6.0
PLAT_R, SAIA_E, SAIA_Z0, BASE_R = 68.0, 2.5, 4.0, 62.0
FOLGA_BICO = 10.0

# Cartucho dosador
R_CART = TUBO_RI - 0.3
R_ANEL = 45.0
T_PISO, H_SAIA = 4.0, 10.0
GAP_PISO, H_ROTOR, GAP_ESCUDO, T_ESCUDO = 0.8, 28.0, 1.5, 6.0     # escudo de 6 mm: recebe os pinos do chapéu
AZ_FRENTE, ANG_SAIDA, ANG_ESCUDO = 270.0, 60.0, 80.0
R_SAIDA_IN, R_CUBO = 18.0, 20.0
N_BOLSOS = 6
R_PA_OUT, T_PA, CURVA_PA = 43.6, 2.4, 25.0       # pá: ponta, espessura (rígida: não trinca nem solta lasca), curva (graus)

# Chapéu (P10): telhado sobre a frente, aresta atravessando o tubo, cai para trás (+Y)
ALFA_CH = 55.0        # inclinação do telhado (graus); ≥ 50° para a ração escorregar e não ficar parada
T_CH = 3.0            # espessura do telhado
Y_ARESTA = 5.0        # aresta de baixo do telhado, além do centro (lado de trás)
H_ARESTA = 40.0       # altura da aresta acima do topo do escudo (deixa passar grão de 22 mm)
ALFA_CUM = 45.0       # laterais da cumeeira sobre o escudo (graus)
R_ARESTA = 1.4        # arredondamento das arestas livres
PINO_CH_D, PINO_CH_H, PINO_CH_R, PINO_CH_AZ = 3.0, 3.0, 33.0, (255.0, 285.0)

# Bica
BICA_W, BICA_Y_FUNDO, BICA_QUEDA = 50.0, -16.0, 20.0
Y_QUEBRA, Y_SAIDA, PAREDE_BICA = -R_ANEL - 0.5, -108.0, 2.5

# ================================================================ derivados
STACK = PISO_BAL + BOSS_H + CEL_A + BOSS_H + PLAT_T
Z_PLAT_FUNDO = STACK - PLAT_T
BORDA_MAX = STACK + VAS_H_MAX
OFF = PAREDE_BICA * SQ2
Z_F = math.ceil(BORDA_MAX + FOLGA_BICO + BICA_QUEDA - (Y_SAIDA - BICA_Y_FUNDO) + OFF)
Z_HUB0 = Z_F + GAP_PISO
Z_HUB1 = Z_HUB0 + H_ROTOR
Z_ESC0 = Z_HUB1 + GAP_ESCUDO
Z_ESC1 = Z_ESC0 + T_ESCUDO
Z_TOPO_TUBO = Z_TB + TUBO_L
Y_VAS = -(PED_R + 6.0 + PLAT_R)
# servo: braço encaixado no rebaixo de baixo do cubo
Z_BRACO_TOPO = Z_HUB0 + 2.4                         # 0,1 mm abaixo do fundo do rebaixo
Z_SV0 = Z_BRACO_TOPO - 0.5 - SV_TOPO_EIXO          # fundo do corpo do servo
Z_ABA_TOPO = Z_SV0 + SV_ABA_Z + SV_ABA_T
SV_CX = -SV_EIXO_OFF                                # centro do corpo (eixo em x=0)


def piso_bica(y):
    return Z_F - BICA_QUEDA + (y - BICA_Y_FUNDO)


# ================================================================ utilidades
def unico(s):
    s = s.removeSplitter()
    if len(s.Solids) != 1:
        raise RuntimeError("esperado 1 sólido, veio %d" % len(s.Solids))
    return s.Solids[0]


def setor(r_in, r_out, a0, a1, z0, h):
    s = Part.makeCylinder(r_out, h, V(0, 0, z0), V(0, 0, 1), a1 - a0)
    if r_in > 0:
        s = s.cut(Part.makeCylinder(r_in, h, V(0, 0, z0)))
    s.rotate(V(0, 0, 0), V(0, 0, 1), a0)
    return s


def anel(r_in, r_out, z0, h, c=(0, 0)):
    return Part.makeCylinder(r_out, h, V(c[0], c[1], z0)).cut(Part.makeCylinder(r_in, h, V(c[0], c[1], z0)))


def dir_az(az):
    return V(math.cos(math.radians(az)), math.sin(math.radians(az)), 0)


def radial(az, r0, comp, z, raio):
    return Part.makeCylinder(raio, comp, V(0, 0, z) + dir_az(az) * r0, dir_az(az))


def chanfro_radial(az, z_aresta, c):
    w = Part.makeBox(120, 60, 60, V(0, -60, -60))
    w.rotate(V(0, 0, 0), V(1, 0, 0), 45)
    w.rotate(V(0, 0, 0), V(0, 0, 1), az)
    w.translate(V(0, 0, z_aresta + c))
    return w


def poligono_yz(pts, x0, largura):
    wire = Part.makePolygon([V(x0, y, z) for y, z in pts] + [V(x0, pts[0][0], pts[0][1])])
    return Part.Face(wire).extrude(V(largura, 0, 0))


def rasgo(y0, y1, larg, z0, h, x=0.0):
    r = larg / 2
    return Part.makeBox(larg, (y1 - y0) - larg, h, V(x - r, y0 + r, z0)).fuse(
        [Part.makeCylinder(r, h, V(x, y0 + r, z0)), Part.makeCylinder(r, h, V(x, y1 - r, z0))])


def caixa(dx, dy, dz, centro_xy, z0):
    return Part.makeBox(dx, dy, dz, V(centro_xy[0] - dx / 2, centro_xy[1] - dy / 2, z0))


# ================================================================ cartucho: piso (A)
piso = Part.makeCylinder(R_CART, T_PISO, V(0, 0, Z_F - T_PISO))
piso = piso.fuse(anel(R_CART - 3.2, R_CART, Z_F - T_PISO - H_SAIA, H_SAIA))
for az in (30, 90, 150):
    piso = piso.fuse(setor(R_CART - 8, R_CART, az - 6, az + 6, Z_F - T_PISO - H_SAIA, H_SAIA))
    piso = piso.cut(radial(az, R_CART - 9, 10, Z_F - T_PISO - H_SAIA / 2, 1.3))
piso = piso.cut(setor(R_CART - 9, R_CART + 1, 220, 320, Z_F - T_PISO - H_SAIA - 1, H_SAIA + 1))
piso = piso.cut(setor(R_ANEL + 0.5, R_CART + 1, 220, 320, Z_F - T_PISO - 1, T_PISO + 2))
piso = piso.cut(setor(R_SAIDA_IN, R_ANEL, AZ_FRENTE - ANG_SAIDA / 2, AZ_FRENTE + ANG_SAIDA / 2, Z_F - T_PISO - 1, T_PISO + 2))
piso = piso.cut(caixa(SV_C + 1.2, SV_L + 1.2, T_PISO + 2, (SV_CX, 0), Z_F - T_PISO - 1))          # topo do servo passa
for sx in (-1, 1):                                                                                   # apoios das abas do servo
    xa = SV_CX + sx * SV_ABA_PASSO / 2
    h_apoio = (Z_F - T_PISO) - Z_ABA_TOPO
    xa = SV_CX + sx * (SV_C / 2 + 0.4 + 2.2)                                                         # encostado no corpo, sobre o furo da aba
    piso = piso.fuse(caixa(4.4, SV_L, h_apoio, (xa, 0), Z_ABA_TOPO))
    piso = piso.cut(Part.makeCylinder(0.8, h_apoio + 2, V(xa, 0, Z_ABA_TOPO - 1)))
piso = piso.cut(Part.makeCylinder(4.0, T_PISO + 2, V(0, 30, Z_F - T_PISO - 1)))                     # cabo do servo
for az in (30, 90, 150):                                                                              # furos dos pinos do anel
    piso = piso.cut(Part.makeCylinder(1.45, 3.5, dir_az(az) * ((R_ANEL + R_CART) / 2) + V(0, 0, Z_F - 3.5)))
piso = unico(piso)

# ================================================================ cartucho: anel + escudo (B)
anel_b = anel(R_ANEL, R_CART, Z_F, Z_ESC1 - Z_F)
escudo = setor(R_CUBO + 1.0, R_ANEL + 0.5, AZ_FRENTE - ANG_ESCUDO / 2, AZ_FRENTE + ANG_ESCUDO / 2, Z_ESC0, T_ESCUDO)
for az in (AZ_FRENTE - ANG_ESCUDO / 2, AZ_FRENTE + ANG_ESCUDO / 2):
    escudo = escudo.cut(chanfro_radial(az, Z_ESC0, 2.5))
anel_b = anel_b.fuse(escudo)
chanfro = Part.makeCone(R_ANEL, R_CART + 0.01, 3.0, V(0, 0, Z_ESC1 - 3.0)).cut(
    Part.makeCylinder(R_ANEL + 0.5, 10, V(0, 0, Z_ESC1 - 5.0)))                                      # só no anel: não come o escudo
anel_b = anel_b.cut(chanfro)
R_PINO = (R_ANEL + R_CART) / 2
for az in (30, 90, 150):                                                                              # pinos: anel encaixa no piso
    anel_b = anel_b.fuse(Part.makeCylinder(1.25, 3.0, dir_az(az) * R_PINO + V(0, 0, Z_F - 3.0)))
for sx in (-1, 1):
    anel_b = anel_b.cut(Part.makeCylinder(1.3, 10, V(sx * 15, -R_ANEL + 1, Z_F + 3.0), V(0, -1, 0)))
anel_b = unico(anel_b)

# ================================================================ rotor com pás curvas flexíveis
rotor = Part.makeCylinder(R_CUBO, H_ROTOR, V(0, 0, Z_HUB0))


def pa_curva(az0):
    n = 12
    centro = []
    for i in range(n + 1):
        r = (R_CUBO - 1.0) + (R_PA_OUT - R_CUBO + 1.0) * i / n
        a = math.radians(az0 - CURVA_PA * (r - R_CUBO + 1.0) / (R_PA_OUT - R_CUBO + 1.0))
        centro.append(V(r * math.cos(a), r * math.sin(a), 0))
    esq, dirt = [], []
    for i, p in enumerate(centro):
        q = centro[min(i + 1, n)] - centro[max(i - 1, 0)]
        nrm = V(-q.y, q.x, 0)
        nrm.normalize()
        esq.append(p + nrm * (T_PA / 2))
        dirt.append(p - nrm * (T_PA / 2))
    pts = esq + list(reversed(dirt))
    face = Part.Face(Part.makePolygon(pts + [pts[0]]))
    face.translate(V(0, 0, Z_HUB0))
    return face.extrude(V(0, 0, H_ROTOR))


rotor = rotor.fuse([pa_curva(k * 360.0 / N_BOLSOS) for k in range(N_BOLSOS)])
for sx in (-1, 1):                                                                                   # dedos agitadores
    rotor = rotor.fuse(Part.makeCylinder(3.0, 11, V(sx * 12, 0, Z_HUB1)))
    rotor = rotor.fuse(Part.makeSphere(3.0, V(sx * 12, 0, Z_HUB1 + 11)))
rotor = rotor.cut(caixa(BRACO_SERVO[0] + 0.6, BRACO_SERVO[1] + 0.6, 2.5, (0, 0), Z_HUB0 - 0.01))    # braço do servo
rotor = rotor.cut(Part.makeCylinder(2.6, H_ROTOR + 2, V(0, 0, Z_HUB0 - 1)))                         # chave no parafuso do eixo
for sx in (-1, 1):
    rotor = rotor.cut(Part.makeCylinder(0.8, 8, V(sx * 12, 0, Z_HUB0 - 0.5)))                       # parafusos do braço
rotor = unico(rotor)

# ================================================================ chapéu (P10)
Z_AR = Z_ESC1 + H_ARESTA                                   # face de baixo do telhado na aresta
TA = math.tan(math.radians(ALFA_CH))
u_ch = (-math.cos(math.radians(ALFA_CH)), math.sin(math.radians(ALFA_CH)))     # ao longo do telhado (sobe p/ frente)
n_ch = (math.sin(math.radians(ALFA_CH)), math.cos(math.radians(ALFA_CH)))      # normal (para cima/trás)
pA = (Y_ARESTA, Z_AR)
pB = (pA[0] + T_CH * n_ch[0], pA[1] + T_CH * n_ch[1])
telhado = poligono_yz([pA, pB, (pB[0] + 200 * u_ch[0], pB[1] + 200 * u_ch[1]),
                       (pA[0] + 200 * u_ch[0], pA[1] + 200 * u_ch[1])], -60, 120)
telhado = telhado.common(Part.makeCylinder(R_CART, 300, V(0, 0, Z_ESC1)))


def z_topo_ch(y):                                           # face de cima do telhado
    return Z_AR + (Y_ARESTA - y) * TA + T_CH / math.cos(math.radians(ALFA_CH))


# cumeeira fechada sobre o escudo: sem ela a ração ficaria parada (envelhecendo) entre o escudo e o telhado.
# Laterais a ALFA_CUM partindo da borda do escudo: o grão que o chanfro do escudo levanta sobe a rampa e
# escorrega de volta (com parede vertical ele ficava prensado — DEM: torque 2,0 × 1,3 kgf·cm)
bloco = setor(R_CUBO + 1.0, R_CART, AZ_FRENTE - ANG_ESCUDO / 2, AZ_FRENTE + ANG_ESCUDO / 2, Z_ESC1, 300)
bloco = bloco.common(poligono_yz([(-60, Z_ESC1 - 1), (-10, Z_ESC1 - 1), (-10, z_topo_ch(-10)), (-60, z_topo_ch(-60))], -60, 120))
nervura = bloco.common(Part.makeBox(4.0, 200, 400, V(-2.0, -100, 0)))      # liga a cumeeira ao telhado
TC = math.tan(math.radians(ALFA_CUM))
for az_lado, sinal in ((AZ_FRENTE - ANG_ESCUDO / 2, 1), (AZ_FRENTE + ANG_ESCUDO / 2, -1)):
    rampa = poligono_yz([(0, Z_ESC1 - 1), (sinal * 120, Z_ESC1 - 1), (sinal * 120, Z_ESC1 + 120 * TC), (0, Z_ESC1)], 0, 80)
    rampa.rotate(V(0, 0, 0), V(0, 0, 1), az_lado)
    bloco = bloco.common(rampa)
bloco = bloco.fuse(nervura)
chapeu = telhado.fuse(bloco).removeSplitter()
arestas = []
for e in chapeu.Edges:                                      # aresta de baixo do telhado e quinas do bloco
    bb = e.BoundBox
    if bb.XLength > 20 and bb.ZLength < 6 and bb.YMax > Y_ARESTA - 4:
        arestas.append(e)
    elif bb.ZLength > 10 and bb.XLength < 0.01 and bb.YLength < 0.01:
        arestas.append(e)
try:
    chapeu = chapeu.makeFillet(R_ARESTA, arestas)
except Exception as ex:
    print("AVISO: arredondamento do chapéu falhou (%s)" % ex)
for az in PINO_CH_AZ:                                       # pinos que encaixam no escudo
    chapeu = chapeu.fuse(Part.makeCylinder(PINO_CH_D / 2, PINO_CH_H, dir_az(az) * PINO_CH_R + V(0, 0, Z_ESC1 - PINO_CH_H)))
chapeu = unico(chapeu)
for az in PINO_CH_AZ:                                       # furos dos pinos no escudo (P02)
    anel_b = anel_b.cut(Part.makeCylinder(PINO_CH_D / 2 + 0.2, PINO_CH_H + 0.5,
                                          dir_az(az) * PINO_CH_R + V(0, 0, Z_ESC1 - PINO_CH_H - 0.5)))
anel_b = unico(anel_b)

# ================================================================ bica + moldura
z_cap = Z_F - T_PISO
ext = [(BICA_Y_FUNDO + PAREDE_BICA, piso_bica(BICA_Y_FUNDO + PAREDE_BICA) - OFF),
       (BICA_Y_FUNDO + PAREDE_BICA, z_cap), (Y_QUEBRA, z_cap),
       (Y_QUEBRA, z_cap + OFF), (Y_SAIDA, z_cap + OFF + (Y_SAIDA - Y_QUEBRA)),
       (Y_SAIDA, piso_bica(Y_SAIDA) - OFF)]
inte = [(BICA_Y_FUNDO, piso_bica(BICA_Y_FUNDO)), (BICA_Y_FUNDO, z_cap + 5), (Y_QUEBRA, z_cap + 5),
        (Y_QUEBRA, z_cap), (Y_SAIDA - 1, z_cap + (Y_SAIDA - 1 - Y_QUEBRA)), (Y_SAIDA - 1, piso_bica(Y_SAIDA - 1))]
bica_ext = poligono_yz(ext, -BICA_W / 2 - PAREDE_BICA, BICA_W + 2 * PAREDE_BICA)
bica_int = poligono_yz(inte, -BICA_W / 2, BICA_W)
z_jan_top = z_cap + OFF + 0.5                                  # pior caso: onde a parede cruza o degrau do teto
z_jan_bot = piso_bica(-TUBO_RE) - OFF - 0.5
casca = anel(TUBO_RE + 0.3, TUBO_RE + 3.3, z_jan_bot - 7, z_jan_top - z_jan_bot + 14)
casca = casca.common(Part.makeBox(BICA_W + 2 * PAREDE_BICA, 30, 600, V(-BICA_W / 2 - PAREDE_BICA, -TUBO_RE - 10, 0)))
bica = bica_ext.fuse(casca).cut(bica_int)
for sx in (-1, 1):
    bica = bica.cut(Part.makeCylinder(1.7, 10, V(sx * 15, -TUBO_RE + 1, Z_F + 3.0), V(0, -1, 0)))
bica = unico(bica)
janela = Part.makeBox(BICA_W + 2 * PAREDE_BICA + 0.6, 25, z_jan_top - z_jan_bot,
                      V(-BICA_W / 2 - PAREDE_BICA - 0.3, -TUBO_RE - 6, z_jan_bot))     # parede é curva: nas laterais cruza em y≈−41

# ================================================================ bandeja + espinha da protoboard
Y_ESP = 22.0                                         # face da espinha onde cola a protoboard (lado −Y)
bandeja = Part.makeCylinder(TUBO_RI - 0.5, 2.5, V(0, 0, Z_TB))
bandeja = bandeja.cut(caixa(30, 14, 3, (0, -30), Z_TB - 0.2))                                       # passagem de fios
bandeja = bandeja.cut(caixa(14, 11, 3, (0, 38.5), Z_TB - 0.2))                                        # fios do jack (atrás)
H_ESPINHA = PROTO[1] + 5
espinha = caixa(PROTO[0] + 6, 2.5, H_ESPINHA, (0, Y_ESP + 1.25), Z_TB + 2.5)
espinha = espinha.fuse(caixa(PROTO[0] + 6, 2.5, 3, (0, Y_ESP - 1.25), Z_TB + 2.5))                  # batente da protoboard
for j in range(5):
    for sx in (-1, 1):
        espinha = espinha.cut(caixa(3, 6, 8, (sx * 30.5, Y_ESP + 1.25), Z_TB + 20 + j * 32))
bandeja = unico(bandeja.fuse(espinha))

# ================================================================ pedestal
ped = Part.makeCylinder(PED_R, PED_H)
ped = ped.makeFillet(4.0, [e for e in ped.Edges if abs(e.BoundBox.ZMin - PED_H) < 1e-6])
ped = ped.cut(Part.makeCylinder(TUBO_RE + 0.3, SOQ_PROF + 1, V(0, 0, Z_TB)))                        # soquete do tubo
ped = ped.cut(Part.makeCylinder(44.0, ABA_T + 1, V(0, 0, PED_CAV_Z1 - 0.5)))                         # abertura p/ o tubo
ped = ped.cut(caixa(PILHAS[0] + 2, PILHAS[1] + 2, PED_CAV_Z1 - PED_FUNDO + 0.01, (0, 0), PED_FUNDO))  # pilhas
GAV_X1 = PILHAS[0] / 2 + 2.6                                                                          # fundo da gaveta (+X)
vao_gav = Part.makeBox(GAV_X1 + PED_R + 5, 2 * (GAV_Y + GAV_FOLGA), PED_CAV_Z1 + 1,
                       V(-PED_R - 5, -(GAV_Y + GAV_FOLGA), -1))
ped = ped.cut(vao_gav)                                                                                # vão da gaveta (lado −X + fundo)
# lateral direita (+X): LED, chave KCD11 e botão — parede afinada para 2–3 mm atrás de cada um
ped = ped.cut(caixa(16, 52, PED_CAV_Z1 - PED_FUNDO + 0.01, (PILHAS[0] / 2 + 8, 0), PED_FUNDO))       # bolso lateral
Z_PAINEL = 10.5
Y_LED, Y_CHAVE, Y_BOTAO = -20.0, -3.0, 16.0


def x_parede(y, folga):                                   # x onde a parede fica com 'folga' mm de espessura
    return math.sqrt(PED_R ** 2 - y ** 2) - folga


ped = ped.cut(Part.makeCylinder(2.55, 16, V(PED_R - 14, Y_LED, Z_PAINEL), V(1, 0, 0)))               # LED 5 mm (entra por dentro, a partir do bolso)
ped = ped.cut(Part.makeBox(x_parede(Y_CHAVE, 2.2) - 58, 18, 14, V(58, Y_CHAVE - 9, Z_PAINEL - 7)))  # rebaixo da chave
ped = ped.cut(Part.makeBox(10, CHAVE_RECORTE[0], CHAVE_RECORTE[1],
                           V(PED_R - 7, Y_CHAVE - CHAVE_RECORTE[0] / 2, Z_PAINEL - CHAVE_RECORTE[1] / 2)))  # recorte KCD11
ped = ped.cut(Part.makeCylinder(8.5, x_parede(Y_BOTAO + 8.5, 2.5) - 56, V(56, Y_BOTAO, Z_PAINEL), V(1, 0, 0)))   # rebaixo da porca (≥ 2,5 mm na borda)
ped = ped.cut(Part.makeCylinder(BOTAO_D / 2 + 0.2, 15, V(PED_R - 9, Y_BOTAO, Z_PAINEL), V(1, 0, 0)))     # botão
# traseira (+Y): jack P4
ped = ped.cut(caixa(14, 22, 13, (0, 52), PED_FUNDO))                                                  # bolso do jack
ped = ped.cut(Part.makeCylinder(7.0, x_parede(0, 3.0) - 58, V(0, 58, 9), V(0, 1, 0)))                # rebaixo da porca
ped = ped.cut(Part.makeCylinder(JACK_D / 2 + 0.2, 12, V(0, PED_R - 8, 9), V(0, 1, 0)))               # jack P4
Y_SUB0, Y_SUB1 = GAV_Y + GAV_FOLGA + 0.8, 44.5                                                      # chaminés: fios sobem por fora da gaveta
comp_canal = PED_R + 2 - Y_SUB0
ped = ped.cut(caixa(10, comp_canal + 1, 9, (0, -(Y_SUB0 + comp_canal / 2)), PED_FUNDO))               # canaleta dos fios da célula
ped = ped.cut(caixa(10, Y_SUB1 - Y_SUB0, Z_TB - PED_FUNDO + 0.5, (0, -(Y_SUB0 + Y_SUB1) / 2), PED_FUNDO))   # sobe p/ o tubo
ped = ped.cut(caixa(10, Y_SUB1 - Y_SUB0, Z_TB - PED_FUNDO + 0.5, (0, (Y_SUB0 + Y_SUB1) / 2), PED_FUNDO))     # jack → sobe p/ o tubo
ped = ped.cut(caixa(10, 13, 9, (0, Y_SUB0 + 6), PED_FUNDO))                                           # bolso do jack → chaminé
for az in (0, 180):
    ped = ped.cut(radial(az, TUBO_RE - 1, 25, Z_TB + SOQ_PROF / 2, 1.3))
for sx in (-1, 1):
    ped = ped.cut(Part.makeCylinder(1.3, 15, V(sx * 12, -PED_R - 1, 20), V(0, 1, 0)))
for az in (45, 135, 225, 315):
    ped = ped.cut(Part.makeCylinder(6, 1.5, dir_az(az) * 58 + V(0, 0, -0.01)))
ped = unico(ped)

# ================================================================ gaveta das pilhas (P11)
X_FUNDO_GAV = GAV_X1 - GAV_FOLGA                                                                    # ponta de dentro da gaveta
X_PILHA0 = -PILHAS[0] / 2 - 0.5                                                                      # onde começa o suporte
YI = GAV_Y - GAV_PAREDE
gav = Part.makeBox(X_FUNDO_GAV + PED_R, 2 * GAV_Y, PED_CAV_Z1 - GAV_FOLGA_TOPO - GAV_FUNDO_Z0, V(-PED_R, -GAV_Y, GAV_FUNDO_Z0))
gav = gav.common(Part.makeCylinder(PED_R, 50, V(0, 0, -5)))                                          # frente acompanha o pedestal
gav = gav.cut(Part.makeBox(X_FUNDO_GAV - X_PILHA0 + 1, 2 * YI, 30, V(X_PILHA0, -YI, Z_PILHAS)))      # berço do suporte (fundo aberto)
gav = gav.fuse(Part.makeBox(1.5, 2 * YI, 2.5, V(X_FUNDO_GAV - 1.5, -YI, Z_PILHAS)))                  # batente baixo: puxa o suporte
alivio = Part.makeBox(X_PILHA0 - 2.0 + PED_R, 2 * YI, 30, V(-PED_R, -YI, PED_FUNDO)).common(
    Part.makeCylinder(PED_R - 3.0, 50, V(0, 0, -5)))
alivio.translate(V(0, 0, Z_PILHAS - PED_FUNDO))
gav = gav.cut(alivio)                                                                                 # oco atrás da frente (3 mm)
# aba da frente: cobre o vão + ABA_GAV_M em volta; assenta no rebaixo do pedestal (batente)
R_REB = PED_R - ABA_GAV_T                                                                            # fundo do rebaixo
Y_ABA = GAV_Y + GAV_FOLGA + ABA_GAV_M
Z_ABA = PED_CAV_Z1 + ABA_GAV_M
zona_aba = Part.makeBox(PED_R, 2 * Y_ABA, Z_ABA + 1, V(-PED_R - 1, -Y_ABA, -1))
ped = ped.cut(zona_aba.cut(Part.makeCylinder(R_REB, 60, V(0, 0, -5))))                                # rebaixo na parede
aba_g = Part.makeBox(PED_R, 2 * (Y_ABA - GAV_FOLGA), Z_ABA - GAV_FOLGA - GAV_FUNDO_Z0, V(-PED_R - 1, -(Y_ABA - GAV_FOLGA), GAV_FUNDO_Z0))
aba_g = aba_g.common(Part.makeCylinder(PED_R, 60, V(0, 0, -5))).cut(Part.makeCylinder(R_REB + ABA_GAV_FOLGA, 60, V(0, 0, -5)))
gav = gav.fuse(aba_g)
gav = gav.cut(Part.makeCylinder(7.0, 30, V(-PED_R - 1, -15, PED_CAV_Z1), V(0, 1, 0)))                 # pega do dedo
imas = []
for sy in (-1, 1):
    y_i = sy * (GAV_Y + GAV_FOLGA + ABA_GAV_M / 2)
    x_i = -math.sqrt(R_REB ** 2 - y_i ** 2)
    n_i = V(x_i, y_i, 0).normalize()                                                                 # radial, para fora
    p_ped = V(x_i, y_i, IMA_Z)
    ped = ped.cut(Part.makeCylinder(IMA_D / 2 + 0.15, IMA_H + IMA_REC + 0.3, p_ped + n_i * 0.01, n_i * -1))   # alojamento no pedestal
    p_gav = p_ped + n_i * ABA_GAV_FOLGA
    gav = gav.cut(Part.makeCylinder(IMA_D / 2 + 0.15, IMA_H + IMA_REC + 0.3, p_gav - n_i * 0.01, n_i))        # alojamento na aba
    imas.append(Part.makeCylinder(IMA_D / 2, IMA_H, p_ped - n_i * (IMA_REC + IMA_H), n_i))
    imas.append(Part.makeCylinder(IMA_D / 2, IMA_H, p_gav + n_i * IMA_REC, n_i))
ped = unico(ped)
gav = gav.removeSplitter()
gav = unico(gav)

# ================================================================ patas anti-tombamento (P12) + tampas (P13)
# Visual: contorno em "pétala" (cantos arredondados), topo plano inclinado de PATA_H0 (junto ao pedestal) a PATA_H1
# (ponta), borda arredondada; tampa do lastro rente ao topo (só uma linha fina aparece).


def regiao_pata(janela, m, z0, h):
    x0, x1, y0, y1 = janela
    reg = anel(PED_R + 0.3 + m, PATA_R1 - m, z0, h)
    reg = reg.common(Part.makeBox(x1 - x0 - 2 * m, y1 - y0 - 2 * m, h + 2, V(x0 + m, y0 + m, z0 - 1)))
    if y1 < 0:                                                                       # frente: longe da saia da plataforma
        reg = reg.cut(Part.makeCylinder(PLAT_R + PATA_FOLGA_PLAT + m, h + 2, V(0, Y_VAS, z0 - 1)))
    return reg


def pegada(janela, m=0.0):
    """Contorno da pata no chão (face em z = 0), cantos de fora arredondados; m > 0 encolhe (paredes).
    O contorno é feito avançando para dentro do pedestal e depois recortado nele: assim só os cantos de fora
    arredondam e a pata encosta no pedestal na largura toda."""
    x0, x1, y0, y1 = janela
    reg = anel(PED_R - 25.0, PATA_R1, 0, 1).common(Part.makeBox(x1 - x0, y1 - y0, 3, V(x0, y0, -1)))
    if y1 < 0:
        reg = reg.cut(Part.makeCylinder(PLAT_R + PATA_FOLGA_PLAT, 3, V(0, Y_VAS, -1)))
    f = [x for x in reg.Faces if x.BoundBox.ZLength < 1e-6 and abs(x.BoundBox.ZMax) < 1e-6][0]
    f = f.makeOffset2D(-PATA_R_CANTO, join=0).makeOffset2D(PATA_R_CANTO, join=0)
    if m > 0:
        f = f.makeOffset2D(-m, join=0)
    return f.cut(Part.Face(Part.Wire(Part.makeCircle(PED_R + 0.3 + m)))).Faces[0]


def faixa_topo(az, lo, hi):
    """Fatia entre o topo inclinado da pata deslocado de lo e de hi (lo < hi); lo = None → até bem embaixo."""
    ta = (PATA_H0 - PATA_H1) / (PATA_R1 - PED_R)
    zt = lambda y, dz: PATA_H0 - ta * (y - PED_R) + dz                            # um plano só (tampa sai plana)
    ys = (-150, 200)
    baixo = [(y, -60.0) for y in ys] if lo is None else [(y, zt(y, lo)) for y in ys]
    pts = baixo + [(y, zt(y, hi)) for y in reversed(ys)]
    t = poligono_yz(pts, -150, 300)
    t.rotate(V(0, 0, 0), V(0, 0, 1), az - 90.0)
    return t


def topo_pata(az, dz=0.0):
    return faixa_topo(az, None, dz)


def suavizar(sol, es, raio):
    """Arredonda as arestas es; se o kernel falhar (ou devolver sólido inválido), tenta menor e depois chanfra."""
    vol = sol.Volume
    for op, rr in (("f", raio), ("f", raio * 0.6), ("f", raio * 0.35), ("c", raio * 0.6)):
        try:
            novo = sol.makeFillet(rr, es) if op == "f" else sol.makeChamfer(rr, es)
            if novo.isValid() and len(novo.Solids) == 1 and 0.8 * vol < novo.Volume <= vol + 1e-6:
                return novo
        except Exception:
            pass
    print("AVISO: arestas de uma pata ficaram vivas (kernel não arredondou)")
    return sol


patas, tampas, furos_pata, furos_info = {}, {}, [], []
VOL_LASTRO = 0.0
for nome, jan in PATAS.items():
    peg = pegada(jan)
    cm = peg.CenterOfMass
    az_eixo = math.degrees(math.atan2(cm.y, cm.x))
    # corpo com todas as bordas de cima arredondadas: núcleo encolhido R_BORDA e "inflado" de volta (offset 3D em arco)
    nucleo = pegada(jan, PATA_R_BORDA).extrude(V(0, 0, 50))
    nucleo.translate(V(0, 0, -10))
    corpo = nucleo.common(topo_pata(az_eixo, -PATA_R_BORDA)).makeOffsetShape(PATA_R_BORDA, 0.01, join=0)
    corpo = corpo.common(Part.makeBox(600, 600, 60, V(-300, -300, 0))).cut(Part.makeCylinder(PED_R + 0.3, 80, V(0, 0, -5)))
    aba = peg.extrude(V(0, 0, PATA_ABA_H)).common(Part.makeCylinder(PED_R + 0.3 + PATA_ABA_T, 60, V(0, 0, -5)))
    aba = suavizar(aba, [e for e in aba.Edges if e.BoundBox.ZMin > PATA_ABA_H - 0.01], 1.4)
    pt = corpo.fuse(aba).removeSplitter()
    r_int = PED_R + 0.3 + PATA_ABA_T + PATA_PAREDE                                   # o bolso fica longe da aba
    bolso = pegada(jan, PATA_TAMPA_M + TAMPA_DEGRAU).extrude(V(0, 0, 40))
    bolso.translate(V(0, 0, PATA_PAREDE))
    bolso = bolso.common(topo_pata(az_eixo, -TAMPA_T)).cut(Part.makeCylinder(r_int + TAMPA_DEGRAU, 60, V(0, 0, -5)))
    camada = faixa_topo(az_eixo, -TAMPA_T, 1.0)                                      # fatia do topo onde a tampa assenta
    degrau = pegada(jan, PATA_TAMPA_M).extrude(V(0, 0, 40)).common(camada).cut(Part.makeCylinder(r_int, 60, V(0, 0, -5)))
    pt = pt.cut(bolso.fuse(degrau).removeSplitter())                                 # um corte só (mais robusto)
    VOL_LASTRO += bolso.Volume
    tampa = pegada(jan, PATA_TAMPA_M + 0.2).extrude(V(0, 0, 40)).common(faixa_topo(az_eixo, -TAMPA_T, 0.0)).cut(
        Part.makeCylinder(r_int + 0.2, 60, V(0, 0, -5)))
    # 2 parafusos radiais na aba e pé de borracha na ponta (rebaixo Ø12 × 1,5)
    ang = [math.degrees(math.atan2(v.Point.y, v.Point.x)) for v in aba.Vertexes]
    if max(ang) - min(ang) > 180:                                                    # janela que cruza ±180°
        ang = [x % 360 for x in ang]
    a_min, a_max = min(ang), max(ang)
    for a in (a_min + 0.3 * (a_max - a_min), a_min + 0.7 * (a_max - a_min)):
        d = dir_az(a)
        furos_pata.append(Part.makeCylinder(1.3, 12.0, d * (PED_R + 0.01) + V(0, 0, 12.0), d * -1))   # no pedestal
        furos_info.append((d * (PED_R + 0.01) + V(0, 0, 12.0), d * -1))
        pt = pt.cut(Part.makeCylinder(1.7, PATA_ABA_T + 2, d * (PED_R - 1) + V(0, 0, 12.0), d))       # na aba
    p_pe = V(cm.x, cm.y, 0) * ((PATA_R1 - 16) / math.hypot(cm.x, cm.y))
    pt = pt.cut(Part.makeCylinder(6.0, 1.5, p_pe + V(0, 0, -0.01)))
    patas[nome], tampas[nome] = unico(pt), unico(tampa)
for f in furos_pata:
    ped = ped.cut(f)
ped = unico(ped)

# ================================================================ balança
Y_FIX0 = Y_VAS + CEL_C_MAX / 2
FIX_Y0, FIX_Y1 = Y_FIX0 - FIXO_COMPR, Y_FIX0
RFIX = (Y_FIX0 - 24.0, Y_FIX0 - 3.0)
LIV_Y0, LIV_Y1 = Y_FIX0 - CEL_C_MAX + 2.0, Y_FIX0 - CEL_C_MIN + 24.0
RLIV = (LIV_Y0 + 1.5, LIV_Y1 - 1.5)

base = Part.makeCylinder(BASE_R, PISO_BAL, V(0, Y_VAS, 0))
base = base.fuse(Part.makeBox(16, FIX_Y1 - FIX_Y0, BOSS_H, V(-8, FIX_Y0, PISO_BAL)))
base = base.cut(rasgo(RFIX[0], RFIX[1], RASGO_L, -1, 30))
base = base.cut(rasgo(RFIX[0] - 2.5, RFIX[1] + 2.5, 10.0, -0.01, 3.0))
for ang in (30, 150, 270):
    bx, by = 50 * math.cos(math.radians(ang)), Y_VAS + 50 * math.sin(math.radians(ang))
    h_post = (Z_PLAT_FUNDO - 3.0) - PISO_BAL
    base = base.fuse(Part.makeCylinder(6.0, h_post, V(bx, by, PISO_BAL)))
    base = base.cut(Part.makeCylinder(1.4, h_post, V(bx, by, PISO_BAL + 2)))
y_braco0 = Y_VAS + BASE_R - 6
braco = Part.makeBox(30, -PED_R - y_braco0 + 1, PISO_BAL, V(-15, y_braco0, 0))
braco = braco.fuse(Part.makeBox(30, 4, 30, V(-15, -PED_R - 4 + 1.2, 0)))
braco = braco.cut(Part.makeCylinder(PED_R + 0.1, 40, V(0, 0, -1)))
for sx in (-1, 1):
    braco = braco.cut(Part.makeCylinder(1.7, 10, V(sx * 12, -PED_R - 6, 20), V(0, 1, 0)))
braco = braco.cut(Part.makeBox(8, 8, 3, V(-4, -PED_R - 7, PISO_BAL - 3)))
base = base.fuse(braco)
for az in (0, 120, 240):
    base = base.cut(Part.makeCylinder(6, 1.5, dir_az(az + 90) * 45 + V(0, Y_VAS, -0.01)))
base = unico(base)

plat = Part.makeCylinder(PLAT_R, PLAT_T, V(0, Y_VAS, Z_PLAT_FUNDO))
plat = plat.fuse(anel(PLAT_R - SAIA_E, PLAT_R, SAIA_Z0, Z_PLAT_FUNDO - SAIA_Z0, (0, Y_VAS)))
entalhe = Part.makeCylinder(PLAT_R + 1, 10 - SAIA_Z0 + 0.01, V(0, Y_VAS, SAIA_Z0 - 0.01), V(0, 0, 1), 34)
entalhe.rotate(V(0, Y_VAS, 0), V(0, 0, 1), 90 - 17)
plat = plat.cut(entalhe)
for d_ in (100, 110, 120):
    plat = plat.cut(anel(d_ / 2 - 0.4, d_ / 2 + 0.4, STACK - 0.6, 0.61, (0, Y_VAS)))
espac = Part.makeBox(16, LIV_Y1 - LIV_Y0, BOSS_H, V(-8, LIV_Y0, Z_PLAT_FUNDO - BOSS_H))
furo = rasgo(RLIV[0], RLIV[1], RASGO_L, Z_PLAT_FUNDO - BOSS_H - 1, 40)
plat = plat.cut(furo).cut(rasgo(RLIV[0] - 2.5, RLIV[1] + 2.5, 10.0, STACK - 3.0, 3.01))
espac = espac.cut(furo)
plat, espac = unico(plat), unico(espac)

# ================================================================ referências (componentes comprados)
tubo = anel(TUBO_RI, TUBO_RE, Z_TB, TUBO_L).cut(janela)
furos_tubo = [("cartucho (piso)", az, Z_F - T_PISO - H_SAIA / 2) for az in (30, 90, 150)]
furos_tubo += [("moldura da bica", math.degrees(math.atan2(-TUBO_RE, sx * 15)) % 360, Z_F + 3.0) for sx in (-1, 1)]
furos_tubo += [("pedestal", az, Z_TB + SOQ_PROF / 2) for az in (0, 180)]
for _, az, z in furos_tubo:
    tubo = tubo.cut(radial(az, TUBO_RI - 1, 5, z, 1.75))                                    # Ø3,5 no PVC (folga p/ M3)
cap_sup = Part.makeCylinder(CAP_D_EXT / 2, CAP_H, V(0, 0, Z_TOPO_TUBO + CAP_FUNDO - CAP_H)).cut(
    Part.makeCylinder(TUBO_RE, CAP_H - CAP_FUNDO, V(0, 0, Z_TOPO_TUBO + CAP_FUNDO - CAP_H)))
servo = caixa(SV_C, SV_L, SV_H, (SV_CX, 0), Z_SV0)
servo = servo.fuse(caixa(SV_ABA_C, SV_L, SV_ABA_T, (SV_CX, 0), Z_SV0 + SV_ABA_Z))
servo = servo.fuse(Part.makeCylinder(6.0, SV_TOPO_EIXO - SV_H - 3, V(0, 0, Z_SV0 + SV_H)))       # caixa de engrenagens
servo = servo.fuse(Part.makeCylinder(2.4, 3, V(0, 0, Z_SV0 + SV_TOPO_EIXO - 3)))                 # estriado
braco_sv = caixa(BRACO_SERVO[0], BRACO_SERVO[1], BRACO_SERVO[2], (0, 0), Z_BRACO_TOPO - BRACO_SERVO[2])
celula = Part.makeBox(CEL_L, CEL_C_MAX, CEL_A, V(-CEL_L / 2, Y_FIX0 - CEL_C_MAX, PISO_BAL + BOSS_H))
celula_curta = Part.makeBox(CEL_L, CEL_C_MIN, CEL_A, V(-CEL_L / 2, Y_FIX0 - CEL_C_MIN, PISO_BAL + BOSS_H))
vas = Part.makeCone(VAS_D_FUNDO / 2, VAS_D_MAX / 2, VAS_H_MAX, V(0, Y_VAS, STACK)).cut(
    Part.makeCone(VAS_D_FUNDO / 2 - 2, VAS_D_MAX / 2 - 2, VAS_H_MAX, V(0, Y_VAS, STACK + 2)))
pilhas = caixa(PILHAS[0], PILHAS[1], PILHAS[2], (0, 0), Z_PILHAS)
Z_PROTO0 = Z_TB + 2.5 + 3.0
proto = caixa(PROTO[0], PROTO[2], PROTO[1], (0, Y_ESP - PROTO[2] / 2), Z_PROTO0)
y_comp = Y_ESP - PROTO[2]                                     # face da protoboard (componentes para −Y)
hx711 = caixa(HX711[0], HX711[2] + 8, HX711[1], (14, y_comp - (HX711[2] + 8) / 2), Z_PROTO0 + 5)      # pé: perto dos fios da célula
buck = caixa(BUCK[0], BUCK[2] + 8, BUCK[1], (-14, y_comp - (BUCK[2] + 8) / 2), Z_PROTO0 + 5)
esp32 = caixa(ESP32[0], ESP32[2], ESP32[1], (0, y_comp - ESP32[2] / 2), Z_PROTO0 + 55)
eletronica = Part.makeCompound([proto, esp32, hx711, buck])

# ================================================================ verificações
erros = []


def checar(nome, ok, info=""):
    print(("OK   " if ok else "ERRO ") + nome + ("  " + info if info else ""))
    if not ok:
        erros.append(nome)


fixo = piso.fuse(anel_b)
pior_v, pior_d = 0.0, 1e9
for ang in range(0, 360, 10):
    g = rotor.copy()
    g.rotate(V(0, 0, 0), V(0, 0, 1), ang)
    pior_v = max(pior_v, g.common(fixo).Volume)
    pior_d = min(pior_d, g.distToShape(fixo)[0])
checar("rotor gira 360° sem tocar o cartucho", pior_v < 0.01 and pior_d >= 0.5, "folga mín %.2f mm" % pior_d)
pior_ch = 1e9
for ang in range(0, 360, 10):
    g = rotor.copy()
    g.rotate(V(0, 0, 0), V(0, 0, 1), ang)
    pior_ch = min(pior_ch, g.distToShape(chapeu)[0])
checar("rotor (dedos agitadores) gira sem tocar o chapéu", pior_ch >= 2.0, "folga mín %.1f mm" % pior_ch)
checar("chapéu apoia no escudo, pinos nos furos", chapeu.common(anel_b).Volume < 0.01 and chapeu.distToShape(anel_b)[0] < 0.01)
esp_esc = anel_b.common(setor(R_CUBO + 2, R_ANEL - 1, AZ_FRENTE - 10, AZ_FRENTE + 10, Z_ESC0 - 1, T_ESCUDO + 2)).BoundBox.ZLength
checar("escudo com a espessura de projeto (o chanfro do anel não o come)", abs(esp_esc - T_ESCUDO) < 0.05, "%.1f mm" % esp_esc)
apoio = chapeu.common(Part.makeBox(200, 200, 0.3, V(-100, -100, Z_ESC1))).Area
checar("chapéu assenta de face no escudo (não nas pontas dos pinos)", chapeu.BoundBox.ZMin < Z_ESC1 - PINO_CH_H + 0.01 and
       chapeu.distToShape(anel_b)[0] < 0.01 and anel_b.BoundBox.ZMax <= Z_ESC1 + 0.01)
checar("chapéu dentro do tubo", chapeu.common(tubo).Volume < 0.01, "%.2f mm³" % chapeu.common(tubo).Volume)
checar("aresta do chapéu deixa passar grão de 22 mm", Z_AR - Z_HUB1 >= 25, "%.0f mm acima do rotor" % (Z_AR - Z_HUB1))
checar("telhado inclinado o bastante para a ração escorregar", ALFA_CH >= 50, "%.0f°" % ALFA_CH)
checar("servo encaixa sob o piso (sem interferência)", servo.common(piso).Volume < 0.5,
       "%.2f mm³" % servo.common(piso).Volume)
checar("topo do servo/braço não toca o rotor parado", servo.common(rotor).Volume < 0.5 and braco_sv.common(rotor).Volume < 0.5)
for nome, s in [("bica", bica), ("bandeja", bandeja), ("eletrônica", eletronica)]:
    d = servo.distToShape(s)[0]
    checar("servo livre da %s" % nome, d >= 1.5, "%.1f mm" % d)
for nome, s in [("piso", piso), ("anel/escudo", anel_b), ("tubo (com janela)", tubo)]:
    v = bica.common(s).Volume
    checar("bica × %s sem interferência" % nome, v < 0.5, "%.2f mm³" % v)
checar("cartucho × tubo sem interferência", fixo.common(tubo).Volume < 0.5)
checar("pinos do anel entram no piso", anel_b.common(piso).Volume < 0.01)
for nome, s in [("bica", bica), ("tubo", tubo), ("piso do cartucho", piso)]:
    d = eletronica.distToShape(s)[0]
    checar("protoboard/ESP32/módulos livres de %s" % nome, d >= 2, "%.1f mm" % d)
checar("protoboard cabe na espinha", proto.BoundBox.ZMax <= bandeja.BoundBox.ZMax + 0.01)
checar("pilhas cabem no pedestal", pilhas.common(ped).Volume < 0.5)
checar("pilhas cabem na gaveta", pilhas.common(gav).Volume < 0.5, "%.1f mm³" % pilhas.common(gav).Volume)

pior_gav = 1e9
for dx in (0, 20, 40, 60, 80, 100):
    g = gav.copy()
    g.translate(V(-dx, 0, 0))
    pior_gav = min(pior_gav, g.distToShape(ped)[0] if g.common(ped).Volume < 0.01 else -1)
checar("gaveta sai inteira pelo lado sem raspar", pior_gav >= min(GAV_FOLGA, ABA_GAV_FOLGA) - 0.05, "folga %.2f mm" % pior_gav)
checar("pilhas passam sob a ponte do pedestal mesmo se ceder 1 mm", PED_CAV_Z1 - pilhas.BoundBox.ZMax >= 1.4,
       "%.1f mm" % (PED_CAV_Z1 - pilhas.BoundBox.ZMax))
pele = min(PED_R - (R_REB + ABA_GAV_FOLGA + IMA_REC + IMA_H + 0.3), 9e9)
checar("ímãs da gaveta escondidos (pele por fora da aba)", pele >= 0.8, "%.1f mm" % pele)
checar("ímãs alojados sem tocar plástico", all(Part.makeCompound(imas).common(x).Volume < 0.01 for x in (ped, gav)))
gap_imas = imas[0].distToShape(imas[1])[0]
checar("ímãs da gaveta frente a frente", gap_imas <= 1.3, "%.1f mm entre ímãs" % gap_imas)
checar("gaveta livre do tubo e da bandeja", gav.common(tubo).Volume < 0.01 and gav.common(bandeja).Volume < 0.01)
todas_patas = Part.makeCompound(list(patas.values()) + list(tampas.values()))
checar("patas sem interferência com pedestal, base e braço", todas_patas.common(ped).Volume < 0.01 and
       todas_patas.common(base).Volume < 0.01, "%.2f mm³" % todas_patas.common(ped).Volume)
d_pl = todas_patas.distToShape(plat.fuse([vas, espac]))[0]
checar("patas longe da plataforma e da vasilha (que flutuam)", d_pl >= 2.5, "%.1f mm" % d_pl)
pior_pg = Part.makeCompound([gav.translated(V(-dx, 0, 0)) for dx in (0, 40, 80, 120)]).distToShape(todas_patas)[0]
checar("gaveta abre por cima/entre as patas sem raspar", pior_pg >= 2.0, "%.1f mm" % pior_pg)
acesso_jack = Part.makeBox(24, 40, 22, V(-12, PED_R + 0.5, 0))
checar("plugue do jack alcançável (sem pata atrás)", acesso_jack.common(todas_patas).Volume < 0.01)
painel = Part.makeBox(25, 2 * 28, 22, V(PED_R + 0.5, -28, 0))
checar("painel (chave, botão, LED) livre das patas", painel.common(todas_patas).Volume < 0.01)
pior_furo = min(Part.makeCylinder(3.0, 12.0, p0, dd).cut(Part.makeCylinder(1.3, 12.0, p0, dd)).common(ped).Volume /
                Part.makeCylinder(3.0, 12.0, p0, dd).cut(Part.makeCylinder(1.3, 12.0, p0, dd)).Volume for p0, dd in furos_info)
checar("parafusos das patas rosqueiam em plástico maciço do pedestal", pior_furo >= 0.95, "%.0f %% de material em volta" % (100 * pior_furo))
for nome, pt in patas.items():
    lados = sorted([pt.BoundBox.XLength, pt.BoundBox.YLength, pt.BoundBox.ZLength])
    checar("pata %s cabe numa impressora 220×220×250" % nome, lados[2] <= 220, "%.0f×%.0f×%.0f" % tuple(lados))
# tombamento: polígono de apoio (patas + base da balança) × centro de massa
pts2 = []
for sh in list(patas.values()) + [base, ped]:
    for v in sh.Vertexes:
        if v.Point.z < 0.5:
            pts2.append((v.Point.x, v.Point.y))
    for e in sh.Edges:
        if e.BoundBox.ZMax < 0.5:
            for q in e.discretize(12):
                pts2.append((q.x, q.y))


def casco(pts):
    pts = sorted(set((round(a, 2), round(b, 2)) for a, b in pts))
    def cruz(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    inf, sup = [], []
    for q in pts:
        while len(inf) >= 2 and cruz(inf[-2], inf[-1], q) <= 0:
            inf.pop()
        inf.append(q)
    for q in reversed(pts):
        while len(sup) >= 2 and cruz(sup[-2], sup[-1], q) <= 0:
            sup.pop()
        sup.append(q)
    return inf[:-1] + sup[:-1]


hull = casco(pts2)
d_borda = min(abs((b[0] - a[0]) * a[1] - (b[1] - a[1]) * a[0]) / math.hypot(b[0] - a[0], b[1] - a[1])
              for a, b in zip(hull, hull[1:] + hull[:1]))
m_racao = (math.pi * TUBO_RI ** 2 * (Z_TOPO_TUBO - Z_ESC1) - chapeu.Volume) / 1e6 * FATOR_ENCHIMENTO * RHO_RACAO_MIN
massas = dict(MASSAS_KG, **{"ração (cheio, leve)": m_racao})
z_m = {"tubo PVC": (Z_TB + Z_TOPO_TUBO) / 2, "peças impressas": 120.0, "eletrônica + servo": 150.0, "pilhas + suporte": 10.0,
       "vasilha": 60.0, "lastro": 7.0, "ração (cheio, leve)": (Z_ESC1 + Z_TOPO_TUBO) / 2}
M = sum(massas.values())
z_cg = sum(massas[k] * z_m[k] for k in massas) / M
f_tomba = M * 9.81 * d_borda / Z_TOPO_TUBO
d_antes = PED_R
f_antes = (M - MASSAS_KG["lastro"]) * 9.81 * d_antes / Z_TOPO_TUBO
checar("estável: empurrão no topo para tombar ≥ 2× o de antes das patas", f_tomba >= 2 * f_antes - 0.05,
       "%.1f N (antes %.1f N); apoio a %.0f mm do eixo; tomba inclinando %.0f°" % (
           f_tomba, f_antes, d_borda, math.degrees(math.atan2(d_borda, z_cg))))
flut = plat.fuse([vas, espac])
for nome, s in [("pedestal", ped), ("base/braço", base), ("tubo", tubo), ("bica", bica)]:
    d = flut.distToShape(s)[0]
    checar("plataforma+vasilha livres de %s" % nome, d >= 3.0 - 1e-6, "%.1f mm" % d)
for nome_c, c in (("80 mm", celula), ("75 mm", celula_curta)):
    cb = c.BoundBox
    checar("espaçador apoia na célula de %s" % nome_c, espac.distToShape(c)[0] < 0.01)
    meio = Part.makeBox(CEL_L, 1, CEL_A, V(-CEL_L / 2, (cb.YMin + cb.YMax) / 2 - 0.5, cb.ZMin))
    dm = min(espac.distToShape(meio)[0], base.distToShape(meio)[0])
    checar("meio da célula de %s livre" % nome_c, dm > 5, "%.1f mm" % dm)
z_saida = bica.BoundBox.ZMin
checar("bica acima da borda da vasilha mais alta", z_saida - BORDA_MAX >= FOLGA_BICO - 0.01, "%.1f mm" % (z_saida - BORDA_MAX))
invade = (Y_VAS + VAS_D_MIN / 2 - 2) - Y_SAIDA
checar("bica dentro da vasilha mais estreita ≥ 15 mm", invade >= 15, "%.1f mm" % invade)
for nome, s in [("pedestal", ped), ("base da balança", base), ("plataforma", plat), ("bandeja", bandeja), ("bica", bica),
                ("chapéu", chapeu), ("gaveta", gav)]:
    lados = sorted([s.BoundBox.XLength, s.BoundBox.YLength, s.BoundBox.ZLength])
    checar("%s cabe numa impressora 220×220×250" % nome, lados[1] <= 220 and lados[2] <= 250, "%.0f×%.0f×%.0f" % tuple(lados))

r_meio = (R_CUBO + R_PA_OUT) / 2
vol_bolso = (math.pi * (R_PA_OUT ** 2 - R_CUBO ** 2) / N_BOLSOS) * H_ROTOR / 1000
litros = (math.pi * TUBO_RI ** 2 * (Z_TOPO_TUBO - Z_ESC1) - chapeu.Volume) / 1e6
cap_min = litros * FATOR_ENCHIMENTO * RHO_RACAO_MIN
checar("tubo cheio leva ≥ %.1f kg mesmo com ração leve (%.2f kg/L)" % (CAP_MIN_KG, RHO_RACAO_MIN), cap_min >= CAP_MIN_KG,
       "%.2f kg" % cap_min)
print("\nResumo")
print("  piso do dosador Z=%.0f; bica sai em Y=%.0f, Z=%.1f; servo de Z=%.1f a %.1f" % (Z_F, Y_SAIDA, z_saida, Z_SV0, Z_SV0 + SV_TOPO_EIXO))
print("  bolso: %.0f mL (≈ %.0f g), boca %.0f mm no meio, %.0f mm de profundidade" % (
    vol_bolso, vol_bolso * 0.5, 2 * math.pi * r_meio / N_BOLSOS, R_PA_OUT - R_CUBO))
print("  reservatório: %.2f L úteis → %.2f kg (ração leve 0,45 kg/L) a %.2f kg (0,6 kg/L)" % (
    litros, cap_min, litros * FATOR_ENCHIMENTO * 0.6))
vol_l = VOL_LASTRO / 1000
print("  patas: bolsos de lastro somam %.0f mL → %.0f g de areia ou ~%.0f g de porcas/arruelas de aço" % (vol_l, vol_l * 1.5, vol_l * 4.0))
print("  chapéu: aresta Z=%.0f (%.0f mm acima do rotor), topo Z=%.0f, %.0f cm³ de peça" % (
    Z_AR, Z_AR - Z_HUB1, chapeu.BoundBox.ZMax, chapeu.Volume / 1000))
print("  protoboard de Z=%.0f a %.0f (espinha)" % (proto.BoundBox.ZMin, proto.BoundBox.ZMax))
print("  altura total ≈ %.0f mm; pegada %.0f × %.0f mm" % (Z_TOPO_TUBO + CAP_FUNDO, 2 * PED_R, PED_R - (Y_VAS - PLAT_R)))

# ================================================================ salvar
doc = App.newDocument("IoT3D_v3")
objs = [
    ("P01_piso_dosador", piso), ("P02_anel_escudo", anel_b), ("P03_rotor", rotor),
    ("P04_bica", bica), ("P05_bandeja_espinha", bandeja), ("P06_pedestal", ped),
    ("P07_base_balanca", base), ("P08_plataforma", plat), ("P09_espacador", espac), ("P10_chapeu", chapeu), ("P11_gaveta_pilhas", gav),
    ("P12_pata_TD", patas["TD"]), ("P12_pata_TE", patas["TE"]), ("P12_pata_FE", patas["FE"]), ("P12_pata_FD", patas["FD"]),
    ("P13_tampa_TD", tampas["TD"]), ("P13_tampa_TE", tampas["TE"]), ("P13_tampa_FE", tampas["FE"]), ("P13_tampa_FD", tampas["FD"]),
    ("REF_tubo_PVC_DN100", tubo), ("REF_cap_superior", cap_sup), ("REF_servo_MG90S_360", servo),
    ("REF_braco_servo", braco_sv), ("REF_celula_5kg", celula), ("REF_vasilha_maior", vas),
    ("REF_pilhas_6AA", pilhas), ("REF_imas_6x2_gaveta", Part.makeCompound(imas)), ("REF_protoboard_ESP32_modulos", eletronica),
]
for nome, s in objs:
    o = doc.addObject("Part::Feature", nome)
    o.Shape = s
doc.recompute()
doc.saveAs(DST)
with open(os.path.join(ROOT, "cad", "furos_tubo_v3.txt"), "w") as f:
    f.write("# nome;azimute_graus (0=direita, 90=trás, 180=esquerda, 270=frente);altura desde o fundo do tubo (mm)\n")
    for nome, az, z in furos_tubo:
        f.write("%s;%.1f;%.1f\n" % (nome, az, z - Z_TB))
    f.write("janela da bica;270 (frente);de %.1f a %.1f;largura %.1f\n" % (
        z_jan_bot - Z_TB, z_jan_top - Z_TB, BICA_W + 2 * PAREDE_BICA + 0.6))
print("salvo", DST)
if erros:
    print("\nATENÇÃO: %d verificação(ões) falharam" % len(erros))
