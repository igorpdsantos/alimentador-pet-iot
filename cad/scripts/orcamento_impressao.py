# Estima filamento (g), tempo e custo de cada peça "Pxx_*" do modelo.
# Modelo de cálculo: casca (perímetros + topo/fundo ≈ 1,2 mm sobre toda a superfície) + preenchimento no miolo.
# Rodar: cad/scripts/fc.sh "cad/scripts/orcamento_impressao.py" [DOC=...]
import os
import FreeCAD as App

DOC = os.environ.get("DOC", os.path.join(os.getcwd(), "cad", "IoT3D_v3.FCStd"))
DENS = 1.27                  # g/cm³ (PETG)
PRECO_KG = 100.0             # R$/kg PETG (marca nacional, 2026 — ajuste)
CASCA = 1.2                  # mm
VEL = {"rápida (Creality K1 / Ender-3 V3 / Bambu A1)": 18.0, "comum (Ender-3 clássica)": 9.0}  # g/h em PETG
INFILL = {"P03": 0.40, "P09": 0.40}   # peças que trabalham mais
INFILL_PADRAO = 0.20
QTD = {}

doc = App.openDocument(DOC)
linhas, tot_g = [], 0.0
for o in sorted((o for o in doc.Objects if o.Label.startswith("P")), key=lambda o: o.Label):
    s = o.Shape
    v = s.Volume / 1000.0
    casca = min(v, s.Area * CASCA / 1000.0)
    inf = INFILL.get(o.Label[:3], INFILL_PADRAO)
    g = (casca + inf * (v - casca)) * DENS * QTD.get(o.Label[:3], 1)
    tot_g += g
    linhas.append((o.Label, g, inf))
print("| Peça | Filamento (g) | Preench. | Tempo rápida | Tempo comum | Custo |")
print("|---|---|---|---|---|---|")
for nome, g, inf in linhas:
    t = ["%.1f h" % (g / r + 0.15) for r in VEL.values()]
    print("| %s | %.0f | %d %% | %s | %s | R$ %.2f |" % (nome, g, inf * 100, t[0], t[1], g / 1000 * PRECO_KG))
tr = sum(g / list(VEL.values())[0] + 0.15 for _, g, _ in linhas)
tc = sum(g / list(VEL.values())[1] + 0.15 for _, g, _ in linhas)
print("| **Total** | **%.0f g** | | **%.0f h** | **%.0f h** | **R$ %.2f** |" % (tot_g, tr, tc, tot_g / 1000 * PRECO_KG))
print("\n+15 %% de perdas (purga, falhas, saia): %.0f g ≈ R$ %.2f" % (tot_g * 1.15, tot_g * 1.15 / 1000 * PRECO_KG))
