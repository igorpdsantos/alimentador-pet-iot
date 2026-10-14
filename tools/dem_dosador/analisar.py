# Junta os resultados do DEM e gera tabela + gráficos.
#   /Applications/FreeCAD.app/Contents/Resources/bin/python analisar.py [pasta_saida]
# (usa o Python do FreeCAD porque ele já tem matplotlib)
import glob
import json
import os
import sys
from collections import defaultdict

import numpy as np

KGFCM = 0.0980665
STALL = 1.8            # kgf·cm, MG90S 360° travado (catálogo, 4,8 V)
OUT = sys.argv[1] if len(sys.argv) > 1 else "resultados"
NOMES = {
    "nenhum": "sem chapéu", "cone60": "cone Ø60", "cone50": "cone Ø50", "telhado": "telhado (aresta +5)",
    "telhado_y15": "telhado (aresta +15)", "telhado_y-10": "telhado (aresta −10)",
    "telhado_z45": "telhado baixo (11 mm)", "telhado_z75": "telhado alto (40 mm)",
    "chapeu_h25": "bloco reto, aresta 25 mm", "chapeu_h40": "bloco reto, aresta 40 mm",
    "cumeeira_h40": "P10 final: cumeeira 45°, aresta 40 mm",
    "chapeu_h40_y15": "P10 aresta a 40 mm, +15",
}
ORDEM = list(NOMES)


def carregar():
    grupos = defaultdict(list)
    for f in sorted(glob.glob("resultados/*_s*.json")):
        r = json.load(open(f))
        s = np.array(r["serie"])
        t, th = s[:, 0], s[:, 1]
        tq_med = s[:, 2] / KGFCM            # torque médio do servo em cada janela de ~4 ms
        tq_pico = s[:, 3] / KGFCM           # pico do servo na janela
        n0 = int(len(s) * 0.1)
        voltas = (th[-1] - th[0]) / (2 * np.pi)
        r["mediana"] = float(np.median(tq_med[n0:]))
        r["p90"] = float(np.percentile(tq_med[n0:], 90))
        r["frac_trava"] = float((tq_pico[n0:] > STALL).mean())
        r["gpv"] = float(s[-1, 5] / voltas)
        r["carga_rotor_N"] = -(r["fz_N"]["rotor"] + r["fz_N"]["piso"] + r["fz_N"]["escudo"])
        r["carga_chapeu_N"] = -r["fz_N"]["chapeu"]
        r["tq_med"] = tq_med
        r["t"] = t
        grupos[(r["chapeu"], r["d_mm"])].append(r)
    return grupos


def main():
    g = carregar()
    linhas = []
    resumo = {}
    for d in (6.0, 10.0, 20.0):
        for ch in ORDEM:
            rs = g.get((ch, d))
            if not rs:
                continue
            m = lambda k: float(np.mean([r[k] for r in rs]))
            lo = lambda k: float(np.min([r[k] for r in rs]))
            hi = lambda k: float(np.max([r[k] for r in rs]))
            item = {
                "n": len(rs), "massa_g": m("massa_g"), "peso_N": m("peso_N"), "carga_rotor_N": m("carga_rotor_N"),
                "carga_chapeu_N": m("carga_chapeu_N"), "mediana": m("mediana"), "mediana_min": lo("mediana"),
                "mediana_max": hi("mediana"), "p90": m("p90"), "frac_trava": m("frac_trava"), "gpv": m("gpv"),
                "gpv_min": lo("gpv"), "gpv_max": hi("gpv"),
            }
            resumo["%s_d%.0f" % (ch, d)] = item
            linhas.append("| %.0f | %s | %d | %.0f | %.1f (%.0f %%) | %.1f | %.2f (%.2f–%.2f) | %.2f | %.0f %% | %.1f (%.1f–%.1f) |" % (
                d, NOMES[ch], item["n"], item["massa_g"], item["carga_rotor_N"],
                100 * item["carga_rotor_N"] / item["peso_N"], item["carga_chapeu_N"], item["mediana"],
                item["mediana_min"], item["mediana_max"], item["p90"], 100 * item["frac_trava"], item["gpv"],
                item["gpv_min"], item["gpv_max"]))
    cab = ("| grão (mm) | variante | rodadas | ração (g) | carga no rotor/piso/escudo N (% do peso) | carga no chapéu N | "
           "torque mediano kgf·cm (faixa) | torque p90 | tempo acima de 1,8 kgf·cm | g/volta (faixa) |\n"
           "|---|---|---|---|---|---|---|---|---|---|")
    tabela = cab + "\n" + "\n".join(linhas)
    print(tabela)
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "tabela_dem.md"), "w") as f:
        f.write(tabela + "\n")
    with open(os.path.join(OUT, "resumo_dem.json"), "w") as f:
        json.dump(resumo, f, indent=1)

    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return
    plt.rcParams.update({"font.size": 9, "axes.spines.top": False, "axes.spines.right": False})
    cores = {6.0: "#5b8def", 10.0: "#2ca58d", 20.0: "#e07a5f"}
    fig, axs = plt.subplots(1, 3, figsize=(13, 4.2))
    variantes = [c for c in ORDEM if any((c, d) in g for d in (6.0, 10.0, 20.0))]
    x = np.arange(len(variantes))
    w = 0.27
    for k, d in enumerate((6.0, 10.0, 20.0)):
        med, err_lo, err_hi, fr, gp = [], [], [], [], []
        for c in variantes:
            it = resumo.get("%s_d%.0f" % (c, d))
            if it:
                med.append(it["mediana"])
                err_lo.append(it["mediana"] - it["mediana_min"])
                err_hi.append(it["mediana_max"] - it["mediana"])
                fr.append(100 * it["frac_trava"])
                gp.append(it["gpv"])
            else:
                med.append(np.nan); err_lo.append(0); err_hi.append(0); fr.append(np.nan); gp.append(np.nan)
        xx = x + (k - 1) * w
        axs[0].bar(xx, med, w, yerr=[err_lo, err_hi], color=cores[d], label="grão %.0f mm" % d, capsize=2)
        axs[1].bar(xx, fr, w, color=cores[d])
        axs[2].bar(xx, gp, w, color=cores[d])
    axs[0].axhline(STALL, color="k", lw=0.8, ls="--")
    axs[0].text(len(variantes) - 0.5, STALL * 1.03, "servo trava (1,8)", ha="right", fontsize=8)
    axs[0].set_title("Torque mediano no rotor (kgf·cm)")
    axs[1].set_title("Tempo com pico acima de 1,8 kgf·cm (%)")
    axs[2].set_title("Ração que sai por volta (g)")
    for a in axs:
        a.set_xticks(x)
        a.set_xticklabels([NOMES[c] for c in variantes], rotation=35, ha="right")
    axs[0].legend(frameon=False)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "dem_comparacao.png"), dpi=150)

    fig, ax = plt.subplots(figsize=(8, 3.2))
    for c, cor in (("nenhum", "#888"), ("telhado", "#e07a5f")):
        rs = g.get((c, 10.0))
        if rs:
            r = rs[0]
            k = 25
            y = np.convolve(r["tq_med"], np.ones(k) / k, mode="same")
            ax.plot(r["t"] - r["t"][0], y, color=cor, lw=1, label=NOMES[c])
    ax.axhline(STALL, color="k", lw=0.8, ls="--")
    ax.set_xlabel("tempo girando a 60 rpm (s)")
    ax.set_ylabel("torque (kgf·cm, média 0,1 s)")
    ax.set_title("Grão de 10 mm, tubo cheio")
    ax.legend(frameon=False)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "dem_serie_10mm.png"), dpi=150)


if __name__ == "__main__":
    main()
