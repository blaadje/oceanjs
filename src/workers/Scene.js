import Platform from '../Platform'
import Vertex from '../Vertex'
import * as Comlink from 'comlink'
import { createNewImageFromData, normalize } from '../utils'

import textureWorkers from './texturesUtils'

const { sqrt, pow } = Math

let t = 0
export default class Scene {
  constructor({ canvas, height, width, normal1, normal2 }) {
    this.canvas = canvas
    this.context = canvas.getContext('2d', { alpha: false })
    this.height = height
    this.width = width
    this.PROJECTION_CENTER_X = this.width / 2
    this.PROJECTION_CENTER_Y = this.height / 2
    this.context.translate(this.PROJECTION_CENTER_X, this.PROJECTION_CENTER_Y)
    this.flying = 0
    this.flyingY = 0
    this.platformWidth = 512

    this.init(normal1, normal2)
  }

  async init(normal1, normal2) {
    const [createdNormal1Data, createdNormal2Data] = await Promise.all([
      createNewImageFromData(normal1),
      createNewImageFromData(normal2),
    ])

    this.normal1Data = createdNormal1Data
    this.normal2Data = createdNormal2Data
    this.texture = this.createTexture(512, [9, 52, 97])

    const center = new Vertex(0, 0, 0)
    this.platform = new Platform(
      center,
      this.platformWidth,
      2,
      this.texture.canvas,
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

  createTexture(size, colors) {
    const canvas = new OffscreenCanvas(size, size)
    const context = canvas.getContext('2d', { alpha: false })

    canvas.height = size
    canvas.width = size
    const imageData = context.createImageData(size, size)
    const data = new Int32Array(imageData.data.buffer)
    let i
    const length = imageData.data.length

    for (i = 0; i < length; i++) {
      data[i] =
        colors[0] | // red
        (colors[1] << 8) | // green
        (colors[2] << 16) | // blue
        (255 << 24) // alpha
    }

    context.putImageData(imageData, 0, 0)

    return { canvas: canvas.transferToImageBitmap(), imageData }
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

  clamp(x, min, max) {
    if (x < min) return min
    if (x > max) return max - 1
    return x
  }

  reflectionTexture({ texture, normals, options } = {}) {
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

    let dx = 0
    let dy = 0
    let dz = 0
    let x, y

    for (y = 0; y <= max; y++) {
      for (x = 0; x <= max; x++) {
        const r = normalData[x + size * y] & 255
        const g = (normalData[x + size * y] >> 8) & 255
        const b = (normalData[x + size * y] >> 16) & 255

        const nx = normalize(r)
        const ny = normalize(g)
        const nz = normalize(b)

        // make it a bit faster by only updateing the direction
        // for every other pixel

        if (shiny > 0) {
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

        const dot = dx * nx + dy * ny + dz * nz

        // take the dot product of the direction and the normal
        // to get the amount of specularity

        // spec + ambient
        const intensity =
          pow(dot, 10) * specularity + pow(dot, 400) * shiny + 0.5

        data[x + size * y] =
          this.clamp((textureData[x + size * y] & 255) * intensity, 0, 255) | // red
          (this.clamp(
            ((textureData[x + size * y] >> 8) & 255) * intensity,
            0,
            255,
          ) <<
            8) | // green
          (this.clamp(
            ((textureData[x + size * y] >> 16) & 255) * intensity,
            0,
            255,
          ) <<
            16) | // blue
          (255 << 24) // alpha
      }
    }

    context.putImageData(imageData, 0, 0)

    return canvas
  }

  blendedTexture({ texture1, texture2 } = {}) {
    const canvas = new OffscreenCanvas(255, 255)
    const context = canvas.getContext('2d')

    context.drawImage(texture1, 0, 0)
    context.globalCompositeOperation = 'overlay'
    context.drawImage(texture2, 0, 0)

    return canvas
  }

  translateTexture({ texture, speed = 0.4, direction = 'x' } = {}) {
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

  blendedTexture({ texture1, texture2 } = {}) {
    const canvas = new OffscreenCanvas(255, 255)
    const context = canvas.getContext('2d')

    context.drawImage(texture1, 0, 0)
    context.globalCompositeOperation = 'overlay'
    context.drawImage(texture2, 0, 0)

    return canvas
  }

  pattern(image, size = 512) {
    const canvas = new OffscreenCanvas(size, size)
    const context = canvas.getContext('2d')

    const pattern = context.createPattern(image, 'repeat')

    context.fillStyle = pattern
    context.fillRect(0, 0, size, size)

    return context.getImageData(0, 0, size, size)
  }

  normalMapFromHeightmap(heightmap) {
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

  animate = async (time = 0) => {
    // const normalmap = await textureWorkers.normalFromHeightmap(
    //   await textureWorkers.heightmap(time * speed),
    //   time * speed,
    // )

    // this.platform.terrainFromTexture(heightmap, 255)

    const detailsNormals = this.blendedTexture({
      texture1: this.translateTexture({
        texture: this.normal1Data.resizedImage,
      }),
      texture2: this.translateTexture({
        texture: this.normal2Data.resizedImage,
        direction: 'y',
      }),
    })

    const reflected = this.reflectionTexture({
      texture: this.texture.imageData,
      normals: this.pattern(detailsNormals, 512),
      options: {
        shiny: 1,
        specularity: 4,
        lx: 680,
        ly: 680,
        lz: 3,
      },
    })

    // this.context.putImageData(reflected, 0, 0)

    this.platform.setTexture(reflected)

    this.draw()

    requestAnimationFrame(this.animate)
  }
}

Comlink.expose(Comlink.proxy(Scene))
