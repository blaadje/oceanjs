import * as Comlink from 'comlink'

const canvas = new OffscreenCanvas(255, 255)
const context = canvas.getContext('2d', { alpha: false })

const createTexture = (size, colors = [2, 54, 108]) => {
  context.clearRect(0, 0, size, size)
  canvas.height = size
  canvas.width = size
  const imageData = context.createImageData(size, size)

  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = colors[0]
    imageData.data[i + 1] = colors[1]
    imageData.data[i + 2] = colors[2]
    imageData.data[i + 3] = 255
  }

  return imageData
}

Comlink.expose(createTexture)
