#!/usr/bin/env bash
# Abre uma instância do FreeCAD com interface por alguns segundos para gravar visibilidade/cores no .FCStd.
# Uso (da raiz do projeto): cad/scripts/preparar_visual.sh [arquivo.FCStd]
set -euo pipefail
FCSTD="$(cd "$(dirname "${1:-cad/IoT3D_v3.FCStd}")" && pwd)/$(basename "${1:-cad/IoT3D_v3.FCStd}")"
LOG="$(mktemp)"
export FCSTD LOG
/Applications/FreeCAD.app/Contents/MacOS/FreeCAD "$(cd "$(dirname "$0")" && pwd)/preparar_visual.py" >/dev/null 2>&1 &
PID=$!
for _ in $(seq 1 90); do [ -s "$LOG" ] && break; sleep 1; done
kill "$PID" 2>/dev/null || true
cat "$LOG"; rm -f "$LOG"
