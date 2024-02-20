import * as Comlink from 'comlink'

const blendedTexture = ({ texture1, texture2 } = {}) => {
  const canvas = new OffscreenCanvas(255, 255)
  const context = canvas.getContext('2d')

  context.drawImage(texture1, 0, 0)
  context.globalCompositeOperation = 'overlay'
  context.drawImage(texture2, 0, 0)

  const result = canvas.transferToImageBitmap()

  return Comlink.transfer(result, [result])
}

Comlink.expose(Comlink.proxy(blendedTexture))
