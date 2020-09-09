const app = document.getElementById('app')
const canvas = app.querySelector('#canvas')

app.appendChild(canvas)

let height = canvas.offsetHeight
let width = canvas.offsetWidth
canvas.style.userSelect = 'none'

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

var offscreen = canvas.transferControlToOffscreen()

var worker = new Worker('./offscreencanvas.js')

const textureSize = 1500

worker.postMessage({ canvas: offscreen, height, width }, [offscreen])
