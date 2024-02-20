export default class Terrain {
  constructor(context, detail, width, height) {
    this.context = context
    this.width = width
    this.height = height
    this.size = Math.pow(2, detail) + 1
    this.max = this.size - 1
    this.map = new Float32Array(this.size * this.size)
    this.roughness = 0.7

    this.generate()
    this.draw()
  }

  get(x, y) {
    if (x < 0 || x > this.max || y < 0 || y > this.max) {
      return -1
    }

    return this.map[x + this.size * y]
  }

  set(x, y, val) {
    this.map[x + this.size * y] = val
  }

  generate() {
    this.set(0, 0, this.max / 2) // 0, 0, 20
    this.set(this.max, 0, this.max / 2) // 20, 0, 10
    this.set(this.max, this.max, this.max / 2) // 20, 20, 0
    this.set(0, this.max, this.max / 2) // 0, 20, 10

    this.divide(this.max)
  }

  average(values) {
    const valid = values.filter((val) => val !== -1)
    const total = valid.reduce((sum, val) => sum + val, 0)

    return total / valid.length
  }

  divide(size) {
    var x,
      y,
      half = size / 2
    const scale = 1

    if (half < 1) {
      return
    }

    for (y = half; y < this.max; y += size) {
      for (x = half; x < this.max; x += size) {
        this.square(x, y, half, Math.random() * scale * 2 - scale)
      }
    }
    for (y = 0; y <= this.max; y += half) {
      for (x = (y + half) % size; x <= this.max; x += size) {
        this.diamond(x, y, half, Math.random() * scale * 2 - scale)
      }
    }

    // this.divide(size / 2)
  }

  project(flatX, flatY, flatZ) {
    const point = this.iso(flatX, flatY)
    const x0 = this.width * 0.5
    const y0 = this.height * 0.2
    const z = this.size * 0.5 - flatZ + point.y * 0.75
    const x = (point.x - this.size * 0.5) * 6
    const y = (this.size - point.y) * 0.005 + 1

    return {
      x: x0 + x / y,
      y: y0 + z / y,
    }
  }

  iso(x, y) {
    return {
      x: 0.5 * (this.size + x - y),
      y: 0.5 * (x + y),
    }
  }

  brightness(x, y, slope) {
    if (y === this.max || x === this.max) return 'green'
    const b = ~~(slope * 50) + 128

    return ['rgba(', b, ',', b, ',', b, ',1)'].join('')
  }

  rect(a, b, style) {
    if (b.y < a.y) return
    this.context.fillStyle = style
    this.context.fillRect(a.x, a.y, b.x - a.x, b.y - a.y)
  }

  square(x, y, size, offset) {
    var ave = this.average([
      this.get(x - size, y - size), // upper left
      this.get(x + size, y - size), // upper right
      this.get(x + size, y + size), // lower right
      this.get(x - size, y + size), // lower left
    ])
    this.set(x, y, ave + offset)
  }

  diamond(x, y, size, offset) {
    var ave = this.average([
      this.get(x, y - size), // top
      this.get(x + size, y), // right
      this.get(x, y + size), // bottom
      this.get(x - size, y), // left
    ])
    this.set(x, y, ave + offset)
  }

  draw() {
    var waterVal = this.size * 0.3

    console.log(this.map)
    for (var y = 0; y < this.size; y++) {
      for (var x = 0; x < this.size; x++) {
        var val = this.get(x, y)
        var top = this.project(x, y, val)
        var bottom = this.project(x + 1, y, 0)
        var water = this.project(x, y, waterVal)
        var style = this.brightness(x, y, this.get(x + 1, y) - val)

        this.rect(top, bottom, style)
        // this.rect(water, bottom, 'rgba(50, 150, 200, 0.9)')
      }
    }
  }
}
