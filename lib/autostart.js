'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const LINUX = process.platform === 'linux'

const DIR = LINUX
  ? path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'autostart')
  : path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
const LINK = path.join(DIR, LINUX ? 'claude-widget.desktop' : 'Claude Widget.lnk')

function isOn () {
  return fs.existsSync(LINK)
}

// Aspas no padrao do Desktop Entry: so ", `, $ e \ precisam de escape.
function quote (s) {
  return `"${String(s).replace(/(["`$\\])/g, '\\$1')}"`
}

// AppImage: process.execPath aponta para o ponto de montagem temporario,
// que muda a cada abertura. O arquivo .AppImage em si vem em $APPIMAGE.
function linuxExec (exePath, appDir) {
  // A flag evita o relancamento para X11 (ver main.js).
  if (process.env.APPIMAGE) return `${quote(process.env.APPIMAGE)} --ozone-platform=x11`
  return `${quote(exePath)} ${quote(appDir)} --ozone-platform=x11`
}

// O estado e o proprio arquivo, nao uma preferencia guardada a parte:
// apagar o atalho pela mao do usuario tem que refletir no menu.
function set (shell, on, exePath, appDir) {
  if (on) {
    fs.mkdirSync(DIR, { recursive: true })
    if (LINUX) {
      fs.writeFileSync(LINK, [
        '[Desktop Entry]',
        'Type=Application',
        'Name=Claude Widget',
        'Comment=Consumo da conta Claude Code',
        `Exec=${linuxExec(exePath, appDir)}`,
        'Terminal=false',
        'X-GNOME-Autostart-enabled=true',
        ''
      ].join('\n'))
      return true
    }
    return shell.writeShortcutLink(LINK, 'create', {
      target: exePath,
      args: `"${appDir}"`,
      cwd: appDir,
      description: 'Consumo da conta Claude Code'
    })
  }
  if (fs.existsSync(LINK)) fs.unlinkSync(LINK)
  return true
}

module.exports = { isOn, set, DIR, LINK }
