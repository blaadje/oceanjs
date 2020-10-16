import Platform from '../Platform'
import { heightmap } from './heightmap'
import { normalFromHeightmap } from './normalFromHeightmap'
import Vertex from '../Vertex'
import * as Comlink from 'comlink'
import { createNewImageFromData, genericImageWorker } from '../utils'
import { calculate } from './calculate'
import { reflection } from './reflection'

let t = 0

const workerReflection = genericImageWorker({
  fn: reflection,
  workerAmount: 3,
})

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
    this.platformWidth = 700

    this.init(normal1, normal2)
  }

  async init(normal1, normal2) {
    const [createdNormal1Data, createdNormal2Data] = await Promise.all([
      createNewImageFromData(normal1),
      createNewImageFromData(normal2),
    ])

    this.normal1Data = createdNormal1Data
    this.normal2Data = createdNormal2Data
    this.texture = null
    this.coloredTexture = this.createTexture(this.platformWidth, [9, 52, 97])

    // const center = new Vertex(0, 0, 0)
    // this.platform = new Platform(
    //   center,
    //   this.platformWidth,
    //   2,
    //   this.coloredTexture.canvas,
    //   this.context,
    //   -this.PROJECTION_CENTER_X,
    //   -this.PROJECTION_CENTER_Y,
    // )
    // this.objects = [this.platform]
    // this.rotate(this.platform, 0.9, null)
    // this.rotate(this.platform, null, 0.3)
    // this.platform.terrainFromTexture(this.textureData, this.platformWidth)
    // this.draw()

    // this.updateTexture()
    this.calculate()
    // this.animate()
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

  drawing() {
    this.platform.setTexture(this.texture)
    this.draw()
  }

  calculate = async (time = 0) => {
    const pattern = (image, size = 512) => {
      const canvas = new OffscreenCanvas(size, size)
      const context = canvas.getContext('2d')

      const pattern = context.createPattern(image, 'repeat')

      context.fillStyle = pattern
      context.fillRect(0, 0, size, size)

      return canvas
    }
    // const ratio = 0.001
    // const smoothedTime = time * ratio
    // const size = 700
    // const heightmapResult = heightmap({
    //   size: size,
    //   time: smoothedTime,
    //   distance: 0.8,
    //   amplitude: 0.5,
    // })

    // const normalmap = normalFromHeightmap(size, heightmapResult)
    // platform.terrainFromTexture(heightmap, 255)

    // using
    const blendedTexture = ({ texture1, texture2 } = {}) => {
      const canvas = new OffscreenCanvas(255, 255)
      const context = canvas.getContext('2d')

      context.drawImage(texture1, 0, 0)
      context.globalCompositeOperation = 'overlay'
      context.drawImage(texture2, 0, 0)

      return canvas
    }
    //random blocking function
    const translateTexture = ({
      texture,
      speed = 0.5,
      direction = 'x',
    } = {}) => {
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

    const detailedNormals = pattern(
      detailWaveNormals(this.normal1Data, this.normal2Data),
      700,
    )

    const result = await workerReflection(
      { textureToUpdate: detailedNormals },
      [
        this.coloredTexture.imageData.data,
        {
          shiny: 1,
          specularity: 3,
          lx: 200 - 10,
          ly: 200 - 10,
          lz: 3,
        },
      ],
    )

    this.context.drawImage(
      result,
      -this.PROJECTION_CENTER_X,
      -this.PROJECTION_CENTER_Y,
    )

    // const result = await calculate({
    //   size: this.platformWidth,
    //   detailNormal1: this.normal1Data,
    //   detailNormal2: this.normal2Data,
    //   coloredTexture: this.coloredTexture,
    // })
    // this.texture = result
    requestAnimationFrame(this.calculate)
  }

  animate = async (time = 0) => {
    if (this.texture) {
      this.context.drawImage(
        this.texture,
        -this.PROJECTION_CENTER_X,
        -this.PROJECTION_CENTER_Y,
      )
      // this.platform.setTexture(this.texture)
      // this.drawing()
    }

    // requestAnimationFrame(this.animate)
  }
}

Comlink.expose(Comlink.proxy(Scene))
