'use strict'

// Forma da janela no Linux: a ilha mais uma folga para a sombra, recortada nos
// limites da janela. Tudo em DIP, a mesma unidade de setShape: converter para
// pixels fisicos deslocava o recorte com escala fracionaria (a pilula sumia nos
// cantos de baixo e saia cortada na lateral direita).
function shapeRect (islandRect, bounds, pad) {
  const x = Math.max(0, Math.floor(islandRect.x - pad))
  const y = Math.max(0, Math.floor(islandRect.y - pad))
  const right = Math.min(bounds.width, Math.ceil(islandRect.x + islandRect.w + pad))
  const bottom = Math.min(bounds.height, Math.ceil(islandRect.y + islandRect.h + pad))
  return { x, y, width: right - x, height: bottom - y }
}

// O gerenciador de janelas do Linux nao deixa a janela comecar fora da tela.
// Presa numa lateral, a janela (500 px) passaria da borda pela folga da sombra;
// aqui ela e empurrada para dentro e a folga ate a borda diminui na mesma medida,
// para a ilha continuar colada onde foi solta.
function fitInside (x, width, areaX, areaWidth, inset) {
  const fitted = Math.max(areaX, Math.min(areaX + areaWidth - width, x))
  return { x: fitted, pad: Math.max(0, inset - Math.abs(fitted - x)) }
}

module.exports = { shapeRect, fitInside }
