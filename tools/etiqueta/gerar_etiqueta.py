"""Gera a etiqueta do alimentador para imprimir e colar (D21, D24).

A etiqueta tem dois QR codes que a câmera do celular lê direto:
  1. Wi-Fi: conecta na rede de configuração "Alimentador-xxxxxx" (senha PORTAL_PASS);
  2. App: abre o app já com o código de pareamento pf-xxxxxx-segredo preenchido.

As senhas vêm de firmware/include/secrets.h. A saída (tools/etiqueta/saida/) fica fora do git:
quem tem a etiqueta controla o alimentador.

Uso (na raiz do projeto):
  uv run --with segno python tools/etiqueta/gerar_etiqueta.py --id pf-a1b2c3

O device_id (pf-xxxxxx) aparece no portal de configuração e no log serial ("[net] device_id ...").
"""
import argparse
import html
import pathlib
import re
import shutil
import subprocess
import sys

import segno
from segno import helpers as segno_helpers

ROOT = pathlib.Path(__file__).resolve().parents[2]
SECRETS = ROOT / "firmware/include/secrets.h"
OUT = ROOT / "tools/etiqueta/saida"
APP_URL = "https://igorpdsantos.github.io/alimentador-pet-iot/app/"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

LOGO = ("<svg viewBox='0 0 512 512' aria-hidden='true'><rect width='512' height='512' rx='112' fill='#0d6b5f'/>"
        "<g fill='#f6f3ee'><ellipse cx='190' cy='168' rx='38' ry='48'/><ellipse cx='322' cy='168' rx='38' ry='48'/>"
        "<ellipse cx='118' cy='262' rx='34' ry='42'/><ellipse cx='394' cy='262' rx='34' ry='42'/>"
        "<path d='M256 236c-62 0-104 78-104 118 0 38 40 50 104 50s104-12 104-50c0-40-42-118-104-118z'/></g></svg>")


def read_define(text: str, name: str) -> str:
    m = re.search(rf'#define\s+{name}\s+"([^"]*)"', text)
    if not m:
        sys.exit(f"{name} não encontrado em {SECRETS}")
    return m.group(1)


def qr_svg(qr: segno.QRCode) -> str:
    return qr.svg_inline(scale=1, border=0, dark="#1f2421", omitsize=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--id", required=True, help="device_id do alimentador, ex.: pf-a1b2c3")
    args = ap.parse_args()
    device_id = args.id.strip().lower()
    if not re.fullmatch(r"pf-[a-z0-9]{3,12}", device_id):
        sys.exit("O --id tem o formato pf-xxxxxx")

    secrets_h = SECRETS.read_text()
    secret = read_define(secrets_h, "PAIR_SECRET")
    portal_pass = read_define(secrets_h, "PORTAL_PASS")
    if "troque" in secret or "troque" in portal_pass:
        sys.exit("Preencha PAIR_SECRET e PORTAL_PASS em firmware/include/secrets.h antes de gerar a etiqueta")

    code = f"{device_id}-{secret}"
    ssid = f"Alimentador-{device_id[3:]}"
    wifi_qr = segno.make(segno_helpers.make_wifi_data(ssid=ssid, password=portal_pass, security="WPA"), error="m")
    app_qr = segno.make(f"{APP_URL}#codigo={code}", error="m")

    e = html.escape
    page = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Etiqueta {e(device_id)}</title>
<style>
@page {{ size: A4; margin: 15mm; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; font: 9pt/1.3 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #1f2421;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
.instr {{ font-size: 10pt; color: #5b625d; margin: 0 0 6mm; }}
.label {{ width: 95mm; height: 64mm; border: 0.3mm dashed #9aa19d; border-radius: 3mm; padding: 4mm;
  display: flex; flex-direction: column; gap: 2.5mm; }}
.top {{ display: flex; align-items: center; gap: 2.5mm; }}
.top svg {{ width: 8mm; height: 8mm; flex: none; }}
.top b {{ font-size: 11pt; }}
.top span {{ margin-left: auto; font: 600 9pt ui-monospace, Menlo, monospace; color: #0d6b5f; }}
.cols {{ display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; flex: 1; }}
.col {{ display: flex; flex-direction: column; align-items: center; gap: 1.2mm; text-align: center; }}
.col svg {{ width: 24mm; height: 24mm; }}
.step {{ font-weight: 700; font-size: 8.5pt; }}
.kv {{ font-size: 7.5pt; color: #5b625d; line-height: 1.25; }}
.kv code {{ font: 600 7.5pt ui-monospace, Menlo, monospace; color: #1f2421; word-break: break-all; }}
.foot {{ font-size: 6.5pt; color: #5b625d; text-align: center; }}
@media print {{ .instr {{ display: none; }} }}
</style></head><body>
<p class="instr">Imprima em tamanho real (100%, sem "ajustar à página"), recorte na linha tracejada e cole no
alimentador. Guarde uma cópia: quem tem esta etiqueta controla o alimentador.</p>
<div class="label">
  <div class="top">{LOGO}<b>Alimentador de Pet</b><span>{e(device_id)}</span></div>
  <div class="cols">
    <div class="col">
      {qr_svg(wifi_qr)}
      <div class="step">1. Configurar o Wi-Fi</div>
      <div class="kv">Rede <code>{e(ssid)}</code><br>Senha <code>{e(portal_pass)}</code></div>
    </div>
    <div class="col">
      {qr_svg(app_qr)}
      <div class="step">2. Abrir o app</div>
      <div class="kv">Código<br><code>{e(code)}</code></div>
    </div>
  </div>
  <div class="foot">Aponte a câmera do celular. Não divulgue: o código dá acesso ao alimentador.</div>
</div>
</body></html>
"""
    OUT.mkdir(parents=True, exist_ok=True)
    html_path = OUT / f"etiqueta-{device_id}.html"
    html_path.write_text(page)
    print(f"HTML: {html_path}")

    chrome = CHROME if pathlib.Path(CHROME).exists() else shutil.which("google-chrome") or shutil.which("chromium")
    if chrome:
        pdf_path = OUT / f"etiqueta-{device_id}.pdf"
        subprocess.run([chrome, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                        f"--print-to-pdf={pdf_path}", html_path.as_uri()],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"PDF:  {pdf_path}")
    else:
        print("Chrome não encontrado: abra o HTML no navegador e imprima.")


if __name__ == "__main__":
    main()
