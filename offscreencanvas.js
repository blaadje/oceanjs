import Platform from './Platform'
import Vertex from './Vertex'
// import Circle from './Circle'

var test = new Worker('./test.js')

onmessage = function (event) {
  const { foo, canvas, height, width, texture } = event.data

  const context = canvas.getContext('2d')

  let PROJECTION_CENTER_X = width / 2
  let PROJECTION_CENTER_Y = height / 2

  const center = new Vertex(0, 0, 0)
  const objects = [new Platform(center, 2000, 100, texture)]
  // const objects = [new Platform(center, 400, 4)]

  const draw = () => {
    context.clearRect(-PROJECTION_CENTER_X, -PROJECTION_CENTER_Y, width, height)

    objects.forEach((object) => {
      object.draw(context)
    })
  }

  const rotate = (object, phi, theta) => {
    object.rotate(phi, theta, PROJECTION_CENTER_X, PROJECTION_CENTER_Y)
  }

  rotate(objects[0], 0.5, null)

  test.onmessage = (event) => {
    const { subVertices } = event.data
    const platform = objects[0]

    platform.setMovingSubVertices(subVertices)
  }

  const animate = (time) => {
    const platform = objects[0]
    test.postMessage({ subVertices: platform.getSubVertices(), time })
    requestAnimationFrame(animate)

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

  context.translate(PROJECTION_CENTER_X, PROJECTION_CENTER_Y)
}
