# Estudo do chapéu (P10) — alívio de carga sobre o rotor

Resumo e decisão: `specs/03-mecanica.md` §3.1 (D15 em `specs/README.md`).

- `tabela_dem.md` — todas as variantes simuladas (grão de 10 e 20 mm, 2–4 rodadas cada).
- `dem_comparacao.png` — torque mediano, tempo acima do torque de travamento do servo e vazão por variante.
- `dem_serie_10mm.png` — torque ao longo do tempo, sem chapéu × telhado.

Refazer (≈ 15 s por caso com grão de 20 mm, ≈ 4 min com 10 mm):

```bash
cd tools/dem_dosador
python3 estudo.py --d 10 --chapeu cumeeira_h40 --voltas 3 --seed 1 --tag _s1
python3 analitico.py
/Applications/FreeCAD.app/Contents/Resources/bin/python analisar.py ../../docs/estudos/chapeu
```
