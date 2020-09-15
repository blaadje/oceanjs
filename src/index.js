import * as Comlink from 'comlink'
import 'regenerator-runtime/runtime'
import importedImage from './ocean2.jpg'
import water from './water.jpg'
import { loadImageWithPromise, createNewImageDataFromImage } from './utils'

const Main = async () => {
  const app = document.getElementById('app')
  const canvas = app.querySelector('#canvas')

  let height = canvas.offsetHeight
  let width = canvas.offsetWidth

  canvas.style.transform = 'scale(0.99)'
  canvas.style.userSelect = 'none'

  const Scene = Comlink.wrap(
    new Worker('./workers/Scene.js', { type: 'module' }),
  )

  const [blueImage, waterNormalImage] = await Promise.all([
    loadImageWithPromise(importedImage),
    loadImageWithPromise(water),
  ])
  const [{ data: blueData }, { data: waterNormalData }] = await Promise.all([
    createNewImageDataFromImage(blueImage, 512),
    createNewImageDataFromImage(waterNormalImage, 512),
  ])

  const onResize = () => {
    width = canvas.offsetWidth
    height = canvas.offsetHeight

    canvas.width = width
    canvas.height = height
  }

  document.addEventListener('resize', onResize)

  onResize()

  const offscreen = canvas.transferControlToOffscreen()
  new Scene(
    Comlink.transfer(
      {
        canvas: offscreen,
        texture: blueData.buffer,
        height,
        width,
        normals: waterNormalData.buffer,
      },
      [offscreen, blueData.buffer, waterNormalData.buffer],
    ),
  )
}

Main()
