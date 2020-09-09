export default class Circle {
  constructor(position) {
    this.x = position.x
    this.y = position.y
  }

  rotate() {}

  draw(context) {
    context.beginPath()
    context.strokeStyle = 'rgba(0, 0, 0, 1)'
    context.ellipse(this.x, this.y, 50, 50, Math.PI / 4, 0, 2 * Math.PI)
    context.stroke()
  }
}
