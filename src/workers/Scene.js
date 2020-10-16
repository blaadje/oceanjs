import Platform from '../Platform'
import { heightmap } from './heightmap'
import { normalFromHeightmap } from './normalFromHeightmap'
import Vertex from '../Vertex'
import * as Comlink from 'comlink'
import { createNewImageFromData, genericWorker } from '../utils'
import { reflection } from './reflection'

let t = 1

const workerAmount = 3

const workerReflection = genericWorker({
  fn: reflection,
  workerAmount,
})
const workerNormalHeight = genericWorker({
  fn: normalFromHeightmap,
  workerAmount,
})

export default class Scene {
  constructor({ canvas, height, width, normal1 }) {
    this.canvas = canvas
    this.context = canvas.getContext('2d', { alpha: false })
    // this.context.fillStyle = 'white'
    this.height = height
    this.width = width
    this.PROJECTION_CENTER_X = this.width / 2
    this.PROJECTION_CENTER_Y = this.height / 2
    this.context.translate(this.PROJECTION_CENTER_X, this.PROJECTION_CENTER_Y)
    this.flying = 0
    this.flyingY = 0
    this.platformWidth = width

    this.canvases = {
      water: new OffscreenCanvas(this.platformWidth, this.platformWidth),
      normals: new OffscreenCanvas(this.platformWidth, this.platformWidth),
      height: new OffscreenCanvas(this.platformWidth, this.platformWidth),
      normalHeight: new OffscreenCanvas(this.platformWidth, this.platformWidth),
    }

    this.contexts = {
      water: this.canvases.water.getContext('2d', { alpha: false }),
      normals: this.canvases.normals.getContext('2d', { alpha: false }),
      height: this.canvases.height.getContext('2d', { alpha: false }),
      normalHeight: this.canvases.normalHeight.getContext('2d', {
        alpha: false,
      }),
    }

    this.init(normal1)
  }

  async init(normal1) {
    const createdNormal1Data = await createNewImageFromData(normal1)

    this.normal1Data = createdNormal1Data
    this.texture = null
    this.coloredTexture = this.createTexture(
      this.platformWidth,
      Math.round(this.platformWidth / workerAmount),
      [9, 56, 110],
    )

    const center = new Vertex(0, 0, 0)
    this.platform = new Platform(
      center,
      this.platformWidth,
      4,
      this.coloredTexture.canvas,
      this.context,
      -this.PROJECTION_CENTER_X,
      -this.PROJECTION_CENTER_Y,
    )
    this.objects = [this.platform]

    this.platform.setTexture(this.canvases.water)
  }

  heightmap = (time = 0) => {
    const ratio = 0.001
    const smoothedTime = time * ratio
    const size = 700
    const heightmapResult = heightmap({
      size: size,
      time: smoothedTime,
      distance: 0.6,
      amplitude: 0.5,
    })

    this.contexts.height.putImageData(heightmapResult, 0, 0)
    this.platform.terrainFromTexture(heightmapResult, this.platformWidth)
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
    this.context.fillRect(
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
    const blendedTexture = ({ texture1, texture2, size = 255 } = {}) => {
      const canvas = new OffscreenCanvas(size, size)
      const context = canvas.getContext('2d')

      context.drawImage(texture1, 0, 0)
      context.globalCompositeOperation = 'overlay'
      context.drawImage(texture2, 0, 0)

      return canvas
    }

    const translateTexture = ({
      texture,
      speed = 0.9,
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
    const detailWaveNormals = (normal1Data) => {
      return blendedTexture({
        texture1: translateTexture({
          texture: normal1Data.resizedImage,
        }),
        texture2: translateTexture({
          texture: normal1Data.resizedImage,
          direction: 'y',
        }),
      })
    }

    const detailedNormals = pattern(
      detailWaveNormals(this.normal1Data),
      this.platformWidth,
    )

    const test = blendedTexture({
      texture1: detailedNormals,
      texture2: this.canvases.normalHeight,
      size: this.platformWidth,
    })

    this.contexts.normals.drawImage(test, 0, 0)
  }

  normalFromHeight = () => {
    const width = this.canvases.height.width
    const height = this.canvases.height.height
    const chunkHeight = Math.round(height / workerAmount)

    const beforeWorker = (index) => {
      const textureToUpdateData = this.contexts.height.getImageData(
        0,
        chunkHeight * index,
        width,
        chunkHeight,
      )

      return [
        {
          index,
          args: [textureToUpdateData.data, width, chunkHeight],
        },
        [textureToUpdateData.data.buffer],
      ]
    }

    const afterWorker = (result, index) => {
      this.contexts.normalHeight.putImageData(
        new ImageData(result, width, chunkHeight),
        0,
        chunkHeight * index,
      )
    }

    workerNormalHeight({
      beforeWorker,
      afterWorker,
    })
  }

  calculate = () => {
    const width = this.canvases.normals.width
    const height = this.canvases.normals.height
    const chunkHeight = Math.round(height / workerAmount)

    let reversedIndex = workerAmount

    const afterWorker = (result, index) => {
      this.contexts.water.putImageData(
        new ImageData(result, width, chunkHeight),
        0,
        chunkHeight * index,
      )
    }

    const beforeWorker = (index) => {
      const textureToUpdateData = this.contexts.normals.getImageData(
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
              shiny: 10,
              specularity: 3,
              lx: 700,
              ly: 0 + chunkHeight * reversedIndex,
              lz: 3,
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
    // this.platform.setTexture(this.canvases.water)
  }
}

Comlink.expose(Comlink.proxy(Scene))