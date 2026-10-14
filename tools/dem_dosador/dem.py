# Simulador DEM (elementos discretos) do cartucho dosador v3.
#
# Grãos de ração = esferas polidispersas com atrito e resistência ao rolamento (imita grão irregular).
# Paredes = funções de distância (SDF) montadas a partir das mesmas medidas de gerar_v3.py:
#   0 tubo + anel (com chanfro de entrada), 1 piso com saída de 60°, 2 escudo de 80° com chanfros,
#   3 rotor (cubo + 6 pás curvas de 1 mm + 2 dedos agitadores, gira), 4 chapéu (variante em estudo).
# Contato mola-amortecedor linear + atrito de Coulomb com mola tangencial (histórico), o que é necessário
# para a coluna ficar parada e reproduzir o efeito Janssen.
#
# Unidades: dinâmica em SI (m, kg, s); geometria das SDF em mm (origem z = 0 no topo do piso do dosador).
import math

import numpy as np
from numba import njit, prange

# ------------------------------------------------------------------ geometria (mm, z a partir do piso)
R_TUBO = 49.0            # raio interno do PVC DN100 (101,6 × 1,8)
R_CART = 48.7
R_ANEL = 45.0
Z_HUB0, Z_HUB1 = 0.8, 28.8
Z_ESC0, Z_ESC1 = 30.3, 34.3
Z_CH0 = Z_ESC1 - 3.0     # início do chanfro do anel
R_CUBO, R_PA_OUT, T_PA, CURVA_PA, N_BOLSOS = 20.0, 44.0, 1.0, 25.0, 6
R_SAIDA_IN = 18.0
ANG_SAIDA, ANG_ESCUDO = 60.0, 80.0
Z_TOPO_TUBO = 250.5      # topo do tubo acima do piso (472,5 − 222)

NB = 5                   # corpos: tubo, piso, escudo, rotor, chapéu
MAXC = 16

C30, S30 = math.cos(math.radians(ANG_SAIDA / 2)), math.sin(math.radians(ANG_SAIDA / 2))
C40, S40 = math.cos(math.radians(ANG_ESCUDO / 2)), math.sin(math.radians(ANG_ESCUDO / 2))
SQ2 = math.sqrt(2.0)


def polilinhas_pas():
    n = 12
    bl = np.zeros((N_BOLSOS, n + 1, 2))
    for k in range(N_BOLSOS):
        az0 = k * 360.0 / N_BOLSOS
        for i in range(n + 1):
            r = (R_CUBO - 1.0) + (R_PA_OUT - R_CUBO + 1.0) * i / n
            a = math.radians(az0 - CURVA_PA * (r - R_CUBO + 1.0) / (R_PA_OUT - R_CUBO + 1.0))
            bl[k, i, 0], bl[k, i, 1] = r * math.cos(a), r * math.sin(a)
    return bl


# G: parâmetros do chapéu
#   G[0] = tipo: 0 nenhum, 1 cone central, 2 telhado inclinado
#   cone:    G[1] raio da base, G[2] ângulo (graus), G[3] z da base, G[4] raio das hastes (0 = sem), G[5] nº hastes
#   telhado: G[1] ângulo (graus), G[2] y da aresta, G[3] z da aresta (face de baixo), G[4] espessura
#   tipo 3 = telhado + bloco fechado sobre o escudo: G[5] = meio ângulo do bloco (graus)
#   G[9] = espessura das pás do rotor (mm)
@njit(cache=True, fastmath=True)
def segdist(px, py, ax, ay, bx, by):
    abx = bx - ax
    aby = by - ay
    t = ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)
    if t < 0.0:
        t = 0.0
    elif t > 1.0:
        t = 1.0
    dx = px - ax - t * abx
    dy = py - ay - t * aby
    return math.sqrt(dx * dx + dy * dy)


@njit(cache=True, fastmath=True)
def extr(d2, dz):
    # SDF exata de uma forma 2D extrudada: d2 = distância 2D, dz = distância em z (negativas dentro)
    if d2 > 0.0 and dz > 0.0:
        return math.sqrt(d2 * d2 + dz * dz)
    return max(d2, dz)


@njit(cache=True, fastmath=True)
def sdf_tubo(x, y, z):
    r = math.sqrt(x * x + y * y)
    if z < Z_CH0:
        rw = R_ANEL
    elif z < Z_ESC1:
        rw = R_ANEL + (z - Z_CH0) / (Z_ESC1 - Z_CH0) * (R_CART - R_ANEL)
    else:
        rw = R_TUBO
    d = segdist(r, z, R_ANEL, -20.0, R_ANEL, Z_CH0)
    d = min(d, segdist(r, z, R_ANEL, Z_CH0, R_CART, Z_ESC1))
    d = min(d, segdist(r, z, R_CART, Z_ESC1, R_TUBO, Z_ESC1))
    d = min(d, segdist(r, z, R_TUBO, Z_ESC1, R_TUBO, 3000.0))
    if r < rw:
        return d
    return -d


@njit(cache=True, fastmath=True)
def sdf_piso(x, y, z):
    laje = max(z, -z - 4.0)
    r = math.sqrt(x * x + y * y)
    xl = -y
    yl = x
    sang = max(yl * C30 - xl * S30, -yl * C30 - xl * S30)
    furo = max(max(R_SAIDA_IN - r, r - R_ANEL), sang)
    return extr(-furo, laje + 0.0)


@njit(cache=True, fastmath=True)
def sdf_escudo(x, y, z):
    r = math.sqrt(x * x + y * y)
    xl = -y
    yl = x
    s1 = yl * C40 - xl * S40
    s2 = -yl * C40 - xl * S40
    w = z - Z_ESC0
    sc1 = (2.5 + s1 - w) / SQ2
    sc2 = (2.5 + s2 - w) / SQ2
    s = max(R_CUBO + 1.0 - r, r - (R_ANEL + 0.5))
    s = max(s, max(s1, s2))
    s = extr(s, max(Z_ESC0 - z, z - Z_ESC1))
    s = max(s, max(sc1, sc2))
    return s


@njit(cache=True, fastmath=True)
def sdf_rotor(x, y, z, th, BL, G):
    c = math.cos(th)
    s = math.sin(th)
    xr = x * c + y * s
    yr = -x * s + y * c
    r = math.sqrt(xr * xr + yr * yr)
    zc = max(Z_HUB0 - z, z - Z_HUB1)
    best = extr(r - R_CUBO, zc)
    if r < R_PA_OUT + 16.0 and z < Z_HUB1 + 16.0:
        dmin = 1e9
        for k in range(BL.shape[0]):
            for i in range(BL.shape[1] - 1):
                d = segdist(xr, yr, BL[k, i, 0], BL[k, i, 1], BL[k, i + 1, 0], BL[k, i + 1, 1])
                if d < dmin:
                    dmin = d
        best = min(best, extr(dmin - G[9] / 2.0, zc))
    if r < 32.0 and z > Z_HUB1 - 16.0:
        zz = min(max(z, Z_HUB1), Z_HUB1 + 11.0)
        for sx in (-12.0, 12.0):
            dx = xr - sx
            d = math.sqrt(dx * dx + yr * yr + (z - zz) * (z - zz)) - 3.0
            best = min(best, d)
    return best


@njit(cache=True, fastmath=True)
def sdf_chapeu(x, y, z, G):
    tipo = int(G[0])
    if tipo == 1:
        rh = G[1]
        ta = math.tan(math.radians(G[2]))
        zb = G[3]
        zt = zb + rh * ta
        r = math.sqrt(x * x + y * y)
        d = min(segdist(r, z, 0.0, zb, rh, zb), segdist(r, z, rh, zb, 0.0, zt))
        dentro = z >= zb and r <= rh and z <= zb + (rh - r) * ta
        s = -d if dentro else d
        rl = G[4]
        if rl > 0.0:
            n = int(G[5])
            zl = zb + rl
            for k in range(n):
                a = math.radians(90.0 + k * 360.0 / n)
                ca = math.cos(a)
                sa = math.sin(a)
                t = x * ca + y * sa
                t = min(max(t, rh - 3.0), R_TUBO)
                dx = x - t * ca
                dy = y - t * sa
                dz = z - zl
                s = min(s, math.sqrt(dx * dx + dy * dy + dz * dz) - rl)
        return s
    elif tipo == 2 or tipo == 3:
        a = math.radians(G[1])
        sa = math.sin(a)
        ca = math.cos(a)
        ye = G[2]
        ze = G[3]
        t = G[4]
        p = (y * sa + z * ca) - (ye * sa + ze * ca)
        telhado = extr(max(-p, p - t), y - ye)
        if tipo == 2:
            return telhado
        # tipo 3: telhado + cumeeira fechada sobre o escudo (laterais a G[6] graus partindo da borda do escudo)
        r = math.sqrt(x * x + y * y)
        xl = -y
        yl = x
        cg = math.cos(math.radians(G[5]))
        sg = math.sin(math.radians(G[5]))
        s1 = yl * cg - xl * sg
        s2 = -yl * cg - xl * sg
        tr = math.tan(math.radians(G[6]))
        cr = math.cos(math.radians(G[6]))
        bloco2d = max(max(R_CUBO + 1.0 - r, r - R_CART), max(s1, s2))
        bloco = extr(bloco2d, Z_ESC1 - z)
        bloco = max(bloco, max((z - Z_ESC1 + s1 * tr) * cr, (z - Z_ESC1 + s2 * tr) * cr))
        bloco = max(bloco, p - t)
        return min(telhado, bloco)
    return 1e9


@njit(cache=True, fastmath=True)
def sdf_corpo(b, x, y, z, th, G, BL):
    if b == 0:
        return sdf_tubo(x, y, z)
    elif b == 1:
        return sdf_piso(x, y, z)
    elif b == 2:
        return sdf_escudo(x, y, z)
    elif b == 3:
        return sdf_rotor(x, y, z, th, BL, G)
    return sdf_chapeu(x, y, z, G)


@njit(cache=True, fastmath=True)
def perto(b, x, y, z, G):
    # filtro barato antes de avaliar a SDF (mm)
    if b == 0:
        return x * x + y * y > 30.0 * 30.0
    elif b == 1:
        return z < 15.0
    elif b == 2:
        return z < 50.0 and z > 15.0 and y < 0.0
    elif b == 3:
        return z < 55.0
    tipo = int(G[0])
    if tipo == 0:
        return False
    return True


@njit(cache=True, fastmath=True)
def grad(b, x, y, z, th, G, BL):
    h = 0.02
    gx = sdf_corpo(b, x + h, y, z, th, G, BL) - sdf_corpo(b, x - h, y, z, th, G, BL)
    gy = sdf_corpo(b, x, y + h, z, th, G, BL) - sdf_corpo(b, x, y - h, z, th, G, BL)
    gz = sdf_corpo(b, x, y, z + h, th, G, BL) - sdf_corpo(b, x, y, z - h, th, G, BL)
    n = math.sqrt(gx * gx + gy * gy + gz * gz)
    if n < 1e-12:
        return 0.0, 0.0, 1.0
    return gx / n, gy / n, gz / n


# ------------------------------------------------------------------ forças
@njit(parallel=True, cache=True, fastmath=True)
def forcas(pos, vel, om, rad, mass, act, hj, hx, nhj, nhx, hw, nhw, th, w_rot, G, BL, P, dt,
           cstart, clist, gdim, gorig, gh, F, T, tq, fzb):
    kn, kt, mu_pp, mu_pw, mu_r, beta, grav = P[0], P[1], P[2], P[3], P[4], P[5], P[6]
    N = pos.shape[0]
    nx, ny, nz = gdim[0], gdim[1], gdim[2]
    for i in prange(N):
        for k in range(MAXC):
            nhj[i, k] = -1
        for b in range(NB):
            nhw[i, b, 0] = 0.0
            nhw[i, b, 1] = 0.0
            nhw[i, b, 2] = 0.0
            fzb[i, b] = 0.0
        tq[i] = 0.0
        F[i, 0] = 0.0
        F[i, 1] = 0.0
        F[i, 2] = 0.0
        T[i, 0] = 0.0
        T[i, 1] = 0.0
        T[i, 2] = 0.0
        if act[i] == 0:
            continue
        mi = mass[i]
        ri = rad[i]
        crmax = 0.04 * 0.4 * mi * ri * ri / dt     # limite p/ o amortecimento de rolamento ser estável
        F[i, 2] = -mi * grav
        xi, yi, zi = pos[i, 0], pos[i, 1], pos[i, 2]
        cx = int((xi - gorig[0]) / gh)
        cy = int((yi - gorig[1]) / gh)
        cz = int((zi - gorig[2]) / gh)
        slot = 0
        # ---------------- grão × grão
        for ddx in range(-1, 2):
            ix = cx + ddx
            if ix < 0 or ix >= nx:
                continue
            for ddy in range(-1, 2):
                iy = cy + ddy
                if iy < 0 or iy >= ny:
                    continue
                for ddz in range(-1, 2):
                    iz = cz + ddz
                    if iz < 0 or iz >= nz:
                        continue
                    cell = (ix * ny + iy) * nz + iz
                    for q in range(cstart[cell], cstart[cell + 1]):
                        j = clist[q]
                        if j == i:
                            continue
                        dx = xi - pos[j, 0]
                        dy = yi - pos[j, 1]
                        dz = zi - pos[j, 2]
                        d2 = dx * dx + dy * dy + dz * dz
                        rs = ri + rad[j]
                        if d2 >= rs * rs:
                            continue
                        d = math.sqrt(d2)
                        nxv, nyv, nzv = dx / d, dy / d, dz / d
                        delta = rs - d
                        # velocidade relativa no ponto de contato
                        rjc = rad[j]
                        # om_i × (−ri n) − om_j × (rj n)
                        vx = vel[i, 0] - vel[j, 0] - ri * (om[i, 1] * nzv - om[i, 2] * nyv) - rjc * (om[j, 1] * nzv - om[j, 2] * nyv)
                        vy = vel[i, 1] - vel[j, 1] - ri * (om[i, 2] * nxv - om[i, 0] * nzv) - rjc * (om[j, 2] * nxv - om[j, 0] * nzv)
                        vz = vel[i, 2] - vel[j, 2] - ri * (om[i, 0] * nyv - om[i, 1] * nxv) - rjc * (om[j, 0] * nyv - om[j, 1] * nxv)
                        vn = vx * nxv + vy * nyv + vz * nzv
                        vtx, vty, vtz = vx - vn * nxv, vy - vn * nyv, vz - vn * nzv
                        meff = mi * mass[j] / (mi + mass[j])
                        gn = 2.0 * beta * math.sqrt(meff * kn)
                        gt = 2.0 * beta * math.sqrt(meff * kt)
                        # histórico tangencial
                        ex, ey, ez = 0.0, 0.0, 0.0
                        for k in range(MAXC):
                            if hj[i, k] == j:
                                ex, ey, ez = hx[i, k, 0], hx[i, k, 1], hx[i, k, 2]
                                break
                        en = ex * nxv + ey * nyv + ez * nzv
                        ex -= en * nxv
                        ey -= en * nyv
                        ez -= en * nzv
                        ex += vtx * dt
                        ey += vty * dt
                        ez += vtz * dt
                        fn = kn * delta - gn * vn
                        if fn < 0.0:
                            fn = 0.0
                        ftx = -kt * ex - gt * vtx
                        fty = -kt * ey - gt * vty
                        ftz = -kt * ez - gt * vtz
                        ft = math.sqrt(ftx * ftx + fty * fty + ftz * ftz)
                        lim = mu_pp * fn
                        if ft > lim:
                            sc = lim / ft
                            ftx *= sc
                            fty *= sc
                            ftz *= sc
                            ex, ey, ez = -ftx / kt, -fty / kt, -ftz / kt
                        if slot < MAXC:
                            nhj[i, slot] = j
                            nhx[i, slot, 0] = ex
                            nhx[i, slot, 1] = ey
                            nhx[i, slot, 2] = ez
                            slot += 1
                        F[i, 0] += fn * nxv + ftx
                        F[i, 1] += fn * nyv + fty
                        F[i, 2] += fn * nzv + ftz
                        # torque de Ft no ponto −ri n
                        T[i, 0] += -ri * (nyv * ftz - nzv * fty)
                        T[i, 1] += -ri * (nzv * ftx - nxv * ftz)
                        T[i, 2] += -ri * (nxv * fty - nyv * ftx)
                        # resistência ao rolamento
                        wx = om[i, 0] - om[j, 0]
                        wy = om[i, 1] - om[j, 1]
                        wz = om[i, 2] - om[j, 2]
                        wm = math.sqrt(wx * wx + wy * wy + wz * wz)
                        reff = ri * rjc / rs
                        mr = min(mu_r * reff * fn / max(wm, 1e-3), crmax)
                        T[i, 0] -= mr * wx
                        T[i, 1] -= mr * wy
                        T[i, 2] -= mr * wz
        # ---------------- grão × paredes
        X, Y, Z = xi * 1000.0, yi * 1000.0, zi * 1000.0
        for b in range(NB):
            if not perto(b, X, Y, Z, G):
                continue
            s = sdf_corpo(b, X, Y, Z, th, G, BL) / 1000.0
            if s >= ri:
                continue
            nxv, nyv, nzv = grad(b, X, Y, Z, th, G, BL)
            delta = ri - s
            kc = kn
            if b == 3:
                rc = math.sqrt((X - nxv * s * 1000.0) ** 2 + (Y - nyv * s * 1000.0) ** 2)
                if rc > R_CUBO + 0.6 and Z < Z_HUB1 * 1.0 + 1.0:
                    L = max(rc - (R_CUBO - 1.0), 2.0) / 1000.0
                    kb = P[7] / (L * L * L)
                    kc = 1.0 / (1.0 / kn + 1.0 / kb)
            # ponto de contato e velocidade da parede
            pcx = xi - nxv * s
            pcy = yi - nyv * s
            vwx, vwy = 0.0, 0.0
            if b == 3:
                vwx = -w_rot * pcy
                vwy = w_rot * pcx
            vx = vel[i, 0] - ri * (om[i, 1] * nzv - om[i, 2] * nyv) - vwx
            vy = vel[i, 1] - ri * (om[i, 2] * nxv - om[i, 0] * nzv) - vwy
            vz = vel[i, 2] - ri * (om[i, 0] * nyv - om[i, 1] * nxv)
            vn = vx * nxv + vy * nyv + vz * nzv
            vtx, vty, vtz = vx - vn * nxv, vy - vn * nyv, vz - vn * nzv
            gn = 2.0 * beta * math.sqrt(mi * kc)
            gt = 2.0 * beta * math.sqrt(mi * kt)
            ex, ey, ez = hw[i, b, 0], hw[i, b, 1], hw[i, b, 2]
            en = ex * nxv + ey * nyv + ez * nzv
            ex -= en * nxv
            ey -= en * nyv
            ez -= en * nzv
            ex += vtx * dt
            ey += vty * dt
            ez += vtz * dt
            fn = kc * delta - gn * vn
            if fn < 0.0:
                fn = 0.0
            ftx = -kt * ex - gt * vtx
            fty = -kt * ey - gt * vty
            ftz = -kt * ez - gt * vtz
            ft = math.sqrt(ftx * ftx + fty * fty + ftz * ftz)
            lim = mu_pw * fn
            if ft > lim:
                sc = lim / ft
                ftx *= sc
                fty *= sc
                ftz *= sc
                ex, ey, ez = -ftx / kt, -fty / kt, -ftz / kt
            nhw[i, b, 0] = ex
            nhw[i, b, 1] = ey
            nhw[i, b, 2] = ez
            fx = fn * nxv + ftx
            fy = fn * nyv + fty
            fz = fn * nzv + ftz
            F[i, 0] += fx
            F[i, 1] += fy
            F[i, 2] += fz
            T[i, 0] += -ri * (nyv * ftz - nzv * fty)
            T[i, 1] += -ri * (nzv * ftx - nxv * ftz)
            T[i, 2] += -ri * (nxv * fty - nyv * ftx)
            wm = math.sqrt(om[i, 0] ** 2 + om[i, 1] ** 2 + om[i, 2] ** 2)
            mr = min(mu_r * ri * fn / max(wm, 1e-3), crmax)
            T[i, 0] -= mr * om[i, 0]
            T[i, 1] -= mr * om[i, 1]
            T[i, 2] -= mr * om[i, 2]
            fzb[i, b] = -fz
            if b == 3:
                # torque que o grão faz no rotor (força −F no ponto de contato)
                tq[i] = -(pcx * fy - pcy * fx)


@njit(cache=True)
def grade(pos, act, gdim, gorig, gh, cstart, clist, cid):
    nx, ny, nz = gdim[0], gdim[1], gdim[2]
    ncell = nx * ny * nz
    for c in range(ncell + 1):
        cstart[c] = 0
    N = pos.shape[0]
    for i in range(N):
        if act[i] == 0:
            cid[i] = -1
            continue
        ix = min(max(int((pos[i, 0] - gorig[0]) / gh), 0), nx - 1)
        iy = min(max(int((pos[i, 1] - gorig[1]) / gh), 0), ny - 1)
        iz = min(max(int((pos[i, 2] - gorig[2]) / gh), 0), nz - 1)
        c = (ix * ny + iy) * nz + iz
        cid[i] = c
        cstart[c + 1] += 1
    for c in range(ncell):
        cstart[c + 1] += cstart[c]
    fill = cstart[:-1].copy()
    for i in range(N):
        c = cid[i]
        if c >= 0:
            clist[fill[c]] = i
            fill[c] += 1


@njit(parallel=True, cache=True, fastmath=True)
def integra(pos, vel, om, mass, inert, act, F, T, dt, zrem, removido):
    N = pos.shape[0]
    for i in prange(N):
        removido[i] = 0.0
        if act[i] == 0:
            continue
        for a in range(3):
            vel[i, a] += F[i, a] / mass[i] * dt
            om[i, a] += T[i, a] / inert[i] * dt
            pos[i, a] += vel[i, a] * dt
        if pos[i, 2] < zrem:
            act[i] = 0
            removido[i] = mass[i]
            pos[i, 0] = 0.0
            pos[i, 1] = 0.0
            pos[i, 2] = -1.0
            for a in range(3):
                vel[i, a] = 0.0
                om[i, a] = 0.0


@njit(cache=True)
def roda(nsteps, dt, pos, vel, om, rad, mass, inert, act, hj, hx, nhj, nhx, hw, nhw,
         th0, w_rot, G, BL, P, zrem, gdim, gorig, gh, cstart, clist, cid, F, T, tq, fzb, removido):
    # integra nsteps passos; devolve torque médio/máx no rotor, massa que saiu e Fz média por corpo
    th = th0
    soma_tq = 0.0
    max_tq = -1e9
    min_tq = 1e9
    massa_saiu = 0.0
    fz_media = np.zeros(NB)
    for st in range(nsteps):
        grade(pos, act, gdim, gorig, gh, cstart, clist, cid)
        forcas(pos, vel, om, rad, mass, act, hj, hx, nhj, nhx, hw, nhw, th, w_rot, G, BL, P, dt,
               cstart, clist, gdim, gorig, gh, F, T, tq, fzb)
        t = tq.sum()
        soma_tq += t
        if t > max_tq:
            max_tq = t
        if t < min_tq:
            min_tq = t
        for b in range(NB):
            fz_media[b] += fzb[:, b].sum()
        integra(pos, vel, om, mass, inert, act, F, T, dt, zrem, removido)
        massa_saiu += removido.sum()
        # troca os buffers de histórico
        hj[:, :] = nhj
        hx[:, :, :] = nhx
        hw[:, :, :] = nhw
        th += w_rot * dt
    return th, soma_tq / nsteps, max_tq, min_tq, massa_saiu, fz_media / nsteps


# ------------------------------------------------------------------ montagem do caso
class Caso:
    def __init__(self, d_mm, G, rho=920.0, mu_pp=0.5, mu_pw=0.35, mu_r=0.10, e=0.3, poli=0.15, seed=1,
                 nivel_mm=Z_TOPO_TUBO, k10=2000.0, t_pa=2.4, e_petg=2.0e9):
        self.d = d_mm / 1000.0
        g = np.zeros(10)
        g[:len(G)] = G
        g[9] = t_pa                                     # espessura das pás (mm)
        self.G = g
        self.BL = polilinhas_pas()
        self.rng = np.random.default_rng(seed)
        R = self.d / 2
        self.rmax = R * (1 + poli)
        kn = k10 * (d_mm / 10.0)
        kt = kn * 2.0 / 7.0
        le = math.log(e)
        beta = -le / math.sqrt(math.pi ** 2 + le ** 2)
        tres_EI = 3.0 * e_petg * (0.028 * (t_pa / 1000.0) ** 3 / 12.0)    # pá = viga engastada no cubo
        self.P = np.array([kn, kt, mu_pp, mu_pw, mu_r, beta, 9.81, tres_EI])
        self.rho = rho
        self.nivel = nivel_mm
        N = self.n_alvo(R * 1000)
        self.N = N
        self.pos = np.zeros((N, 3))
        self.pos[:, 2] = -1.0
        self.vel = np.zeros((N, 3))
        self.om = np.zeros((N, 3))
        self.rad = R * self.rng.uniform(1 - poli, 1 + poli, N)
        self.mass = rho * 4.0 / 3.0 * math.pi * self.rad ** 3
        self.inert = 0.4 * self.mass * self.rad ** 2
        self.act = np.zeros(N, dtype=np.int8)       # todos na "reserva"; despejar() vai ativando
        self.prox = 0
        self.hj = -np.ones((N, MAXC), dtype=np.int32)
        self.hx = np.zeros((N, MAXC, 3))
        self.nhj = -np.ones((N, MAXC), dtype=np.int32)
        self.nhx = np.zeros((N, MAXC, 3))
        self.hw = np.zeros((N, NB, 3))
        self.nhw = np.zeros((N, NB, 3))
        self.gh = 2 * self.rmax * 1.01
        self.z_ins = (self.nivel / 1000.0) + 3 * self.rmax
        zmax = self.z_ins + 0.05
        self.gorig = np.array([-0.056, -0.056, -0.05])
        self.gdim = np.array([int(0.112 / self.gh) + 1, int(0.112 / self.gh) + 1,
                              int((zmax - self.gorig[2]) / self.gh) + 1], dtype=np.int64)
        nc = int(self.gdim.prod())
        self.cstart = np.zeros(nc + 1, dtype=np.int64)
        self.clist = np.zeros(N, dtype=np.int64)
        self.cid = np.zeros(N, dtype=np.int64)
        self.F = np.zeros((N, 3))
        self.T = np.zeros((N, 3))
        self.tq = np.zeros(N)
        self.fzb = np.zeros((N, NB))
        self.removido = np.zeros(N)
        meff = rho * 4 / 3 * math.pi * (R * (1 - poli)) ** 3 / 2
        tc = math.pi * math.sqrt(meff / kn)
        self.dt = tc / 30.0
        self.th = 0.0
        self.t = 0.0
        self.saiu = 0.0
        # camada de despejo: reticulado com folga dentro do tubo
        esp = 2 * self.rmax * 1000 * 1.05
        rlim = R_TUBO - self.rmax * 1000 - 0.5
        cam = []
        for xx in np.arange(-rlim, rlim + 1e-9, esp):
            for yy in np.arange(-rlim, rlim + 1e-9, esp):
                if xx * xx + yy * yy <= rlim * rlim:
                    cam.append((xx, yy))
        self.camada = np.array(cam) / 1000.0

    def despejar(self, v0=1.0):
        # solta uma camada no topo do tubo se o espaço logo abaixo já estiver livre (como despejar do saco)
        if self.prox >= self.N:
            return False
        a = self.act == 1
        if a.any():
            zt = (self.pos[a, 2] + self.rad[a]).max()
            if zt > self.z_ins - 1.2 * self.rmax:
                # sem espaço: se o monte já parou acima do nível, o tubo está cheio
                topo = a & (self.pos[:, 2] + self.rad > self.nivel / 1000.0)
                v = np.sqrt((self.vel[topo] ** 2).sum(1)) if topo.any() else np.zeros(1)
                return not (v.max() < 0.05)
        n = min(len(self.camada), self.N - self.prox)
        idx = np.arange(self.prox, self.prox + n)
        sel = self.rng.permutation(len(self.camada))[:n]
        self.pos[idx, :2] = self.camada[sel] + self.rng.uniform(-0.3e-3, 0.3e-3, (n, 2))
        self.pos[idx, 2] = self.z_ins
        self.vel[idx] = 0.0
        self.vel[idx, 2] = -v0
        self.act[idx] = 1
        self.prox += n
        return True

    def n_alvo(self, R_mm):
        # volume livre até o nível (Monte Carlo com as SDF) × fração de empacotamento 0,60
        rng = np.random.default_rng(7)
        M = 300000
        x = rng.uniform(-R_TUBO, R_TUBO, M)
        y = rng.uniform(-R_TUBO, R_TUBO, M)
        z = rng.uniform(0, self.nivel, M)
        livre = volume_livre(x, y, z, self.G, self.BL)
        vol = (2 * R_TUBO) ** 2 * self.nivel * livre.mean()
        vgrao = 4 / 3 * math.pi * R_mm ** 3 * (1 + 0.15 ** 2)
        self.vol_livre_mL = vol / 1000
        return int(vol * 0.62 / vgrao)

    def passo(self, nsteps, w_rot=0.0, zrem=-0.015):
        r = roda(nsteps, self.dt, self.pos, self.vel, self.om, self.rad, self.mass, self.inert, self.act,
                 self.hj, self.hx, self.nhj, self.nhx, self.hw, self.nhw, self.th, w_rot, self.G, self.BL,
                 self.P, zrem, self.gdim, self.gorig, self.gh, self.cstart, self.clist, self.cid,
                 self.F, self.T, self.tq, self.fzb, self.removido)
        self.th = r[0]
        self.t += nsteps * self.dt
        self.saiu += r[4]
        return r

    def energia_cinetica(self):
        a = self.act == 1
        return 0.5 * (self.mass[a] * (self.vel[a] ** 2).sum(1)).sum()

    def aparar(self):
        # tira o que passou do nível de "cheio" (topo do tubo)
        topo = self.pos[:, 2] * 1000 + self.rad * 1000
        fora = (self.act == 1) & (topo > self.nivel)
        self.act[fora] = 0
        self.pos[fora] = [0, 0, -1]
        self.vel[fora] = 0
        return int(fora.sum())

    def massa_ativa(self):
        return float(self.mass[self.act == 1].sum())


@njit(parallel=True, cache=True)
def volume_livre(x, y, z, G, BL):
    M = x.shape[0]
    out = np.zeros(M)
    for i in prange(M):
        ok = sdf_tubo(x[i], y[i], z[i]) > 0 and sdf_piso(x[i], y[i], z[i]) > 0 and \
            sdf_escudo(x[i], y[i], z[i]) > 0 and sdf_rotor(x[i], y[i], z[i], 0.0, BL, G) > 0 and \
            sdf_chapeu(x[i], y[i], z[i], G) > 0
        out[i] = 1.0 if ok else 0.0
    return out
