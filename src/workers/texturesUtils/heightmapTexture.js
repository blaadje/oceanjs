import * as Comlink from 'comlink'
import { normalize } from '../../utils'

const canvas = new OffscreenCanvas(255, 255)
const context = canvas.getContext('2d', { alpha: false })
const { cos, sin, sqrt } = Math

const heightmap = (time = 0.1) => {
  const size = 255
  context.clearRect(0, 0, size, size)
  canvas.height = size
  canvas.width = size
  const imageData = context.createImageData(size, size)
  const max = size - 1

  const set = (x, y, { r, g, b, a = 255 }) => {
    imageData.data[x + size * 4 * y] = r
    imageData.data[x + 1 + size * 4 * y] = g
    imageData.data[x + 2 + size * 4 * y] = b
    imageData.data[x + 3 + size * 4 * y] = a
  }

  let a = 0

  for (let y = 0; y <= max; y += 1) {
    for (let x = 0; x <= size * 4 - 1; x += 4) {
      const distance = 1.3
      const amplitude = 0.5
      const pixelX = normalize(a)
      const pixelY = normalize(y)

      const simpleSin = amplitude * sin(distance * (pixelX * 10 + time))
      const diagonalSin =
        amplitude * sin(distance * (pixelX * 10 + pixelY * 10 + time))
      const rotationSin =
        amplitude *
        sin(distance * (pixelX * sin(time / 2) + pixelY * cos(time / 3)) + time)

      const cx = pixelX * 0.5 + sin(time / 5)
      const cy = pixelY * 0.5 + cos(time / 3)
      const concentricSin =
        amplitude * sin(distance * sqrt(100 * (cx * cx + cy * cy) + 1) + time)

      const color =
        1 + (simpleSin + rotationSin + diagonalSin + concentricSin) / 2

      const colors = {
        r: sin(1 * color) * 255,
        b: sin(1 * color) * 255,
        g: sin(1 * color) * 255,
      }

      set(x, y, colors)
      a++
    }
    a = 0
  }

  return imageData
}

Comlink.expose(heightmap)
