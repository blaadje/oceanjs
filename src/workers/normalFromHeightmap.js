import { normalize } from '../utils'

export const normalFromHeightmap = (size, heightmap) => {
  const canvas = new OffscreenCanvas(size, size)
  const context = canvas.getContext('2d', { alpha: false })
  const imageData = context.createImageData(size, size)

  const heightmapData = new Int32Array(heightmap.data.buffer)
  const data = new Int32Array(imageData.data.buffer)
  const max = size - 1

  const getHeightmap = (x, y) => {
    return {
      r: heightmapData[x + size * y] & 255,
      g: (heightmapData[x + size * y] >> 8) & 255,
      b: (heightmapData[x + size * y] >> 16) & 255,
    }
  }

  const intensity = ({ r, g, b }) => {
    const average = (r + g + b) / 3

    return average / 255
  }

  const pStrength = 1

  for (let y = 0; y <= max; y++) {
    for (let x = 0; x <= max; x++) {
      const topLeft = getHeightmap(x - 1, y - 1)
      const top = getHeightmap(x, y - 1)
      const topRight = getHeightmap(x + 1, y - 1)
      const left = getHeightmap(x - 1, y)
      const right = getHeightmap(x + 1, y)
      const bottomLeft = getHeightmap(x - 1, y + 1)
      const bottomRight = getHeightmap(x + 1, y + 1)
      const bottom = getHeightmap(x, y + 1)

      const tl = intensity(topLeft)
      const t = intensity(top)
      const tr = intensity(topRight)
      const r = intensity(right)
      const br = intensity(bottomRight)
      const b = intensity(bottom)
      const bl = intensity(bottomLeft)
      const l = intensity(left)

      const dX = tr + 2 * r + br - (tl + 2 * l + bl)
      const dY = bl + 2 * b + br - (tl + 2 * t + tr)
      const dZ = 1 / pStrength

      const u = normalize(dX, [-1, 1], [0, 255])
      const i = normalize(dY, [-1, 1], [0, 255])
      const o = normalize(dZ, [-1, 1], [0, 255])

      data[x + size * y] =
        (u & 255) | // red
        (i << 8) | // green
        (o << 16) | // blue
        (255 << 24) // alpha
    }
  }

  context.putImageData(imageData, 0, 0)

  return canvas
}
