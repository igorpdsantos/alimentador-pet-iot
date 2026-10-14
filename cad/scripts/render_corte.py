# Corte 2D do conjunto (padrão v3; DOC=... para outro arquivo) num plano (padrão: Y=0 visto de frente; PLANO=X para corte em X=0).
# Rodar: cad/scripts/fc.sh "cad/scripts/render_corte.py" [PLANO=X] [OUT=...]
import os
import FreeCAD as App
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

doc = App.openDocument(os.environ.get("DOC", os.path.join(os.getcwd(), "cad", "IoT3D_v3.FCStd")))
plano = os.environ.get("PLANO", "Y")
out = os.environ.get("OUT", os.path.join("cad", "renders", "v3", "corte_%s0.png" % plano))
os.makedirs(os.path.dirname(out), exist_ok=True)
normal = App.Vector(0, 1, 0) if plano == "Y" else App.Vector(1, 0, 0)
cores = ["tab:red", "tab:blue", "tab:green", "tab:orange", "tab:purple", "tab:cyan", "tab:olive",
         "tab:brown", "tab:pink", "gray", "black", "goldenrod", "teal", "navy", "maroon", "lime", "indigo"]
fig, ax = plt.subplots(figsize=(10, 14))
for i, o in enumerate(doc.Objects):
    cor = "lightgray" if o.Label.startswith("REF_") else cores[i % len(cores)]
    primeiro = True
    for w in o.Shape.slice(normal, 0.0):
        pts = w.discretize(400)
        xs = [p.x if plano == "Y" else p.y for p in pts]
        ax.fill(xs, [p.z for p in pts], color=cor, alpha=0.85, label=o.Label if primeiro else None)
        primeiro = False
ax.set_aspect("equal"); ax.grid(True, alpha=0.3)
ax.set_xlabel("X" if plano == "Y" else "Y"); ax.set_ylabel("Z")
ax.legend(fontsize=7, loc="upper right")
fig.savefig(out, dpi=80, bbox_inches="tight")
print("salvo", out)
