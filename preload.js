'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// Linux: o main precisa saber se o pointer esta dentro da janela (ver
// pointer-in-window no main.js).
if (process.platform === 'linux') {
  window.addEventListener('mouseover', () => ipcRenderer.send('pointer-in-window', true))
  window.addEventListener('mouseout', e => { if (!e.relatedTarget) ipcRenderer.send('pointer-in-window', false) })
}

// Ponte minima. Os tokens ficam no processo principal; para ca so atravessam
// numeros, textos e uma severidade.
contextBridge.exposeInMainWorld('claudeWidget', {
  onState: cb => ipcRenderer.on('state', (_e, state) => cb(state)),
  refresh: id => ipcRenderer.send('refresh', id || null),
  hide: () => ipcRenderer.send('hide'),
  onHover: cb => ipcRenderer.on('hover', (_e, inside) => cb(inside)),
  reportRect: r => ipcRenderer.send('island-rect', r),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragEnd: () => ipcRenderer.send('drag-end'),
  toggleTokens: () => ipcRenderer.send('toggle-tokens'),
  setTokenDays: days => ipcRenderer.send('set-token-days', days),
  setSource: source => ipcRenderer.send('set-source', source)
})
