import Vertex from './Vertex'
import Vertex2D from './Vertex2D'

export default class Platform {
  constructor(position, size = 80, facesAmount = 9, texture, context) {
    this.context = context
    this.size = size
    this.texture = texture
    this.position = position
    this.facesAmount = facesAmount
    this.divisions = Math.pow(2, this.facesAmount) + 1
    this.max = this.divisions - 1
    this.vertices = new Array(this.divisions * this.divisions)

    this.half = size * 0.5
    this.divisionSize = this.size / this.max
    this.roughness = 2

    this.generatePlatform()
    // this.generateTerrain()
  }

  terrainFromTexture({ data, width }) {
    const gapBetweenPixels = Math.floor(width / this.divisions)
    const ratio = 0.08

    for (let y = 0; y <= this.max; y++) {
      for (let x = 0; x <= this.max; x++) {
        const r =
          data[x * 4 * gapBetweenPixels + width * y * 4 * gapBetweenPixels]
        const currentVertex = this.vertices[x + this.divisions * y]

        this.vertices[x + this.divisions * y] = new Vertex(
          currentVertex.x,
          currentVertex.y,
          r * ratio + 500,
        )
      }
    }
  }

  generatePlatform() {
    for (let y = 0; y <= this.max; y++) {
      for (let x = 0; x <= this.max; x++) {
        this.set(
          x,
          y,
          new Vertex(
            this.position.x - this.half + this.divisionSize * x,
            this.position.y - this.half + this.divisionSize * y - 600,
            this.position.z - 200,
          ),
        )
      }
    }
  }

  generateTerrain() {
    const half = -100
    const topLeft = this.get(0, 0)
    const topRight = this.get(this.max, 0)
    const bottomLeft = this.get(this.max, this.max)
    const bottomRight = this.get(0, this.max)

    this.set(0, 0, new Vertex(topLeft.x, topLeft.y, half))
    this.set(this.max, 0, new Vertex(topRight.x, topRight.y, half))
    this.set(this.max, this.max, new Vertex(bottomLeft.x, bottomLeft.y, half))
    this.set(0, this.max, new Vertex(bottomRight.x, bottomRight.y, half))

    this.divide(this.max)
  }

  divide(size) {
    let x,
      y,
      half = size / 2

    const scale = this.roughness * size

    if (half < 1) {
      return
    }

    for (y = half; y < this.max; y += size) {
      for (x = half; x < this.max; x += size) {
        const currentPoint = this.get(x, y)
        const avg = this.average([
          this.get(x - half, y - half).z,
          this.get(x + half, y - half).z,
          this.get(x + half, y + half).z,
          this.get(x - half, y + half).z,
        ])

        this.set(
          x,
          y,
          new Vertex(
            currentPoint.x,
            currentPoint.y,
            avg + Math.random() * scale * 2 - scale,
          ),
        )
      }
    }

    for (y = 0; y <= this.max; y += half) {
      for (x = (y + half) % size; x <= this.max; x += size) {
        const currentPoint = this.get(x, y)
        const avg = this.average([
          this.get(x, y - half).z,
          this.get(x + half, y).z,
          this.get(x, y + half).z,
          this.get(x - half, y).z,
        ])

        this.set(
          x,
          y,
          new Vertex(
            currentPoint.x,
            currentPoint.y,
            avg + Math.random() * scale * 2 - scale,
          ),
        )
      }
    }

    this.divide(size / 2)
  }

  get(x, y) {
    if (x < 0 || x > this.max || y < 0 || y > this.max) {
      return -1
    }

    return this.vertices[x + this.divisions * y]
  }

  set(x, y, value) {
    this.vertices[x + this.divisions * y] = value
  }

  average(values) {
    const valid = values.filter((val) => val)
    const total = valid.reduce((sum, val) => sum + val, 0)

    return total / valid.length
  }

  setTexture(texture) {
    this.texture = texture
  }

  project(vertex) {
    var d = 700
    var r = d / vertex.y

    return new Vertex2D(r * vertex.x, r * vertex.z)
    // return new Vertex2D(vertex.x, vertex.y)
  }

  rotate(phi, theta) {
    const cosine = Math.cos(theta || phi)
    const sine = Math.sin(theta || phi)

    for (let y = 0; y < this.divisions; y++) {
      for (let x = 0; x < this.divisions; x++) {
        const { x: theX, y: theY, z: theZ } = this.get(x, y)

        const vertex = phi
          ? new Vertex(
              theX,
              theY * cosine - theZ * sine,
              theY * sine + theZ * cosine,
            )
          : new Vertex(
              theX * cosine - theZ * sine,
              theY,
              theX * sine + theZ * cosine,
            )

        this.set(x, y, vertex)
      }
    }
  }

  textureMap(vertexTris, textureTris) {
    const { x: x0, y: y0 } = this.project(vertexTris[0])
    const { x: x1, y: y1 } = this.project(vertexTris[1])
    const { x: x2, y: y2 } = this.project(vertexTris[2])

    const { x: u0, y: v0 } = textureTris[0]
    const { x: u1, y: v1 } = textureTris[1]
    const { x: u2, y: v2 } = textureTris[2]

    const delta = u0 * v1 + v0 * u2 + u1 * v2 - v1 * u2 - v0 * u1 - u0 * v2
    const delta_a = x0 * v1 + v0 * x2 + x1 * v2 - v1 * x2 - v0 * x1 - x0 * v2
    const delta_b = u0 * x1 + x0 * u2 + u1 * x2 - x1 * u2 - x0 * u1 - u0 * x2
    const delta_c =
      u0 * v1 * x2 +
      v0 * x1 * u2 +
      x0 * u1 * v2 -
      x0 * v1 * u2 -
      v0 * u1 * x2 -
      u0 * x1 * v2
    const delta_d = y0 * v1 + v0 * y2 + y1 * v2 - v1 * y2 - v0 * y1 - y0 * v2
    const delta_e = u0 * y1 + y0 * u2 + u1 * y2 - y1 * u2 - y0 * u1 - u0 * y2
    const delta_f =
      u0 * v1 * y2 +
      v0 * y1 * u2 +
      y0 * u1 * v2 -
      y0 * v1 * u2 -
      v0 * u1 * y2 -
      u0 * y1 * v2

    this.context.save()
    this.context.beginPath()

    this.context.moveTo(x0, y0)
    this.context.lineTo(x1, y1)
    this.context.lineTo(x2, y2)
    this.context.clip()
    this.context.transform(
      delta_a / delta,
      delta_d / delta,
      delta_b / delta,
      delta_e / delta,
      delta_c / delta,
      delta_f / delta,
    )
    this.context.drawImage(this.texture, 0, 0)
    this.context.restore()
  }

  draw() {
    const gap = Math.floor(this.texture.width / this.divisions)

    for (let y = 0; y <= this.max; y++) {
      for (let x = 0; x <= this.max; x++) {
        if (x < this.divisions && y < this.divisions) {
          const firstTriangle = {
            0: this.get(x, y),
            1: this.get(x, y + 1),
            2: this.get(x + 1, y + 1),
          }
          const secondTriangle = {
            0: this.get(x, y),
            1: this.get(x + 1, y),
            2: this.get(x + 1, y + 1),
          }

          const firstTextureTriangle = {
            0: new Vertex2D(gap * x, gap * y),
            1: new Vertex2D(gap * x, gap * (y + 1)),
            2: new Vertex2D(gap * (x + 1), gap * (y + 1)),
          }
          const secondTextureTriangle = {
            0: new Vertex2D(gap * x, gap * y),
            1: new Vertex2D(gap * (x + 1), gap * y),
            2: new Vertex2D(gap * (x + 1), gap * (y + 1)),
          }

          this.textureMap(firstTriangle, firstTextureTriangle)
          this.textureMap(secondTriangle, secondTextureTriangle)
        }
      }
    }
  }
}
