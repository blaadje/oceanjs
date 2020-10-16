import { normalize } from '../utils'
import { reflection } from './reflection'

let t = 0

const normalMapFromHeightmap = (heightmap) => {
  const canvas = new OffscreenCanvas(255, 255)
  const context = canvas.getContext('2d', { alpha: false })
  const size = 255
  context.clearRect(0, 0, size, size)
  canvas.height = size
  canvas.width = size
  const imageData = context.createImageData(size, size)
  const data = new Int32Array(imageData.data.buffer)
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

const blendedTexture = ({ texture1, texture2 } = {}) => {
  const canvas = new OffscreenCanvas(255, 255)
  const context = canvas.getContext('2d')

  context.drawImage(texture1, 0, 0)
  context.globalCompositeOperation = 'overlay'
  context.drawImage(texture2, 0, 0)

  return canvas
}

const translateTexture = ({ texture, speed = 0.1, direction = 'x' } = {}) => {
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

  return canvas
}

const pattern = (image, size = 512) => {
  const canvas = new OffscreenCanvas(size, size)
  const context = canvas.getContext('2d')

  const pattern = context.createPattern(image, 'repeat')

  context.fillStyle = pattern
  context.fillRect(0, 0, size, size)

  return canvas
}

const waveNormals = () => {
  // const normalmap = await textureWorkers.normalFromHeightmap(
  //   await textureWorkers.heightmap(time * speed),
  //   time * speed,
  // )
  // platform.terrainFromTexture(heightmap, 255)
}

const detailWaveNormals = (normal1Data, normal2Data) => {
  return blendedTexture({
    texture1: translateTexture({
      texture: normal1Data.resizedImage,
    }),
    texture2: translateTexture({
      texture: normal2Data.resizedImage,
      direction: 'y',
    }),
  })
}

// const workers = [
//   new Worker('worker.js', { type: 'module' }),
//   new Worker('worker.js', { type: 'module' }),
//   new Worker('worker.js', { type: 'module' }),
//   new Worker('worker.js', { type: 'module' }),
// ]

// const generateWorkers = () => {

// }

export const calculate = ({
  size,
  detailNormal1,
  detailNormal2,
  coloredTexture,
}) =>
  new Promise((resolve) => {
    const canvas = new OffscreenCanvas(size, size)
    const context = canvas.getContext('2d', { alpha: false })
    const imagePattern = pattern(
      detailWaveNormals(detailNormal1, detailNormal2),
      size,
    )

    const workersCount = workers.length
    let finished = 0
    const chunkSize = Math.round(size / workersCount)

    function onWorkEnded({ data }) {
      const { imageData, index, width, height } = data
      const result = new ImageData(imageData, width, height)

      context.putImageData(result, 0, chunkSize * index)

      finished++

      if (finished === workersCount) {
        resolve(canvas.transferToImageBitmap())
      }
    }

    let reversedIndex = workersCount

    for (let index = 0; index < workersCount; index++) {
      const worker = workers[index]
      worker.onmessage = onWorkEnded

      const imagePatternContext = imagePattern.getContext('2d')
      const normalsData = imagePatternContext.getImageData(
        0,
        chunkSize * index,
        size,
        chunkSize,
      )

      worker.postMessage(
        {
          normalsData: normalsData.data,
          textureData: coloredTexture.imageData.data,
          options: {
            shiny: 1,
            specularity: 3,
            lx: size - 10,
            ly: size - 10 * reversedIndex,
            lz: 3,
          },
          index,
          width: normalsData.width,
          height: normalsData.height,
        },
        [normalsData.data.buffer],
      )
      reversedIndex--
    }
  })

// const waveNormalsResult = waveNormals()

// const blended = blendedTexture({
//   texture1: waveNormals,
//   texture2: detailWaveNormals
// })
