import * as Comlink from 'comlink'
import { normalize } from '../../utils'

const { sqrt, pow } = Math

const clamp = (x, min, max) => {
  if (x < min) return min
  if (x > max) return max - 1
  return x
}

const reflectionTexture = ({ texture, normals, options } = {}) => {
  const { specularity, lx, lz, ly, shiny } = options
  const size = normals.width
  const canvas = new OffscreenCanvas(size, size)
  const context = canvas.getContext('2d', { alpha: false })
  canvas.height = size
  canvas.width = size
  const imageData = context.createImageData(size, size)
  const textureData = new Int32Array(texture.data.buffer)
  const normalData = new Int32Array(normals.data.buffer)
  const data = new Int32Array(imageData.data.buffer)
  const max = size - 1

  const getTexture = (x, y) => {
    return {
      r: textureData[x + size * y] & 255,
      g: (textureData[x + size * y] >> 8) & 255,
      b: (textureData[x + size * y] >> 16) & 255,
      a: (textureData[x + size * y] >> 24) & 255,
    }
  }
  const getNormal = (x, y) => {
    return {
      r: normalData[x + size * y] & 255,
      g: (normalData[x + size * y] >> 8) & 255,
      b: (normalData[x + size * y] >> 16) & 255,
      a: (normalData[x + size * y] >> 24) & 255,
    }
  }

  const set = (x, y, { r, g, b, a = 255 }) => {
    data[x + size * y] =
      r | // red
      (g << 8) | // green
      (b << 16) | // blue
      (a << 24) // alpha
  }

  let ni = 0
  let dx = 0
  let dy = 0
  let dz = 0

  for (let y = 0; y <= max; y++) {
    for (let x = 0; x <= max; x++) {
      const { r, g, b } = getNormal(x, y)

      const nx = normalize(r)
      const ny = normalize(g)
      const nz = normalize(b)

      // make it a bit faster by only updateing the direction
      // for every other pixel
      if (shiny > 0 || (ni & 1) == 0) {
        // calculate the light direction vector
        dx = lx - x
        dy = ly - y
        dz = lz

        // normalize it
        const magInv = 1 / sqrt(dx * dx + dy * dy + dz * dz)
        dx *= magInv
        dy *= magInv
        dz *= magInv
      }

      // take the dot product of the direction and the normal
      // to get the amount of specularity
      const dot = dx * nx + dy * ny + dz * nz

      // spec + ambient
      const specProduct = pow(dot, 10) * specularity
      const shinyProduct = pow(dot, 400) * shiny
      const intensity = specProduct + shinyProduct + 0.5

      set(x, y, {
        r: clamp(getTexture(x, y).r * intensity, 0, 255),
        g: clamp(getTexture(x, y).g * intensity, 0, 255),
        b: clamp(getTexture(x, y).b * intensity, 0, 255),
      })

      ni += 3
    }
  }

  context.putImageData(imageData, 0, 0)

  const bitmap = canvas.transferToImageBitmap()

  return Comlink.transfer(bitmap, [bitmap])

  // return Comlink.transfer(imageData, [imageData.data.buffer])
}

Comlink.expose(Comlink.proxy(reflectionTexture))
