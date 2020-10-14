import * as Comlink from 'comlink'
import { normalize } from '../../utils'

const canvas = new OffscreenCanvas(255, 255)
const context = canvas.getContext('2d', { alpha: false })

const normalMapFromHeightmap = (heightmap) => {
  const size = 255
  context.clearRect(0, 0, size, size)
  canvas.height = size
  canvas.width = size
  const imageData = context.createImageData(size, size)
  const max = size - 1

  const getHeightmap = (x, y) => {
    if (y > max * 4 || x > max * 4) {
      return {
        r: max,
        g: max,
        b: max,
        a: max,
      }
    }

    if (x < 0 || y < 0) {
      return {
        r: 0,
        g: 0,
        b: 0,
        a: 0,
      }
    }

    return {
      r: heightmap.data[x + size * 4 * y],
      g: heightmap.data[x + 1 + size * 4 * y],
      b: heightmap.data[x + 2 + size * 4 * y],
      a: heightmap.data[x + 3 + size * 4 * y],
    }
  }

  const set = (x, y, { r, g, b, a = 255 }) => {
    imageData.data[x + size * 4 * y] = r
    imageData.data[x + 1 + size * 4 * y] = g
    imageData.data[x + 2 + size * 4 * y] = b
    imageData.data[x + 3 + size * 4 * y] = a
  }

  const intensity = ({ r, g, b }) => {
    const average = (r + g + b) / 3

    return average / 255
  }

  const pStrength = 1

  for (let y = 0; y <= max; y += 1) {
    for (let x = 0; x <= size * 4; x += 4) {
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

      set(x, y, {
        r: u,
        g: i,
        b: o,
      })
    }
  }

  return imageData
}

Comlink.expose(normalMapFromHeightmap)
