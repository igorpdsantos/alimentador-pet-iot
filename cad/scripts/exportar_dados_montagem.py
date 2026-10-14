# Roda o gerar_v3.py e exporta, para a montagem detalhada (montagem_v3.py):
#   cad/montagem/brep/<objeto>.brep  — peças impressas e referências na posição do conjunto
#   cad/montagem/params.json         — parâmetros/cotas usados para posicionar componentes e fios
# Rodar: cad/scripts/fc.sh "cad/scripts/exportar_dados_montagem.py"
import json
import os

ROOT = os.getcwd()
SRC = os.path.join(ROOT, "cad", "scripts", "gerar_v3.py")
OUT = os.path.join(ROOT, "cad", "montagem")
ns = {"__name__": "gerar_v3"}
exec(open(SRC, encoding="utf-8").read(), ns)
os.makedirs(os.path.join(OUT, "brep"), exist_ok=True)
for nome, shape in ns["objs"]:
    shape.exportBrep(os.path.join(OUT, "brep", nome + ".brep"))
chaves = ["TUBO_RE", "TUBO_RI", "TUBO_L", "Z_TB", "PED_R", "PED_H", "PED_FUNDO", "PED_CAV_Z1", "Z_F", "Z_HUB0", "Z_HUB1",
          "Z_ESC1", "Z_SV0", "SV_CX", "SV_C", "SV_L", "SV_H", "SV_ABA_Z", "SV_ABA_T", "SV_ABA_C", "SV_TOPO_EIXO",
          "Y_ESP", "Z_PROTO0", "PROTO", "ESP32", "HX711", "BUCK", "PILHAS", "Y_VAS", "Y_FIX0", "CEL_C_MAX", "CEL_L",
          "CEL_A", "PISO_BAL", "BOSS_H", "STACK", "Z_PLAT_FUNDO", "Z_PAINEL", "Y_LED", "Y_CHAVE", "Y_BOTAO",
          "CHAVE_RECORTE", "BOTAO_D", "JACK_D", "VAS_D_FUNDO", "VAS_D_MAX", "VAS_H_MAX", "Z_TOPO_TUBO"]
dados = {k: ns[k] for k in chaves if k in ns}
# parafusos das patas: ponto na face externa do pedestal e direção (para dentro)
dados["PARAF_PATAS"] = [[list(p0), list(d)] for p0, d in ns.get("furos_info", [])]
dados["PATA_ABA_T"] = ns.get("PATA_ABA_T", 3.0)
json.dump(dados, open(os.path.join(OUT, "params.json"), "w"), indent=1)
print("exportado", len(ns["objs"]), "objetos +", len([k for k in chaves if k in ns]), "parâmetros")
