import * as Comlink from 'comlink'
import Platform from '../Platform'
import Vertex from '../Vertex'
import { normalize, deNormalize, createNewImageFromData } from '../utils'

const worker1 = new Worker('./volumeFromTexture.js', { type: 'module' })
const volumeFromTexture = Comlink.wrap(worker1)
const { cos, sin, sqrt, pow } = Math

class Scene {
  constructor({ canvas, texture, height, width, normals }) {
    this.canvas = canvas
    this.context = canvas.getContext('2d', { alpha: false })
    this.height = height
    this.width = width
    this.PROJECTION_CENTER_X = this.width / 2
    this.PROJECTION_CENTER_Y = this.height / 2
    this.context.translate(this.PROJECTION_CENTER_X, this.PROJECTION_CENTER_Y)
    this.flying = 0
    this.flyingY = 0
    this.platformWidth = 255
    this.textureCanvas = new OffscreenCanvas(255, 255)

    this.textureCanvasContext = this.textureCanvas.getContext('2d')

    this.init(normals, texture)
  }

  async init(normals, texture) {
    const [normalData, textureData] = await Promise.all([
      createNewImageFromData(normals),
      createNewImageFromData(texture, 255, this.textureCanvas),
    ])

    this.textureData = textureData.imageData
    this.normalData = normalData.imageData
    this.normalCloneData = new ImageData(
      new Uint8ClampedArray(normalData.imageData.data),
      normalData.imageData.width,
    )

    const center = new Vertex(0, 0, 0)
    this.platform = new Platform(
      center,
      this.platformWidth,
      5,
      this.textureCanvas.transferToImageBitmap(),
      this.context,
      -this.PROJECTION_CENTER_X,
      -this.PROJECTION_CENTER_Y,
    )
    this.objects = [this.platform]
    // this.rotate(this.platform, 0.9, null)
    // this.rotate(this.platform, null, 0.3)
    // this.platform.terrainFromTexture(this.textureData, this.platformWidth)
    // this.draw()

    // this.updateTexture()
    this.animate()
  }

  rotate(object, phi, theta) {
    object.rotate(
      phi,
      theta,
      this.PROJECTION_CENTER_X,
      this.PROJECTION_CENTER_Y,
    )
  }

  draw() {
    this.context.clearRect(
      -this.PROJECTION_CENTER_X,
      -this.PROJECTION_CENTER_Y,
      this.width,
      this.height,
    )

    this.objects.forEach((object) => object.draw())
  }

  heightmap(time = 0.1) {
    const size = 255
    const imageData = this.context.createImageData(size, size)
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
        const distance = 1.6
        const amplitude = 0.5
        const pixelX = normalize(a)
        const pixelY = normalize(y)

        const simpleSin = amplitude * sin(distance * (pixelX * 10 + time))
        const diagonalSin =
          amplitude * sin(distance * (pixelX * 10 + pixelY * 10 + time))
        const rotationSin =
          amplitude *
          sin(
            distance * (pixelX * sin(time / 2) + pixelY * cos(time / 3)) + time,
          )

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

  normalMapFromHeightmap(heightmap) {
    const size = 255
    const imageData = this.context.createImageData(size, size)
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

  reflectionTexture(
    texture,
    normalMap,
    { shiny = 3, lx, ly, lz, specularity = 3 },
  ) {
    const size = 255
    const imageData = this.context.createImageData(size, size)
    const max = size - 1

    const getTexture = (x, y) => {
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
        r: texture.data[x + size * 4 * y],
        g: texture.data[x + 1 + size * 4 * y],
        b: texture.data[x + 2 + size * 4 * y],
        a: texture.data[x + 3 + size * 4 * y],
      }
    }
    const getNormal = (x, y) => {
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
        r: normalMap.data[x + size * 4 * y],
        g: normalMap.data[x + 1 + size * 4 * y],
        b: normalMap.data[x + 2 + size * 4 * y],
        a: normalMap.data[x + 3 + size * 4 * y],
      }
    }

    const set = (x, y, { r, g, b, a = 255 }) => {
      imageData.data[x + size * 4 * y] = r
      imageData.data[x + 1 + size * 4 * y] = g
      imageData.data[x + 2 + size * 4 * y] = b
      imageData.data[x + 3 + size * 4 * y] = a
    }

    let ni = 0
    let dx = 0
    let dy = 0
    let dz = 0
    let a = 0

    for (let y = 0; y <= max; y += 1) {
      for (let x = 0; x <= size * 4; x += 4) {
        // get surface normal
        const { r, g, b } = getNormal(x, y)
        const nx = normalize(r)
        const ny = normalize(g)
        const nz = normalize(b)

        // make it a bit faster by only updateing the direction
        // for every other pixel
        if (shiny > 0 || (ni & 1) == 0) {
          // calculate the light direction vector
          dx = lx - a
          dy = ly - y
          dz = lz

          // normalize it
          let magInv = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz)
          dx *= magInv
          dy *= magInv
          dz *= magInv
        }

        // take the dot product of the direction and the normal
        // to get the amount of specularity
        const dot = dx * nx + dy * ny + dz * nz

        // spec + ambient
        let spec = Math.pow(dot, 20) * specularity + Math.pow(dot, 400) * shiny
        const intensity = spec + 1

        set(x, y, {
          r: Math.round(getTexture(x, y).r * intensity),
          g: Math.round(getTexture(x, y).g * intensity),
          b: Math.round(getTexture(x, y).b * intensity),
        })

        ni += 3
        a += 1
      }
      a = 0
    }

    return imageData
  }

  blend(texture1, texture2, amount = 0.5) {
    const size = 255
    const imageData = this.context.createImageData(size, size)

    for (let pixel = 0; pixel <= size * size * 4; pixel += 4) {
      const r1 = texture1.data[pixel]
      const g1 = texture1.data[pixel + 1]
      const b1 = texture1.data[pixel + 2]

      const r2 = texture2.data[pixel]
      const g2 = texture2.data[pixel + 1]
      const b2 = texture2.data[pixel + 2]

      const r3 =
        r1 < 128
          ? (2 * r2 * r1) / 255
          : 255 - (2 * (255 - r2) * (255 - r1)) / 255
      const g3 =
        g1 < 128
          ? (2 * g2 * g1) / 255
          : 255 - (2 * (255 - g2) * (255 - g1)) / 255
      const b3 =
        b1 < 128
          ? (2 * b2 * b1) / 255
          : 255 - (2 * (255 - b2) * (255 - b1)) / 255

      const amount1 = 1 - amount
      const amount2 = amount

      imageData.data[pixel] = r1 * amount1 + amount2 * r3
      imageData.data[pixel + 1] = g1 * amount1 + amount2 * g3
      imageData.data[pixel + 2] = b1 * amount1 + amount2 * b3
      imageData.data[pixel + 3] = 255
    }

    return imageData
  }

  translateTexture(texture, ratio = 1, direction = 'x') {
    const size = 255
    const max = size - 1

    const set = (x, y, { r, g, b, a = 255 }) => {
      texture.data[x + size * 4 * y] = r
      texture.data[x + 1 + size * 4 * y] = g
      texture.data[x + 2 + size * 4 * y] = b
      texture.data[x + 3 + size * 4 * y] = a
    }

    const get = (x, y) => {
      return {
        r: texture.data[x + size * 4 * y],
        g: texture.data[x + 1 + size * 4 * y],
        b: texture.data[x + 2 + size * 4 * y],
        a: texture.data[x + 3 + size * 4 * y],
      }
    }

    for (let y = 0; y <= max; y += 1) {
      for (let x = 0; x <= size * 4; x += 4) {
        const actual = get(x, y)

        if (direction === 'y') {
          set(x, y, get(x, y + 1 * ratio))
          set(x, max - 1 + y, actual)
        } else {
          set(x, y, get(x + 4 * ratio, y))
        }
      }
    }
  }

  animate = async (time = 0) => {
    requestAnimationFrame(this.animate)
    const speed = 0.0004
    const heightmap = this.heightmap(time * speed)
    const normalmap = this.normalMapFromHeightmap(heightmap, time * speed)

    this.platform.terrainFromTexture(heightmap, 255)

    this.draw()

    this.translateTexture(this.normalData, 2)
    this.translateTexture(this.normalCloneData, 2, 'y')

    const translatedDetailsNormal = this.blend(
      this.normalData,
      this.normalCloneData,
      0.9,
    )

    const blendedNormalMap = this.blend(normalmap, translatedDetailsNormal, 0.1)

    const reflectionTexture = this.reflectionTexture(
      this.textureData,
      blendedNormalMap,
      {
        shiny: 0,
        specularity: 2,
        lx: 130,
        ly: 1200,
        lz: 500,
      },
    )

    // const resizedImage = await createImageBitmap(reflectionTexture, {
    //   resizeHeight: this.platformWidth,
    //   resizeWidth: this.platformWidth,
    // })
    this.textureCanvasContext.putImageData(reflectionTexture, 0, 0)
    this.platform.setTexture(this.textureCanvas.transferToImageBitmap())
  }
}

Comlink.expose(Comlink.proxy(Scene))
