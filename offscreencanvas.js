import Platform from './Platform'
import Vertex from './Vertex'
// import Circle from './Circle'

var test = new Worker('./test.js')

onmessage = function (event) {
  const { foo, canvas, height, width, texture } = event.data
}
