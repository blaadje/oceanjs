import * as Comlink from 'comlink'
import 'regenerator-runtime/runtime'
import importedImage from './water.jpg'
import { loadImageWithPromise, createNewImageDataFromImage } from './utils'

const Main = async () => {
  const app = document.getElementById('app')
  const canvas = app.querySelector('#canvas')

  let height = canvas.offsetHeight
  let width = canvas.offsetWidth

  canvas.style.transform = 'scale(1.1)'
  canvas.style.userSelect = 'none'
  canvas2.width = 900
  canvas2.height = 900

  const Scene = Comlink.wrap(
    new Worker('./workers/Scene.js', { type: 'module' }),
  )

  const image = await loadImageWithPromise(importedImage)
  // image.style.display = 'none'
  const texture = await createNewImageDataFromImage(image, 30)

  const onResize = () => {
    // We need to define the dimensions of the canvas to our canvas element
    // Javascript doesn't know the computed dimensions from CSS so we need to do it manually
    width = canvas.offsetWidth
    height = canvas.offsetHeight

    canvas.width = width
    canvas.height = height
  }

  document.addEventListener('resize', onResize)

  onResize()

  const offscreen = canvas.transferControlToOffscreen()
  new Scene(
    { canvas: offscreen, height, width, texture },
    Comlink.transfer(offscreen, [offscreen]),
  )
}

Main()
