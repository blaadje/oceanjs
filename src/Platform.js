import Vertex from './Vertex'
import Vertex2D from './Vertex2D'

export default class Platform {
  constructor(position, size = 70, subVerticesAmount = 9, texture) {
    this.size = size
    this.subVerticesAmount = subVerticesAmount
    this.textureWidth = 50
    this.vertices = [
      new Vertex(-1, 1, -1),
      new Vertex(1, 1, -1),
      new Vertex(1, 1, 1),
      new Vertex(-1, 1, 1),
    ]

    this.vertices = this.vertices.map(({ x, y, z }) => {
      const updatedX = x * (this.size / 2) + position.x
      const updatedY = y * position.y
      const updatedZ = z * (this.size / 2) + position.z + 400

      return new Vertex(updatedX, updatedY, updatedZ)
    })
    this.subVertices = this.calculateSubVertices()
    this.movingSubVertices = [...this.subVertices]
    this.textureTriangles = this.createTextureTriangles()
    this.texture = this.setTexture(texture)
  }

  getVertices() {
    return this.vertices
  }

  getSubVertices() {
    return this.subVertices
  }

  getMovingSubVertices() {
    return this.movingSubVertices
  }

  setTexture(texture) {
    createImageBitmap(texture, {
      resizeHeight: this.textureWidth,
      resizeWidth: this.textureWidth,
    }).then((image) => {
      this.texture = image
    })
  }

  getTexture() {
    return this.texture
  }

  setVertice(index, vertex) {
    this.vertices[index] = vertex
  }

  setMovingSubVertices(newSubVertices) {
    this.movingSubVertices = [...newSubVertices]
  }

  calculateSubVertices = () => {
    const divideNumber = this.subVerticesAmount
    const vertexAmount = divideNumber + 1

    const array = [...new Array(vertexAmount)]

    const { x, y, z } = this.getVertices()[0]

    return array.map((_, indexX) => {
      const segmentSize = this.size / divideNumber
      const positionX = x + segmentSize * indexX

      return array.map((_, indexZ) => {
        const positionZ = z + segmentSize * indexZ
        const positionY = y

        return new Vertex(positionX, positionY, positionZ)
      })
    })
  }

  project = (vertex) => {
    var d = 300
    var r = d / vertex.y

    return new Vertex2D(r * vertex.x, r * vertex.z)
  }

  rotate(phi, theta, centerX, centerY) {
    const cosine = Math.cos(theta || phi)
    const sine = Math.sin(theta || phi)

    const subVertices = this.subVertices.map((vertices) => {
      return vertices.map(({ x, y, z }) => {
        const theX = x
        const theY = y
        const theZ = z

        const centeredX = theX - centerX
        const centeredY = theY - centerY
        const vertex = phi
          ? new Vertex(
              theX,
              theY * cosine - theZ * sine,
              centeredY * sine + theZ * cosine,
            )
          : new Vertex(
              theX * cosine - theZ * sine,
              theY,
              centeredX * sine + theZ * cosine,
            )

        return vertex
      })
    })

    this.subVertices = subVertices
    this.movingSubVertices = subVertices
  }

  textureMap(context, triangles, textureTriangles) {
    for (let i = 0; i < triangles.length; i++) {
      const triangle = triangles[i]
      const textureTriangle = textureTriangles[i]

      const { x: x0, y: y0 } = this.project(triangle[0])
      const { x: x1, y: y1 } = this.project(triangle[1])
      const { x: x2, y: y2 } = this.project(triangle[2])
      const { x: u0, y: v0 } = textureTriangle[0]
      const { x: u1, y: v1 } = textureTriangle[1]
      const { x: u2, y: v2 } = textureTriangle[2]

      context.save()
      context.beginPath()
      context.moveTo(x0, y0)
      context.lineTo(x1, y1)
      context.lineTo(x2, y2)
      context.closePath()
      // context.fill()
      // context.stroke()
      context.clip()

      var delta = u0 * v1 + v0 * u2 + u1 * v2 - v1 * u2 - v0 * u1 - u0 * v2
      var delta_a = x0 * v1 + v0 * x2 + x1 * v2 - v1 * x2 - v0 * x1 - x0 * v2
      var delta_b = u0 * x1 + x0 * u2 + u1 * x2 - x1 * u2 - x0 * u1 - u0 * x2
      var delta_c =
        u0 * v1 * x2 +
        v0 * x1 * u2 +
        x0 * u1 * v2 -
        x0 * v1 * u2 -
        v0 * u1 * x2 -
        u0 * x1 * v2
      var delta_d = y0 * v1 + v0 * y2 + y1 * v2 - v1 * y2 - v0 * y1 - y0 * v2
      var delta_e = u0 * y1 + y0 * u2 + u1 * y2 - y1 * u2 - y0 * u1 - u0 * y2
      var delta_f =
        u0 * v1 * y2 +
        v0 * y1 * u2 +
        y0 * u1 * v2 -
        y0 * v1 * u2 -
        v0 * u1 * y2 -
        u0 * y1 * v2

      context.transform(
        delta_a / delta,
        delta_d / delta,
        delta_b / delta,
        delta_e / delta,
        delta_c / delta,
        delta_f / delta,
      )
      context.drawImage(this.texture, 0, 0)
      context.restore()
    }
  }

  createTextureTriangles() {
    const gap = Math.floor(this.textureWidth / this.subVerticesAmount)
    const array = []

    for (let y = 0; y < this.movingSubVertices.length - 1; y++) {
      const tempArray = []
      for (let x = 0; x < this.movingSubVertices[y].length - 1; x++) {
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
        tempArray.push([firstTextureTriangle, secondTextureTriangle])
      }

      array.push(tempArray)
    }

    return array
  }

  draw(context) {
    if (!this.texture) {
      return
    }

    for (let y = 0; y < this.movingSubVertices.length - 1; y++) {
      for (let x = 0; x < this.movingSubVertices[y].length - 1; x++) {
        const firstTriangle = {
          0: this.movingSubVertices[y][x],
          1: this.movingSubVertices[y + 1][x],
          2: this.movingSubVertices[y + 1][x + 1],
        }
        const secondTriangle = {
          0: this.movingSubVertices[y][x],
          1: this.movingSubVertices[y][x + 1],
          2: this.movingSubVertices[y + 1][x + 1],
        }

        this.textureMap(
          context,
          [firstTriangle, secondTriangle],
          this.textureTriangles[y][x],
        )
      }
    }
  }
}
