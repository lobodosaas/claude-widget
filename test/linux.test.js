'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { shapeRect, fitInside } = require('../lib/shape')

// ---------------------------------------------------------------- forma da janela

const BOUNDS = { width: 500, height: 660 }
const PILL = { x: 132, y: 0, w: 235, h: 38 }

test('forma: a ilha com a folga, em DIP', () => {
  assert.deepEqual(shapeRect(PILL, BOUNDS, 16), { x: 116, y: 0, width: 267, height: 54 })
})

test('forma: cobre a ilha inteira com coordenadas fracionarias', () => {
  const r = shapeRect({ x: 132.7, y: 597.3, w: 235.4, h: 38.2 }, BOUNDS, 16)
  assert.ok(r.x <= 132.7 && r.y <= 597.3)
  assert.ok(r.x + r.width >= 132.7 + 235.4 && r.y + r.height >= 597.3 + 38.2)
})

test('forma: pilula presa embaixo continua dentro do recorte', () => {
  // y = 660 - 24 - 38: antes, com escala 1.09, o recorte descia 55 px e a pilula sumia
  const r = shapeRect({ x: 24, y: 598, w: 213, h: 38 }, BOUNDS, 16)
  assert.deepEqual(r, { x: 8, y: 582, width: 245, height: 70 })
})

test('forma: nao passa dos limites da janela nem fica negativa', () => {
  const r = shapeRect({ x: 4, y: 640, w: 492, h: 40 }, BOUNDS, 16)
  assert.equal(r.x, 0)
  assert.equal(r.y, 624)
  assert.equal(r.x + r.width, BOUNDS.width)
  assert.equal(r.y + r.height, BOUNDS.height)
})

test('forma: janela encolhida do arrasto (pilula em INSET, 0)', () => {
  assert.deepEqual(shapeRect({ x: 24, y: 0, w: 235, h: 38 }, { width: 283, height: 62 }, 16),
    { x: 8, y: 0, width: 267, height: 54 })
})

// ---------------------------------------------------------------- janela dentro da tela

test('lateral esquerda: janela empurrada para dentro, ilha continua colada', () => {
  // dock em x=6: a janela comecaria em 6 - 24 = -18
  assert.deepEqual(fitInside(-18, 500, 0, 1756, 24), { x: 0, pad: 6 })
})

test('lateral direita: idem do outro lado', () => {
  // dock em x=1750: janela de 1274 a 1774, tela ate 1756
  assert.deepEqual(fitInside(1274, 500, 0, 1756, 24), { x: 1256, pad: 6 })
})

test('janela que ja cabe nao mexe', () => {
  assert.deepEqual(fitInside(628, 500, 0, 1756, 24), { x: 628, pad: 24 })
})

test('segundo monitor: respeita o x da area', () => {
  assert.deepEqual(fitInside(1756 - 18, 500, 1756, 1756, 24), { x: 1756, pad: 6 })
})

test('empurrao maior que a folga nao deixa folga negativa', () => {
  assert.deepEqual(fitInside(-100, 500, 0, 1756, 24), { x: 0, pad: 0 })
})

// ---------------------------------------------------------------- autostart

// O modulo decide o caminho ao carregar: XDG_CONFIG_HOME isolado antes do require.
function freshAutostart (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-autostart-'))
  const saved = { xdg: process.env.XDG_CONFIG_HOME, appimage: process.env.APPIMAGE }
  process.env.XDG_CONFIG_HOME = dir
  delete process.env.APPIMAGE
  delete require.cache[require.resolve('../lib/autostart')]
  const autostart = require('../lib/autostart')
  t.after(() => {
    for (const [k, env] of [['xdg', 'XDG_CONFIG_HOME'], ['appimage', 'APPIMAGE']]) {
      if (saved[k] === undefined) delete process.env[env]
      else process.env[env] = saved[k]
    }
    delete require.cache[require.resolve('../lib/autostart')]
    fs.rmSync(dir, { recursive: true, force: true })
  })
  return { autostart, dir }
}

const execLine = file => fs.readFileSync(file, 'utf8').split('\n').find(l => l.startsWith('Exec='))

test('autostart linux: liga, reflete o arquivo e desliga', { skip: process.platform !== 'linux' }, t => {
  const { autostart, dir } = freshAutostart(t)
  assert.equal(autostart.LINK, path.join(dir, 'autostart', 'claude-widget.desktop'))
  assert.equal(autostart.isOn(), false)

  assert.equal(autostart.set(null, true, '/opt/electron/electron', '/home/u/app'), true)
  assert.equal(autostart.isOn(), true)
  const body = fs.readFileSync(autostart.LINK, 'utf8')
  assert.match(body, /^\[Desktop Entry\]\n/)
  assert.match(body, /\nType=Application\n/)
  assert.equal(execLine(autostart.LINK), 'Exec="/opt/electron/electron" "/home/u/app" --ozone-platform=x11')

  autostart.set(null, false)
  assert.equal(autostart.isOn(), false)
  // Desligar de novo, sem arquivo, nao quebra.
  assert.equal(autostart.set(null, false), true)
})

test('autostart linux: no AppImage aponta para o arquivo .AppImage', { skip: process.platform !== 'linux' }, t => {
  const { autostart } = freshAutostart(t)
  process.env.APPIMAGE = '/home/u/Applications/Claude-Widget.AppImage'
  autostart.set(null, true, '/tmp/.mount_abc/claude-widget', '/tmp/.mount_abc/resources/app.asar')
  assert.equal(execLine(autostart.LINK), 'Exec="/home/u/Applications/Claude-Widget.AppImage" --ozone-platform=x11')
})

test('autostart linux: escapa aspas, $, crase e barra no caminho', { skip: process.platform !== 'linux' }, t => {
  const { autostart } = freshAutostart(t)
  autostart.set(null, true, '/home/u/my "apps"/$x`y`\\electron', '/home/u/app')
  assert.equal(execLine(autostart.LINK), 'Exec="/home/u/my \\"apps\\"/\\$x\\`y\\`\\\\electron" "/home/u/app" --ozone-platform=x11')
})
