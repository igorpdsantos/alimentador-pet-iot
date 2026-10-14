# Contas de mão do estudo do chapéu (conferem a ordem de grandeza da simulação DEM).
#   python3 analitico.py   → imprime as tabelas e grava resultados/analitico.json
# Hipóteses marcadas "estimativa": ração não foi medida (densidade, atrito); conferir na bancada.
import json
import math
import os

g = 9.81
# ---------------------------------------------------------------- ração (estimativa, literatura de pet food)
RHO_BULK = 550.0          # kg/m³ (0,45–0,6 kg/L)
PHI_INT = 30.0            # ângulo de atrito interno (graus)
MU_PAREDE = 0.35          # ração × PVC/PETG liso
K_JANSSEN = 1 - math.sin(math.radians(PHI_INT))   # Jaky ≈ 0,5; usar 0,4 a 0,5
# ---------------------------------------------------------------- geometria (mm → m)
D_TUBO = 0.098
H_COLUNA = 0.216          # do topo do escudo ao topo do tubo
R_CUBO, R_PA = 0.020, 0.044
ANG_ABERTO_SEM = 280.0    # 360 − escudo de 80°
# ---------------------------------------------------------------- servo MG90S 360° a 5 V (catálogo)
T_STALL_KGFCM = 1.8       # 4,8 V: 1,8; 6 V: 2,2 → ~1,9 a 5 V; usamos 1,8 (conservador)
RPM_VAZIO = 100.0         # 0,10 s/60° a 4,8 V
KGFCM = 0.0980665         # N·m
# ---------------------------------------------------------------- PETG impresso
E_PETG = 2.0e9
SIG_RUPT = 45e6           # tração no plano da camada (≈ 45–50 MPa)
SIG_FADIGA = 12e6         # ~25 % da ruptura para 10⁶ ciclos (conservador)


def janssen(h, D=D_TUBO, mu=MU_PAREDE, K=K_JANSSEN, rho=RHO_BULK):
    L = D / (4 * mu * K)
    return rho * g * L * (1 - math.exp(-h / L)), L


def torque_rotor(sigma_v, ang_aberto, phi=PHI_INT, mu_piso=MU_PAREDE, h_bolso=0.028, rho=RHO_BULK):
    # cisalhamento no plano do topo do rotor (só onde a coluna apoia) + atrito do grão no piso dentro dos bolsos
    tau_topo = sigma_v * math.tan(math.radians(phi))
    tau_piso = (sigma_v + rho * g * h_bolso) * mu_piso
    frac = ang_aberto / 360.0
    I = 2 * math.pi * (R_PA ** 3 - R_CUBO ** 3) / 3        # ∫ r dA no anel
    return frac * tau_topo * I + tau_piso * I * (frac + (1 - frac) * 0.3)


def tensao_pa(t_mm, h_mm=28.0, L_mm=25.0, r_ponta=R_PA):
    F = T_STALL_KGFCM * KGFCM / r_ponta                   # força na ponta com o servo travado
    I = h_mm * t_mm ** 3 / 12 * 1e-12
    Z = h_mm * t_mm ** 2 / 6 * 1e-9
    M = F * L_mm / 1000
    return F, M / Z, F * (L_mm / 1000) ** 3 / (3 * E_PETG * I)


def main():
    out = {}
    sig, L = janssen(H_COLUNA)
    sig_hid = RHO_BULK * g * H_COLUNA
    print("Janssen: comprimento característico %.0f mm; σv no rotor %.0f Pa (hidrostático seria %.0f Pa)" % (
        L * 1000, sig, sig_hid))
    out["janssen"] = {"L_mm": L * 1000, "sigma_v_Pa": sig, "sigma_hid_Pa": sig_hid, "K": K_JANSSEN}

    print("\nTorque estimado (kgf·cm) — servo MG90S 360° trava em %.1f kgf·cm" % T_STALL_KGFCM)
    casos = [
        ("sem chapéu, Janssen", sig, ANG_ABERTO_SEM),
        ("sem chapéu, socado (hidrostático)", sig_hid, ANG_ABERTO_SEM),
        ("chapéu: σv ≈ ρ·g·(abertura 45 mm + 30 mm de grão), 180° aberto", RHO_BULK * g * 0.075, 180.0),
    ]
    out["torque"] = []
    for nome, s, ang in casos:
        T = torque_rotor(s, ang)
        print("  %-62s σv=%4.0f Pa  T=%.2f" % (nome, s, T / KGFCM))
        out["torque"].append({"caso": nome, "sigma_v": s, "T_kgfcm": T / KGFCM})

    print("\nServo: torque disponível × rotação (reta de catálogo)")
    for rpm in (0, 30, 50, 70):
        print("  %3d rpm → %.2f kgf·cm" % (rpm, T_STALL_KGFCM * (1 - rpm / RPM_VAZIO)))

    print("\nPá do rotor com o servo travado (força na ponta %.1f N)" % tensao_pa(1.0)[0])
    out["pa"] = []
    for t in (1.0, 1.2, 2.0, 2.4, 3.0):
        F, s, d = tensao_pa(t)
        print("  t=%.1f mm: σ=%5.1f MPa (ruptura/σ=%5.1f, fadiga/σ=%4.1f), flecha %.2f mm" % (
            t, s / 1e6, SIG_RUPT / s, SIG_FADIGA / s, d * 1000))
        out["pa"].append({"t_mm": t, "sigma_MPa": s / 1e6, "FS_ruptura": SIG_RUPT / s,
                          "FS_fadiga": SIG_FADIGA / s, "flecha_mm": d * 1000})

    # telhado: faixa de 1 m de largura engastada na parede (conservador: ignora o apoio lateral)
    print("\nTelhado como faixa engastada (conservador)")
    p = sig_hid
    out["telhado"] = []
    for t in (2.4, 3.0):
        for Lv in (0.090,):
            M = p * Lv ** 2 / 2
            Z = (t / 1000) ** 2 / 6
            I = (t / 1000) ** 3 / 12
            d = p * Lv ** 4 / (8 * E_PETG * I)
            print("  t=%.1f mm, vão %.0f mm, p=%.0f Pa: σ=%.1f MPa, flecha %.1f mm" % (t, Lv * 1000, p, M / Z / 1e6, d * 1000))
            out["telhado"].append({"t_mm": t, "vao_mm": Lv * 1000, "sigma_MPa": M / Z / 1e6, "flecha_mm": d * 1000})

    print("\nArqueamento (entupimento) — abertura mínima / tamanho do grão")
    print("  regra prática: grão grosso não coesivo arqueia se a abertura < ~5 grãos (furo redondo) ou < ~3 (fenda)")
    out["arqueamento"] = []
    for nome, ab in (("tubo livre (Ø98)", 98.0), ("cone Ø60: fresta anular", 19.0), ("cone Ø50: fresta anular", 24.0),
                     ("telhado: aresta a 5 mm além do centro (meia-lua)", 54.0), ("bolso do rotor (boca)", 24.0)):
        for dg in (6.0, 10.0, 20.0):
            pass
        r = [ab / dg for dg in (6.0, 10.0, 20.0)]
        print("  %-48s %4.0f mm → 6 mm: %4.1f  10 mm: %4.1f  20 mm: %4.1f" % (nome, ab, *r))
        out["arqueamento"].append({"abertura": nome, "mm": ab, "razao_6_10_20": r})
    os.makedirs("resultados", exist_ok=True)
    with open("resultados/analitico.json", "w") as f:
        json.dump(out, f, indent=1)


if __name__ == "__main__":
    main()
