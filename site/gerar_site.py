# Gera o site do projeto a partir da documentação e do CAD:
#   site/index.html  ← site/modelo.html + dados (peças, compras, montagem, uso, decisões, simulação)
#   site/arquivos/   ← peças para imprimir (STL/3MF + ZIP), CAD do FreeCAD (ZIP) e STEP
# Rodar da raiz do projeto:  python3 site/gerar_site.py   (precisa de: pip install markdown)
# Quando o modelo 3D mudar, antes: freecadcmd site/ferramentas/exportar_glb.py  (modelo 3D do site)
#                                  site/ferramentas/renderizar_imagens.py dentro do FreeCAD + aparar_imagens.py (imagens)
import glob
import html
import json
import os
import re
import shutil
import struct
import subprocess
import zipfile

import markdown

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(RAIZ, "site")
ARQ = os.path.join(SITE, "arquivos")
IMPRESSAO = os.path.join(RAIZ, "cad", "impressao_v3")
FC = "/Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd"

NOMES = {
    "P01": "Piso do dosador", "P02": "Anel + escudo", "P03": "Rotor de 6 bolsos", "P04": "Bica com moldura",
    "P05": "Bandeja + espinha", "P06": "Pedestal", "P07": "Base da balança", "P08": "Plataforma com saia",
    "P09": "Espaçador da célula", "P10": "Chapéu", "P11": "Gaveta das pilhas", "P12": "Pata", "P13": "Tampa do lastro",
}
GRUPO = {"P01": "Dosador", "P02": "Dosador", "P03": "Dosador", "P04": "Dosador", "P10": "Dosador",
         "P05": "Estrutura", "P06": "Estrutura", "P11": "Estrutura", "P12": "Estrutura", "P13": "Estrutura",
         "P07": "Balança", "P08": "Balança", "P09": "Balança"}
LADO = {"TD": "trás-direita", "TE": "trás-esquerda", "FE": "frente-esquerda", "FD": "frente-direita"}
INFILL = {"P03": 0.40, "P09": 0.40}

# Ficha de cada peça no visualizador 3D (nome do objeto no CAD → nome, função, material)
FICHAS = {
    "P01": ("Piso do dosador", "Fundo do cartucho. Segura o servo por baixo e tem a saída de 60° que leva a ração à bica.", "PETG"),
    "P02": ("Anel + escudo", "Parede onde o rotor gira. O escudo de 80° fica sobre a saída; as bordas chanfradas levantam o grão em vez de prensar.", "PETG"),
    "P03": ("Rotor de 6 bolsos", "Cada bolso leva ~22 mL de ração até a saída. Pás curvas rígidas de 2,4 mm e dois dedos agitadores; gira nos dois sentidos para destravar.", "PETG, 40 % de preenchimento"),
    "P04": ("Bica com moldura", "Canal a 45° que atravessa a parede do tubo e despeja a ração no centro da vasilha. A moldura esconde o corte no PVC.", "PETG"),
    "P05": ("Bandeja + espinha", "Disco apoiado no degrau do pedestal com a espinha onde a protoboard fica em pé, dentro do tubo.", "PETG"),
    "P06": ("Pedestal", "Base do tubo. Guarda as pilhas, o painel (chave, botão, LED) e o jack de 12 V.", "PETG"),
    "P07": ("Base da balança", "Base fixa: prende a célula de carga e tem 3 batentes que protegem contra sobrecarga.", "PETG"),
    "P08": ("Plataforma com saia", "Onde a vasilha apoia. Flutua sobre a célula; a saia esconde a balança e barra migalhas.", "PETG"),
    "P09": ("Espaçador da célula", "Entre a ponta livre da célula e a plataforma.", "PETG, 40 % de preenchimento"),
    "P10": ("Chapéu", "Telhado a 55° sobre o rotor. Tira cerca de ⅔ do peso da coluna de ração de cima dos bolsos: o servo gira leve mesmo com o tubo cheio.", "PETG"),
    "P11": ("Gaveta das pilhas", "Sai pela esquerda do pedestal com as 6 pilhas AA de reserva. Travada por 4 ímãs escondidos.", "PETG"),
    "P12": ("Pata anti-tombamento", "Uma de quatro. Alarga o apoio de 70 para ~122 mm do eixo e tem um bolso de lastro: dobra a força necessária para derrubar.", "PETG"),
    "P13": ("Tampa do lastro", "Fecha o bolso de lastro da pata, rente ao topo.", "PETG"),
    "REF_tubo_PVC_DN100": ("Tubo de PVC DN 100", "Reservatório. Esgoto série normal, Ø 101,6 × 1,8 mm, 640 mm: leva ≥ 1,2 kg de ração.", "Comprado"),
    "REF_cap_superior": ("Cap DN 100", "Só encaixado em cima: abre para reabastecer.", "Comprado"),
    "REF_servo_MG90S_360": ("Servo MG90S 360°", "Rotação contínua, engrenagem de metal, 1,8 kgf·cm. Gira o rotor.", "Comprado"),
    "REF_braco_servo": ("Braço do servo", "Braço duplo do kit, encaixado no rebaixo do rotor.", "Comprado"),
    "REF_celula_5kg": ("Célula de carga 5 kg", "Barra de alumínio com extensômetros; lida pelo HX711 de 24 bits.", "Comprado"),
    "REF_vasilha_maior": ("Vasilha", "Inox, borda Ø 140–160 mm, até 60 mm de altura.", "Comprado"),
    "REF_pilhas_6AA": ("Pilhas 6 × AA", "No-break: assumem sozinhas quando a fonte cai.", "Comprado"),
    "REF_protoboard_ESP32_modulos": ("Eletrônica", "Protoboard MB-102 em pé com ESP32, HX711 e step-down MP1584.", "Comprado"),
    "REF_imas_6x2_gaveta": ("Ímãs da gaveta", "4 discos de neodímio 6 × 2 mm, escondidos sob 1 mm de plástico.", "Comprado"),
}
VARIANTES_DEM = [("nenhum", "Sem chapéu"), ("cone60", "Cone central Ø60"), ("telhado", "Telhado simples"),
                 ("chapeu_h40", "Telhado + bloco reto"), ("cumeeira_h40", "Chapéu final (cumeeira)")]


# componentes citados no passo a passo → imagem (site/img/comp/) e nome; a ordem é a de exibição
COMPONENTES_FASE = [
    (r"\btubo\b|\bPVC\b", "tubo", "Tubo PVC DN 100", "640 mm"),
    (r"\bcap\b", "cap", "Cap DN 100", "só encaixa"),
    (r"ESP32", "esp32", "ESP32 DevKit V1", "30 pinos"),
    (r"HX711", "hx711", "HX711", "24 bits"),
    (r"MP1584|step-down|regulador", "mp1584", "Step-down MP1584", "ajustar 5,0 V"),
    (r"protoboard|MB-102", "protoboard", "Protoboard MB-102", "830 pontos"),
    (r"servo", "servo", "Servo MG90S 360°", "+ braço do kit"),
    (r"célula|celula", "celula", "Célula 5 kg", "seta p/ baixo"),
    (r"\bjack\b", "jack", "Jack P4", "5,5 × 2,1 mm"),
    (r"KCD11", "chave", "Chave KCD11", "liga/desliga"),
    (r"botão(?! BOOT)|botao", "botao", "Botão 12 mm", "momentâneo NA"),
    (r"\bLED\b", "led", "LED 5 mm", "+ 220 Ω"),
    (r"pilha|6 ?× ?AA|6 AA", "pilhas", "Suporte 6 × AA", "1 camada"),
    (r"1N5819|diodo", "diodo", "Diodo 1N5819", "faixa = catodo"),
    (r"resistor|kΩ|220 ?Ω", "resistor", "Resistores", "100k · 27k · 22k · 220"),
    (r"470 ?µF", "cap_eletrolitico", "Capacitor 470 µF", "≥ 16 V"),
    (r"100 ?nF", "cap_ceramico", "Capacitor 100 nF", "código 104"),
    (r"M3 ?× ?8\b", "m3x8", "Parafuso M3 × 8", "moldura da bica"),
    (r"M3 ?× ?10\b", "m3x10", "Parafuso M3 × 10", "cartucho"),
    (r"M3 ?× ?12\b", "m3x12", "Parafuso M3 × 12", "braço, batentes, patas"),
    (r"M3 ?× ?20\b", "m3x20", "Parafuso M3 × 20", "tubo ↔ pedestal"),
    (r"M5|M4/M5", "m5x16", "Parafuso M5 × 16", "célula (se M5)"),
    (r"M4\b|M4/M5", "m4x16", "Parafuso M4 × 16", "célula (se M4)"),
    (r"(?<![a-zà-ú])[íi]mãs?(?![a-zà-ú])", "imas", "Ímãs 6 × 2 mm", "neodímio"),
    (r"vasilha", "vasilha", "Vasilha inox", "Ø 140–160 mm"),
]


def itens_fase(texto):
    itens, vistos = [], set()
    for m in re.finditer(r"\bP(0[1-9]|1[0-3])\b", texto):
        cod = "P" + m.group(1)
        if cod in vistos:
            continue
        vistos.add(cod)
        arqs = sorted(glob.glob(os.path.join(SITE, "img", "pecas", cod + "_*.png")))
        if arqs:
            n = len(arqs)
            itens.append({"img": "img/pecas/" + os.path.basename(arqs[0]), "nome": "%s %s" % (cod, NOMES.get(cod, "")),
                          "sub": "imprimir" + (" (%d)" % n if n > 1 else "")})
    itens.sort(key=lambda i: i["nome"])
    for rx, cid, nome, sub in COMPONENTES_FASE:
        if re.search(rx, texto, re.I) and os.path.exists(os.path.join(SITE, "img", "comp", cid + ".png")):
            itens.append({"img": "img/comp/%s.png" % cid, "nome": nome, "sub": sub})
    return itens


def ler(rel):
    return open(os.path.join(RAIZ, rel), encoding="utf-8").read()


def md(texto):
    # listas coladas no parágrafo anterior (comum na documentação) precisam de linha em branco para o Markdown
    linhas, saida = texto.split("\n"), []
    for i, ln in enumerate(linhas):
        e_lista = re.match(r"^\s*([-*]|\d+\.)\s", ln)
        ant = saida[-1] if saida else ""
        if e_lista and ant.strip() and not re.match(r"^\s*([-*]|\d+\.)\s", ant) and not ant.startswith((" ", "\t", "|")):
            saida.append("")
        saida.append(ln)
    texto = "\n".join(saida)
    h = markdown.markdown(texto, extensions=["tables", "fenced_code", "sane_lists"])
    h = h.replace("<table>", '<div class="tabela"><table>').replace("</table>", "</table></div>")
    h = h.replace("✅", '<span class="ok">✓</span>').replace("⚠️", '<span class="aviso">!</span>')
    return h


def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
    t = re.sub(r"~~(.+?)~~", r"<s>\1</s>", t)
    return t.replace("⚠️", '<span class="aviso">!</span>').replace("✅", '<span class="ok">✓</span>')


def secoes(texto, nivel="## "):
    partes, atual, corpo = [], None, []
    for ln in texto.split("\n"):
        if ln.startswith(nivel):
            if atual is not None:
                partes.append((atual, "\n".join(corpo)))
            atual, corpo = ln[len(nivel):].strip(), []
        elif atual is not None:
            corpo.append(ln)
    if atual is not None:
        partes.append((atual, "\n".join(corpo)))
    return partes


def tabela_md(texto, cab):
    linhas, dentro = [], False
    for ln in texto.split("\n"):
        if ln.startswith("| " + cab) or ln.startswith("|" + cab):
            dentro = True
            continue
        if dentro:
            if not ln.startswith("|"):
                break
            if ln.startswith("|---") or ln.startswith("|----"):
                continue
            linhas.append([c.strip() for c in ln.strip().strip("|").split("|")])
    return linhas


# ------------------------------------------------------------------ STL → gramas e horas (mesmo modelo do orçamento)
def stl_area_volume(caminho):
    dados = open(caminho, "rb").read()
    area = vol = 0.0
    n = struct.unpack("<I", dados[80:84])[0]
    if 84 + 50 * n == len(dados):
        tris = (struct.unpack("<9f", dados[84 + 50 * i + 12: 84 + 50 * i + 48]) for i in range(n))
    else:
        nums = [list(map(float, m.split())) for m in re.findall(rb"vertex\s+([^\n]+)", dados)]
        tris = (nums[i] + nums[i + 1] + nums[i + 2] for i in range(0, len(nums), 3))
    for t in tris:
        ax, ay, az, bx, by, bz, cx, cy, cz = t
        ux, uy, uz, vx, vy, vz = bx - ax, by - ay, bz - az, cx - ax, cy - ay, cz - az
        nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
        area += 0.5 * (nx * nx + ny * ny + nz * nz) ** 0.5
        vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6
    return area, abs(vol)


def estimativa(peca, caminho):
    area, vol = stl_area_volume(caminho)
    casca = min(area * 1.2, vol)
    g = (casca + (vol - casca) * INFILL.get(peca[:3], 0.20)) * 1.27 / 1000
    return g, g / 18.0, g / 9.0


# ------------------------------------------------------------------ downloads
def preparar_arquivos():
    shutil.rmtree(ARQ, ignore_errors=True)
    os.makedirs(os.path.join(ARQ, "pecas"))
    fontes = sorted(glob.glob(os.path.join(IMPRESSAO, "P*.stl")) + glob.glob(os.path.join(IMPRESSAO, "P*.3mf")))
    for f in fontes:
        shutil.copy2(f, os.path.join(ARQ, "pecas", os.path.basename(f)))
    with zipfile.ZipFile(os.path.join(ARQ, "pecas_para_imprimir.zip"), "w", zipfile.ZIP_DEFLATED) as z:
        for f in fontes:
            z.write(f, os.path.join("pecas_para_imprimir", os.path.basename(f)))
    with zipfile.ZipFile(os.path.join(ARQ, "cad_freecad.zip"), "w", zipfile.ZIP_DEFLATED) as z:
        for rel in ("cad/IoT3D_v3.FCStd", "cad/montagem/IoT3D_v3_montagem.FCStd",
                    "cad/montagem/abrir_montagem.FCMacro", "cad/furos_tubo_v3.txt"):
            z.write(os.path.join(RAIZ, rel), os.path.join("cad_freecad", rel.replace("cad/", "")))
        for f in sorted(glob.glob(os.path.join(RAIZ, "cad", "montagem", "texturas", "*"))):
            z.write(f, os.path.join("cad_freecad", "montagem", "texturas", os.path.basename(f)))
        for f in ("gerar_v3.py", "montagem_v3.py", "exportar_para_impressao.py", "exportar_dados_montagem.py",
                  "orcamento_impressao.py", "texturas_montagem.py"):
            p = os.path.join(RAIZ, "cad", "scripts", f)
            if os.path.exists(p):                         # comentários com o comando do FreeCAD, sem ferramentas locais
                txt = re.sub(r"[\w./-]*/scripts/fc\.sh", "freecadcmd", open(p, encoding="utf-8").read())
                z.writestr(os.path.join("cad_freecad", "scripts", f), txt)
    step = os.path.join(ARQ, "alimentador_v3.step")
    if os.path.exists(FC):
        script = os.path.join(SITE, "ferramentas", "_exportar_step.py")
        open(script, "w").write(
            "import FreeCAD as App, Import\n"
            "d = App.openDocument(%r)\n"
            "Import.export([o for o in d.Objects if o.Label[:1] in 'PR'], %r)\n" % (
                os.path.join(RAIZ, "cad", "IoT3D_v3.FCStd"), step))
        subprocess.run([FC, script], capture_output=True)
        os.remove(script)
    tam = {}
    for f in ("pecas_para_imprimir.zip", "cad_freecad.zip", "alimentador_v3.step"):
        p = os.path.join(ARQ, f)
        tam[f] = round(os.path.getsize(p) / 1e6, 1) if os.path.exists(p) else None
    return tam


# ------------------------------------------------------------------ dados
def dados(tam):
    comp, passo, mont, orc, readme = (ler("docs/componentes.md"), ler("docs/passo_a_passo.md"), ler("docs/montagem.md"),
                                      ler("docs/orcamento.md"), ler("specs/README.md"))
    obs = {c[0][:3]: c[4] for c in tabela_md(comp, "Peça | Arquivo")}
    pecas = []
    for stl in sorted(glob.glob(os.path.join(IMPRESSAO, "P*.stl"))):
        base = os.path.splitext(os.path.basename(stl))[0]
        cod, lado = base[:3], base.split("_")[-1]
        nome = NOMES.get(cod, base) + (" " + lado if cod in ("P12", "P13") and lado in LADO else "")
        g, h1, h2 = estimativa(base, stl)
        pecas.append({"arq": base, "cod": cod, "nome": nome, "sub": LADO.get(lado, "") if cod in ("P12", "P13") else "",
                      "grupo": GRUPO.get(cod, "Estrutura"), "g": round(g), "h": round(h1, 1), "h2": round(h2, 1),
                      "obs": inline(obs.get(cod, "")), "mf3": os.path.exists(stl[:-4] + ".3mf"),
                      "img": "img/pecas/%s.png" % base})
    cats = {"E": "Eletrônica", "M": "Mecânica", "P": "Parafusos", "C": "Consumíveis"}
    bom = [{"id": c[0], "cat": cats.get(c[0][:1], "Outros"), "item": inline(c[1]), "spec": inline(c[2]),
            "usa": inline(c[3]), "comprar": inline(c[4])} for c in tabela_md(comp, "# | Item")]
    det = [{"titulo": re.sub(r"^\d+\.\s*", "", t), "html": md(b)} for t, b in secoes(comp)
           if not t.startswith(("0.", "6.", "7."))]
    fases = []
    for t, b in secoes(passo):
        m = re.match(r"Fase (\d+)\s+[—-]\s+(.*?)(?:\s+\((.+)\))?$", t)
        if m:
            fases.append({"num": int(m.group(1)), "titulo": m.group(2), "dur": m.group(3) or "", "html": md(b),
                          "itens": itens_fase(b) if int(m.group(1)) > 0 else []})
    uso = [{"titulo": re.sub(r"^\d+\.\s*", "", t), "html": md(b)} for t, b in secoes(mont)
           if t.split(".")[0] in ("7", "8", "9", "10", "11")]
    ligacoes = [{"titulo": re.sub(r"^\d+(\.\d+)?\s*", "", t), "html": md(b)} for t, b in secoes(mont, "### ")
                if t.startswith("12.")]
    decisoes = []
    for c in tabela_md(readme, "ID | Decisão"):
        if c[0].startswith("D") and "~~" not in c[1]:
            decisoes.append({"id": c[0], "decisao": inline(c[1]), "motivo": inline(re.sub(r"\(\d\d-[a-z]+.*?\)", "", c[2]))})
    decisoes.sort(key=lambda d: int(d["id"][1:]))
    dem = {}
    p = os.path.join(RAIZ, "docs", "estudos", "chapeu", "resumo_dem.json")
    if os.path.exists(p):
        r = json.load(open(p))
        for d in (10, 20):
            dem[str(d)] = [{"id": k, "nome": n, "torque": round(r[k + "_d%d" % d]["mediana"], 2),
                            "gpv": round(r[k + "_d%d" % d]["gpv"], 1), "trava": round(100 * r[k + "_d%d" % d]["frac_trava"])}
                           for k, n in VARIANTES_DEM if k + "_d%d" % d in r]
    total_orc = re.search(r"\*\*Total\*\* \| \| \| \*\*~([\d–]+)\*\*", orc)
    media = re.search(r"faixa\nmédia \(~R\$ (\d+)\)|faixa média \(~R\$ (\d+)\)", orc)
    fichas = {k: {"nome": v[0], "func": v[1], "mat": v[2]} for k, v in FICHAS.items()}
    gramas = {p_["arq"]: p_["g"] for p_ in pecas}
    return {"pecas": pecas, "bom": bom, "bomDet": det, "fases": fases, "uso": uso, "ligacoes": ligacoes,
            "glb": "modelo/alimentador.min.glb", "decisoes": decisoes, "dem": dem, "fichas": fichas, "gramas": gramas, "tam": tam,
            "totalG": sum(p_["g"] for p_ in pecas), "totalH": round(sum(p_["h"] for p_ in pecas)),
            "orcFaixa": total_orc.group(1) if total_orc else "", "orcMedia": next((g for g in media.groups() if g), "") if media else ""}


if __name__ == "__main__":
    tam = preparar_arquivos()
    d = dados(tam)
    modelo = open(os.path.join(SITE, "modelo.html"), encoding="utf-8").read()
    js = json.dumps(d, ensure_ascii=False).replace("</", "<\\/")
    pagina = modelo.replace("%%DADOS%%", js)
    def versao(m):
        p = os.path.join(SITE, m.group(1))
        return m.group(1) + ("?v=%d" % int(os.path.getmtime(p)) if os.path.exists(p) else "")
    pagina = re.sub(r"(img/[\w/.-]+\.png)(?!\?v=)", versao, pagina)
    pagina = re.sub(r"(modelo/[\w/.-]+\.glb)", versao, pagina)
    for f in ("estilo.css", "app.js"):                      # versão no link: o navegador nunca usa arquivo velho
        pagina = pagina.replace('"%s"' % f, '"%s?v=%d"' % (f, int(os.path.getmtime(os.path.join(SITE, f)))))
    for k in ("totalG", "totalH", "orcMedia", "orcFaixa"):
        pagina = pagina.replace("%%" + k + "%%", str(d[k]))
    open(os.path.join(SITE, "index.html"), "w", encoding="utf-8").write(pagina)
    print("site gerado: %d peças, %d itens de compra, %d fases, %d decisões; %s" % (
        len(d["pecas"]), len(d["bom"]), len(d["fases"]), len(d["decisoes"]),
        ", ".join("%s %s MB" % (k, v) for k, v in tam.items() if v)))
