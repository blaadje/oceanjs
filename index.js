import { noise } from './noise'
import Platform from './Platform'
import Vertex from './Vertex'

const app = document.getElementById('app')
const canvas = app.querySelector('#canvas')
const constrain = (n, low, high) => {
  return Math.max(Math.min(n, high), low)
}

const map = (n, start1, stop1, start2, stop2, withinBounds) => {
  const newval = ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2
  if (!withinBounds) {
    return newval
  }
  if (start2 < stop2) {
    return constrain(newval, start2, stop2)
  } else {
    return constrain(newval, stop2, start2)
  }
}
app.appendChild(canvas)

let height = canvas.offsetHeight
let width = canvas.offsetWidth
canvas.style.userSelect = 'none'

const context = canvas.getContext('2d', { alpha: false })

let PROJECTION_CENTER_X = width / 2
let PROJECTION_CENTER_Y = height / 2

const center = new Vertex(0, 0, 0)
const objects = [new Platform(center, 2000, 80)]
// const objects = [new Platform(center, 400, 4)]

const draw = () => {
  context.fillStyle = 'white'
  context.fillRect(-PROJECTION_CENTER_X, -PROJECTION_CENTER_Y, width, height)
  // context.clearRect(-PROJECTION_CENTER_X, -PROJECTION_CENTER_Y, width, height)

  objects.forEach((object) => {
    object.draw(context)
  })
}

const rotate = (object, phi, theta) => {
  object.rotate(phi, theta, PROJECTION_CENTER_X, PROJECTION_CENTER_Y)
}

rotate(objects[0], 0.5, null)

let flying = 0
const animate = (time) => {
  const platform = objects[0]
  requestAnimationFrame(animate)

  const footime = time * 0.0005
  flying -= 0.01
  let yoff = flying
  const updatingRatio = 0.2

  const updatedSubVertices = platform.getSubVertices().map((vertices) => {
    let xoff = flying

    const xDirection = vertices.map(({ x, y, z }) => {
      const ratio = 25

      const updatedY = y + map(noise(yoff, xoff, footime), 0, 1, -ratio, ratio)
      const updatedX = x + map(noise(yoff, xoff, footime), 0, 1, -ratio, ratio)
      const updatedZ = z + map(noise(yoff, xoff, footime), 0, 1, -ratio, ratio)

      xoff += updatingRatio

      return new Vertex(updatedX, updatedY, updatedZ)
    })
    yoff += updatingRatio

    return xDirection
  })

  platform.setMovingSubVertices(updatedSubVertices)

  draw()
}

// setInterval(() => {
animate()
// }, 100)

let previousMouseX = null
let previousMouseY = null

const mouseDragged = ({ x, y }) => {
  const theta = -((x - previousMouseX) * Math.PI) / 360
  const phi = -((y - previousMouseY) * Math.PI) / 180

  objects.forEach((object) => rotate(object, phi, theta))

  draw()

  previousMouseX = x
  previousMouseY = y
}

// canvas.addEventListener('mousedown', (event) => {
//   previousMouseX = event.x
//   previousMouseY = event.y
//   document.addEventListener('mousemove', mouseDragged)
// })
// document.addEventListener('mouseleave', () => {
//   document.removeEventListener('mousemove', mouseDragged)
// })
// document.addEventListener('mouseup', () => {
//   document.removeEventListener('mousemove', mouseDragged)
// })

// context.fillRect(0, 0, 50, 50)

draw()

function onResize() {
  // We need to define the dimensions of the canvas to our canvas element
  // Javascript doesn't know the computed dimensions from CSS so we need to do it manually
  width = canvas.offsetWidth
  height = canvas.offsetHeight

  canvas.width = width
  canvas.height = height
}

document.addEventListener('resize', onResize)

onResize()
context.translate(PROJECTION_CENTER_X, PROJECTION_CENTER_Y)
