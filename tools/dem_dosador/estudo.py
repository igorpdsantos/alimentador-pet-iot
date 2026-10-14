# Roda um caso do estudo do chapéu: enche o tubo, deixa assentar, mede cargas e gira o rotor.
#   python3 estudo.py --d 10 --chapeu nenhum --rpm 60 --voltas 3
# Saída: resultados/<chapeu>_d<d>_<rpm>rpm.json
import argparse
import json
import math
import os
import time

import numpy as np

import dem

Z_REF = dem.Z_ESC1 + 25.0    # aresta de baixo dos chapéus: 25 mm acima do escudo (≈ 30 mm acima do rotor)

CHAPEUS = {
    "nenhum": [0],
    # cone central Ø60, 55°, 3 hastes Ø4 até a parede
    "cone60": [1, 30.0, 55.0, Z_REF, 2.0, 3],
    "cone50": [1, 25.0, 55.0, Z_REF, 2.0, 3],
    # telhado inclinado sobre a frente (lado do escudo), aresta além do centro, cai para trás
    "telhado": [2, 55.0, 5.0, Z_REF, 2.5],
    "telhado_y15": [2, 55.0, 15.0, Z_REF, 2.5],
    "telhado_y-10": [2, 55.0, -10.0, Z_REF, 2.5],
    "telhado_z45": [2, 55.0, 5.0, dem.Z_ESC1 + 11.0, 2.5],
    "telhado_z75": [2, 55.0, 5.0, dem.Z_ESC1 + 40.0, 2.5],
    # proposta final: telhado de 3 mm + bloco fechado sobre o escudo (±40°)
    "chapeu_h25": [3, 55.0, 5.0, dem.Z_ESC1 + 25.0, 3.0, 40.0, 90.0],
    "chapeu_h40": [3, 55.0, 5.0, dem.Z_ESC1 + 40.0, 3.0, 40.0, 90.0],
    "chapeu_h40_y15": [3, 55.0, 15.0, dem.Z_ESC1 + 40.0, 3.0, 40.0, 90.0],
    # versão final: cumeeira com laterais a 45° (grão empurrado pelo chanfro do escudo sobe e escorrega)
    "cumeeira_h40": [3, 55.0, 5.0, dem.Z_ESC1 + 40.0, 3.0, 40.0, 45.0],
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--d", type=float, default=10.0)
    ap.add_argument("--chapeu", default="nenhum")
    ap.add_argument("--rpm", type=float, default=60.0)
    ap.add_argument("--voltas", type=float, default=3.0)
    ap.add_argument("--esvaziar", action="store_true", help="gira até esvaziar (ou --voltas)")
    ap.add_argument("--mu_pp", type=float, default=0.5)
    ap.add_argument("--mu_pw", type=float, default=0.35)
    ap.add_argument("--mu_r", type=float, default=0.10)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--t_pa", type=float, default=2.4, help="espessura das pás (mm)")
    ap.add_argument("--tag", default="")
    a = ap.parse_args()

    t0 = time.time()
    c = dem.Caso(a.d, CHAPEUS[a.chapeu], mu_pp=a.mu_pp, mu_pw=a.mu_pw, mu_r=a.mu_r, seed=a.seed, t_pa=a.t_pa)
    print("%s d=%.0f mm: %d grãos, dt=%.2e s, volume livre %.0f mL" % (a.chapeu, a.d, c.N, c.dt, c.vol_livre_mL),
          flush=True)
    bloco = max(1, int(0.01 / c.dt))   # ~10 ms

    # 1) enchimento: despeja camadas pelo topo do tubo até acabar a reserva, depois assenta
    while c.despejar():
        c.passo(bloco)
    for k in range(300):
        c.passo(bloco)
        if k > 20 and c.energia_cinetica() < 2e-5 * c.massa_ativa():
            break
    aparados = c.aparar()
    for k in range(100):
        c.passo(bloco)
        if k > 10 and c.energia_cinetica() < 2e-5 * c.massa_ativa():
            break
    # cargas estáticas (média de 50 ms)
    soma = np.zeros(dem.NB)
    for k in range(5):
        r = c.passo(bloco)
        soma += r[5]
    fz = soma / 5
    peso = c.massa_ativa() * 9.81
    n_ativos = int(c.act.sum())
    zt = (c.pos[c.act == 1, 2] + c.rad[c.act == 1]).max() * 1000
    print("  assentado em %.2f s (aparados %d): %.0f g, topo %.0f mm; Fz tubo %.2f piso %.2f escudo %.2f rotor %.2f chapéu %.2f N (peso %.2f N)"
          % (c.t, aparados, c.massa_ativa() * 1000, zt, *fz, peso), flush=True)
    # torque estático: o que o servo precisa para começar (estimado pelo pico nos primeiros 30 ms)
    w = 2 * math.pi * a.rpm / 60.0
    serie = []
    t_rot = a.voltas * 2 * math.pi / w
    nblocos = int(t_rot / (bloco * c.dt))
    massa0 = c.saiu
    c.th = 0.0
    sub = max(1, bloco // 5)        # ~2 ms
    hist_esv = []
    if a.esvaziar:
        nblocos = int(60 * 2 * math.pi / w / (bloco * c.dt))      # até 60 voltas
    for k in range(nblocos * 5):
        r = c.passo(sub, w_rot=w)
        serie.append((c.t, c.th, -r[1], -r[3], -r[2], (c.saiu - massa0) * 1000))
        if a.esvaziar and k % 50 == 49:
            # para quando, por 2 voltas seguidas, quase nada sai (o que sobrar é ração presa/parada)
            g_out = (c.saiu - massa0) * 1000
            vol = c.th / (2 * math.pi)
            hist_esv.append((vol, g_out))
            antes = [h for h in hist_esv if h[0] <= vol - 2.0]
            if c.act.sum() == 0 or (antes and g_out - antes[-1][1] < 1.0):
                break
    s = np.array(serie)
    tq = s[:, 2]
    n0 = int(len(tq) * 0.15)          # descarta o arranque para a média em regime
    res = {
        "chapeu": a.chapeu, "G": CHAPEUS[a.chapeu], "d_mm": a.d, "rpm": a.rpm, "mu_pp": a.mu_pp,
        "mu_pw": a.mu_pw, "mu_r": a.mu_r, "seed": a.seed, "t_pa": a.t_pa,
        "n_graos": n_ativos, "massa_g": c.massa_ativa() * 1000 + (c.saiu - massa0) * 1000,
        "massa_inicial_g": float(c.mass[c.act == 1].sum() * 1000 + (c.saiu - massa0) * 1000),
        "topo_mm": zt, "vol_livre_mL": c.vol_livre_mL,
        "fz_N": {"tubo": fz[0], "piso": fz[1], "escudo": fz[2], "rotor": fz[3], "chapeu": fz[4]}, "peso_N": peso,
        "torque_med_Nm": float(tq[n0:].mean()), "torque_p95_Nm": float(np.percentile(tq[n0:], 95)),
        "torque_p99_Nm": float(np.percentile(tq[n0:], 99)),
        "torque_arranque_Nm": float(s[:max(5, int(0.1 / (sub * c.dt))), 4].max()),
        "torque_max_Nm": float(s[:, 4].max()),
        "g_por_volta": float(s[-1, 5] / (s[-1, 1] / (2 * math.pi))),
        "serie": s[::2].round(6).tolist() if not a.esvaziar else s[::20].round(6).tolist(),
        "residuo_g": float(c.mass[c.act == 1].sum() * 1000),
        "residuo_pos_mm": (c.pos[c.act == 1] * 1000).round(1).tolist(),
        "tempo_cpu_s": time.time() - t0,
    }
    os.makedirs("resultados", exist_ok=True)
    nome = "resultados/%s_d%.0f_%.0frpm%s.json" % (a.chapeu, a.d, a.rpm, a.tag)
    with open(nome, "w") as f:
        json.dump(res, f)
    print("  torque médio %.3f N·m (%.2f kgf·cm), p95 %.2f, arranque %.2f kgf·cm; %.1f g/volta; cpu %.0f s"
          % (res["torque_med_Nm"], res["torque_med_Nm"] / 0.0981, res["torque_p95_Nm"] / 0.0981,
             res["torque_arranque_Nm"] / 0.0981, res["g_por_volta"], res["tempo_cpu_s"]), flush=True)


if __name__ == "__main__":
    main()
