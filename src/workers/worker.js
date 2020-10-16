import { reflection } from './reflection'

addEventListener('message', ({ data }) => {
  const imageData = [data.function]({ ...data.args })

  postMessage(
    { imageData, index: data.index, width: data.width, height: data.height },
    [imageData.buffer],
  )
})
