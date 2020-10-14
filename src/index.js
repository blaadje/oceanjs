import * as Comlink from 'comlink'
import 'regenerator-runtime/runtime'
import normal1 from './normal1.png'
import normal2 from './normal2.png'
import { loadImageWithPromise, createNewImageDataFromImage } from './utils'
import performanceObserver from '@sumup/performance-observer'

const Main = async () => {
  const app = document.getElementById('app')
  const canvas = app.querySelector('#canvas')

  let height = canvas.offsetHeight
  let width = canvas.offsetWidth

  canvas.width = width
  canvas.height = height

  // canvas.style.transform = 'scale(2.3)'
  canvas.style.userSelect = 'none'
  canvas.style.border = '1px solid black'

  const [normal1Image, normal2Image] = await Promise.all([
    loadImageWithPromise(normal1),
    loadImageWithPromise(normal2),
  ])
  const [
    { data: normal1ImageData },
    { data: normal2ImageData },
  ] = await Promise.all([
    createNewImageDataFromImage(normal1Image, 255),
    createNewImageDataFromImage(normal2Image, 255),
  ])

  const offscreen = canvas.transferControlToOffscreen()

  const Scene = Comlink.wrap(
    new Worker('./workers/Scene.js', { type: 'module' }),
  )

  new Scene(
    Comlink.transfer(
      {
        canvas: offscreen,
        height,
        width,
        normal1: normal1ImageData.buffer,
        normal2: normal2ImageData.buffer,
      },
      [offscreen, normal1ImageData.buffer, normal2ImageData.buffer],
    ),
  )
}

Main()
