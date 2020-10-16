import Platform from '../Platform'
import { heightmap } from './heightmap'
import { normalFromHeightmap } from './normalFromHeightmap'
import Vertex from '../Vertex'
import * as Comlink from 'comlink'
import { createNewImageFromData, genericWorker } from '../utils'
import { calculate } from './calculate'
import { reflection } from './reflection'

let t = 0

const workerAmount = 2

const workerReflection = genericWorker({
  fn: reflection,
  workerAmount,
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
    this.platformWidth = 512

    this.canvasWater = new OffscreenCanvas(
      this.platformWidth,
      this.platformWidth,
    )
    this.contextWater = this.canvasWater.getContext('2d', { alpha: false })

    this.canvasNormals = new OffscreenCanvas(
      this.platformWidth,
      this.platformWidth,
    )
    this.contextNormals = this.canvasNormals.getContext('2d', {
      alpha: false,
    })

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
    this.coloredTexture = this.createTexture(
      this.platformWidth,
      Math.round(this.platformWidth / workerAmount),
      [9, 52, 97],
    )

    const center = new Vertex(0, 0, 0)
    this.platform = new Platform(
      center,
      this.platformWidth,
      2,
      this.coloredTexture.canvas,
      this.context,
      -this.PROJECTION_CENTER_X,
      -this.PROJECTION_CENTER_Y,
    )
    this.objects = [this.platform]

    this.makeNormals()
    this.calculate()
    this.animate()

    setInterval(this.calculate, 60)
  }

  createTexture(height, width, colors) {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d', { alpha: false })

    const imageData = context.createImageData(width, height)
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

  makeNormals = () => {
    const pattern = (image, size = 512) => {
      const canvas = new OffscreenCanvas(size, size)
      const context = canvas.getContext('2d')

      const pattern = context.createPattern(image, 'repeat')

      context.fillStyle = pattern
      context.fillRect(0, 0, size, size)

      return canvas
    }

    const blendedTexture = ({ texture1, texture2 } = {}) => {
      const canvas = new OffscreenCanvas(255, 255)
      const context = canvas.getContext('2d')

      context.drawImage(texture1, 0, 0)
      context.globalCompositeOperation = 'overlay'
      context.drawImage(texture2, 0, 0)

      return canvas
    }

    const translateTexture = ({
      texture,
      speed = 0.09,
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
      this.platformWidth,
    )

    this.contextNormals.drawImage(detailedNormals, 0, 0)
    requestAnimationFrame(this.makeNormals)
  }

  calculate = () => {
    const width = this.canvasNormals.width
    const height = this.canvasNormals.height
    const chunkHeight = Math.round(height / workerAmount)

    let reversedIndex = workerAmount

    const afterWorker = (result, index) => {
      this.contextWater.putImageData(
        new ImageData(result, width, chunkHeight),
        0,
        chunkHeight * index,
      )
    }

    const beforeWorker = (index) => {
      const textureToUpdateData = this.contextNormals.getImageData(
        0,
        chunkHeight * index,
        width,
        chunkHeight,
      )

      const parameters = [
        {
          index,
          args: [
            textureToUpdateData.data,
            this.coloredTexture.imageData.data,
            {
              shiny: 1,
              specularity: 4,
              lx: 700,
              ly: 0 + chunkHeight * reversedIndex,
              lz: 10,
            },
            width,
            chunkHeight,
          ],
        },
        [textureToUpdateData.data.buffer],
      ]

      reversedIndex--

      return parameters
    }

    workerReflection({
      beforeWorker,
      afterWorker,
    })
  }

  animate = () => {
    this.draw()
    this.platform.setTexture(this.canvasWater)

    requestAnimationFrame(this.animate)
  }
}

Comlink.expose(Comlink.proxy(Scene))
