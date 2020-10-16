import * as Comlink from 'comlink'
import 'regenerator-runtime/runtime'
import normal1 from './normal1.png'

import { loadImageWithPromise, createNewImageDataFromImage } from './utils'
import performanceObserver from '@sumup/performance-observer'

const Main = async () => {
  const app = document.getElementById('app')
  const canvas = app.querySelector('#canvas')

  let height = 500
  let width = 500

  canvas.width = width
  canvas.height = height

  // canvas.style.transform = 'scale(1.3)'
  // canvas.style.userSelect = 'none'
  // canvas.style.border = '1px solid black'

  const normal1Image = await loadImageWithPromise(normal1)
  const { data: normalImageData } = await createNewImageDataFromImage(
    normal1Image,
    726,
  )

  const offscreen = canvas.transferControlToOffscreen()

  const Scene = Comlink.wrap(
    new Worker(new URL('./workers/Scene.js', import.meta.url), {
      type: 'module',
    }),
  )

  const instance = await new Scene(
    Comlink.transfer(
      {
        canvas: offscreen,
        height,
        width,
        normal1: normalImageData.buffer,
      },
      [offscreen, normalImageData.buffer],
    ),
  )

  const foo = async (time) => {
    await Promise.all([
      instance.heightmap(time),
      instance.normalFromHeight(),
      instance.calculate(),
      instance.animate(),
      instance.makeNormals(),
    ])
    // await Promise.all([])

    requestAnimationFrame(foo)
  }

  foo()
}

Main()