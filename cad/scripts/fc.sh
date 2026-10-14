#!/usr/bin/env bash
# Roda um script Python dentro do FreeCAD sem GUI.
# Uso: fc.sh <script.py> [VAR=valor ...]   (parâmetros vão como variáveis de ambiente)
set -euo pipefail
FREECADCMD="${FREECADCMD:-/Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd}"
SCRIPT="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; shift
for kv in "$@"; do export "$kv"; done
export PYTHONIOENCODING=utf-8 LANG=en_US.UTF-8
"$FREECADCMD" -c "exec(open('$SCRIPT', encoding='utf-8').read())" 2>&1 | tr '\r\t' '\n\n' \
  | sed -E 's/\([0-9]+ %\)//g; s/(Importing project files|Postprocessing|Checking (topology|for self-intersections|indices)|saving|Recompute)\.+//g' \
  | grep -v -E '^(FreeCAD [0-9]|\(C\) 2001|FreeCAD is free and open-source|\s*$)' || true
