export const normalFromHeightmap = (heightmap, width, height) => {
  const normalize = (
    number,
    [min, max] = [0, 255],
    [newMin, newMax] = [0, 1],
  ) => {
    const a = (newMax - newMin) / (max - min)
    const b = newMax - a * max

    return a * number + b
  }

  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext('2d', { alpha: false })
  const imageData = context.createImageData(width, height)

  const heightmapData = new Int32Array(heightmap.buffer)
  const data = new Int32Array(imageData.data.buffer)
  const maxWidth = width - 1
  const maxHeight = height - 1

  const getHeightmap = (x, y) => {
    return {
      r: heightmapData[x + maxWidth * y] & 255,
      g: (heightmapData[x + maxWidth * y] >> 8) & 255,
      b: (heightmapData[x + maxWidth * y] >> 16) & 255,
    }
  }

  const intensity = ({ r, g, b }) => {
    const average = r + g + b

    return average / 80
  }

  const pStrength = 1

  for (let y = 0; y <= maxHeight; y++) {
    for (let x = 0; x <= maxWidth; x++) {
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

      data[x + maxWidth * y] =
        (u & 255) | // red
        (i << 8) | // green
        (o << 16) | // blue
        (255 << 24) // alpha
    }
  }

  return imageData.data
}