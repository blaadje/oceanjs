export const reflection = (
  normalsData,
  textureData,
  options,
  width,
  height,
) => {
  const { pow, sqrt } = Math

  const clamp = (x, min, max) => {
    if (x < min) return min
    if (x > max) return max - 1
    return x
  }

  const normalize = (
    number,
    [min, max] = [0, 255],
    [newMin, newMax] = [0, 1],
  ) => {
    const a = (newMax - newMin) / (max - min)
    const b = newMax - a * max

    return a * number + b
  }

  const { specularity, lx, lz, ly, shiny } = options

  const Int32textureData = new Int32Array(textureData.buffer)
  const Int32normalData = new Int32Array(normalsData.buffer)
  const widthMax = width - 1
  const heightMax = height - 1

  let dx = 0
  let dy = 0
  let dz = 0
  let x, y

  for (y = 0; y <= heightMax; y++) {
    for (x = 0; x <= widthMax; x++) {
      const r = Int32normalData[x + width * y] & 255
      const g = (Int32normalData[x + width * y] >> 8) & 255
      const b = (Int32normalData[x + width * y] >> 16) & 255
      const nx = normalize(r)
      const ny = normalize(g)
      const nz = normalize(b)

      if (shiny > 0) {
        dx = lx - x
        dy = ly - y
        dz = lz

        const magInv = 1 / sqrt(dx * dx + dy * dy + dz * dz)
        dx *= magInv
        dy *= magInv
        dz *= magInv
      }

      const dot = dx * nx + dy * ny + dz * nz

      const intensity = pow(dot, 10) * specularity + pow(dot, 400) * shiny + 0.5

      Int32normalData[x + width * y] =
        clamp((Int32textureData[x + width * y] & 255) * intensity, 0, 255) | // red
        (clamp(
          ((Int32textureData[x + width * y] >> 8) & 255) * intensity,
          0,
          255,
        ) <<
          8) | // green
        (clamp(
          ((Int32textureData[x + width * y] >> 16) & 255) * intensity,
          0,
          255,
        ) <<
          16) | // blue
        (255 << 24) // alpha
    }
  }

  return normalsData
}
