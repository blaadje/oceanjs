import { noise } from './noise'
import Vertex from './Vertex'

let flying = 0

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

onmessage = function (event) {
  const { subVertices, time } = event.data

  const footime = time * 0.0005
  flying -= 0.01
  let yoff = flying
  const updatingRatio = 0.2

  const updatedSubVertices = subVertices.map((vertices) => {
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

  self.postMessage({ subVertices: updatedSubVertices })
}
