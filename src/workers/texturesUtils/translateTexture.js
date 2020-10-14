import * as Comlink from 'comlink'

let t = 0

const translateTexture = ({ texture, speed = 0.4, direction } = {}) => {
  const size = texture.width
  const canvas = new OffscreenCanvas(size, size)
  const context = canvas.getContext('2d')
  const pattern = context.createPattern(texture, 'repeat')

  context.fillStyle = pattern
  if (direction === 'x') {
    context.setTransform(1, 0, 0, 1, 0, t)
    context.fillRect(0, -t, size, size)
  } else {
    context.setTransform(1, 0, 0, 1, t, 0)
    context.fillRect(-t, 0, size, size)
  }

  t += speed

  const result = canvas.transferToImageBitmap()

  return Comlink.transfer(result, [result])
}

Comlink.expose(Comlink.proxy(translateTexture))
