#!/usr/bin/env bash
# Instala o AppImage gerado por `npm run dist:linux` para o usuario atual:
#   - copia para ~/Applications/Claude-Widget.AppImage
#   - cria a entrada no menu de aplicativos
#   - no KDE, cria uma regra do KWin que tira a ilha da barra de tarefas,
#     do pager e do Alt+Tab (o Electron nao implementa skipTaskbar no Linux)
# Uso: tools/install-linux.sh [caminho/do/AppImage]
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
SRC=${1:-$(ls -t "$ROOT"/release/Claude-Widget-*.AppImage 2>/dev/null | head -1)}
[ -f "$SRC" ] || { echo "AppImage nao encontrado. Rode: npm run dist:linux" >&2; exit 1; }

APPDIR=$HOME/Applications
DEST=$APPDIR/Claude-Widget.AppImage
ICON_DIR=${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/256x256/apps
DESKTOP=${XDG_DATA_HOME:-$HOME/.local/share}/applications/claude-widget.desktop

mkdir -p "$APPDIR" "$ICON_DIR" "$(dirname "$DESKTOP")"
install -m 755 "$SRC" "$DEST"
install -m 644 "$ROOT/assets/icon.png" "$ICON_DIR/claude-widget.png"

cat > "$DESKTOP" <<EOF
[Desktop Entry]
Type=Application
Name=Claude Widget
Comment=Ilha com o consumo de Claude Code, Codex e outras IAs
Exec="$DEST" --ozone-platform=x11
Icon=claude-widget
Terminal=false
Categories=Utility;
StartupWMClass=claude-widget
EOF

# Inicia com o sistema por padrao (desliga em "Iniciar com o sistema" na bandeja).
AUTOSTART=${XDG_CONFIG_HOME:-$HOME/.config}/autostart/claude-widget.desktop
mkdir -p "$(dirname "$AUTOSTART")"
cat > "$AUTOSTART" <<EOF
[Desktop Entry]
Type=Application
Name=Claude Widget
Comment=Consumo da conta Claude Code
Exec="$DEST" --ozone-platform=x11
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

if command -v kwriteconfig6 >/dev/null && command -v kreadconfig6 >/dev/null; then
  RULE=claude-widget-island
  ORDER=$(kreadconfig6 --file kwinrulesrc --group General --key Order)
  case ",$ORDER," in
    *",$RULE,"*) ;;
    *) kwriteconfig6 --file kwinrulesrc --group General --key Order "${ORDER:+$ORDER,}$RULE" ;;
  esac
  w() { kwriteconfig6 --file kwinrulesrc --group "$RULE" --key "$1" "$2"; }
  w Description 'Claude Widget: fora da barra de tarefas'
  w wmclass claude-widget
  w wmclassmatch 1
  w skiptaskbar true
  w skiptaskbarrule 2
  w skippager true
  w skippagerrule 2
  w skipswitcher true
  w skipswitcherrule 2
  qdbus6 org.kde.KWin /KWin reconfigure >/dev/null 2>&1 || true
fi

echo "Instalado em $DEST"
