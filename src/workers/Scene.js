import * as Comlink from 'comlink'
import Platform from '../Platform'
import Vertex from '../Vertex'
import { map } from '../utils'
import { noise } from '../noise'

const worker1 = new Worker('./volumeFromTexture.js', { type: 'module' })
const volumeFromTexture = Comlink.wrap(worker1)

class Scene {
  constructor({ canvas, height, width, texture }) {
    this.canvas = canvas
    this.context = canvas.getContext('2d', { alpha: false })
    this.height = height
    this.width = width
    this.PROJECTION_CENTER_X = this.width / 2
    this.PROJECTION_CENTER_Y = this.height / 2
    this.context.translate(this.PROJECTION_CENTER_X, this.PROJECTION_CENTER_Y)
    this.flying = 0
    this.texture = texture
    const center = new Vertex(0, 0, 0)

    this.objects = [new Platform(center, 500, 10, this.texture)]

    this.rotate(this.objects[0], 0.5, null)

    this.animate()
  }

  drawTextureThumbnail() {
    this.context.putImageData(this.texture, 0, 0)
  }

  async volumeFromTexture() {
    const platform = this.objects[0]

    const updatedSubVertices = await volumeFromTexture(
      platform.getSubVertices(),
      platform.size,
      this.texture,
    )

    platform.setMovingSubVertices(updatedSubVertices)
  }

  async updateTexture() {
    this.flying += 0.005
    let yoff = this.flying
    const rgba = 4

    for (let i = 0; i < this.texture.data.length; i += rgba) {
      let xoff = this.flying
      const r = this.texture.data[i]
      const ratio = 255

      this.texture.data[i] =
        r + Math.round(await map(noise(xoff, yoff), 0, 1, -ratio, ratio))

      yoff += 0.2
    }
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

    this.objects.forEach((object) => {
      object.draw(this.context)
    })
  }

  animate = async () => {
    requestAnimationFrame(this.animate)
    const platform = this.objects[0]

    await this.updateTexture()
    const updatedSubVertices = await volumeFromTexture(
      platform.getSubVertices(),
      platform.size,
      this.texture,
    )

    platform.setTexture(this.texture)
    platform.setMovingSubVertices(updatedSubVertices)
    this.draw()
  }
}

Comlink.expose(Comlink.proxy(Scene))
