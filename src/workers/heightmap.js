import { normalize } from '../utils'

const { cos, sin, sqrt } = Math

export const heightmap = ({
  size,
  time = 0.1,
  distance = 1.3,
  amplitude = 0.5,
}) => {
  const canvas = new OffscreenCanvas(size, size)
  const context = canvas.getContext('2d', { alpha: false })
  const imageData = context.createImageData(size, size)
  const data = new Uint32Array(imageData.data.buffer)
  const max = size - 1

  for (let y = 0; y <= max; y++) {
    for (let x = 0; x <= max; x++) {
      const pixelX = normalize(x)
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

      data[x + size * y] =
        ((sin(1 * color) * 255) & 255) | // red
        ((sin(1 * color) * 255) << 8) | // green
        ((sin(1 * color) * 255) << 16) | // blue
        (255 << 24) // alpha
    }
  }

  return imageData
}
