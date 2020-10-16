export const loadImageWithPromise = (src) =>
  new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      resolve(image)
    }

    image.src = src
  })

export const createNewImageDataFromImage = async (image, newSize) => {
  const canvas = new OffscreenCanvas(newSize, newSize)
  const context = canvas.getContext('2d')

  const resizedImage = await createImageBitmap(image, {
    resizeHeight: newSize,
    resizeWidth: newSize,
  })

  context.drawImage(resizedImage, 0, 0)

  const canvasData = context.getImageData(0, 0, newSize, newSize)
  // const resizedImageData = canvasData.data

  return canvasData
}

export const createNewImageFromData = async (
  data,
  newSize = 255,
  offscreenCanvas = new OffscreenCanvas(newSize, newSize),
) => {
  const context = offscreenCanvas.getContext('2d')
  const imageSize = Math.sqrt(data.byteLength) / 2
  const array = new Uint8ClampedArray(data)
  const imageData = new ImageData(array, imageSize, imageSize)

  const resizedImage = await createImageBitmap(imageData, {
    resizeHeight: newSize,
    resizeWidth: newSize,
  })

  context.drawImage(resizedImage, 0, 0)

  return {
    resizedImage,
    imageData: context.getImageData(0, 0, 255, 255),
  }
}

const constrain = (n, low, high) => {
  return Math.max(Math.min(n, high), low)
}

export const map = (n, start1, stop1, start2, stop2, withinBounds) => {
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

export const normalize = (
  number,
  [min, max] = [0, 255],
  [newMin, newMax] = [0, 1],
) => {
  const a = (newMax - newMin) / (max - min)
  const b = newMax - a * max

  return a * number + b
}

export const deNormalize = (
  number,
  [min, max] = [0, 1],
  [newMin, newMax] = [0, 255],
) => {
  const a = (newMax - newMin) / (max - min)
  const b = newMax - a * max

  return a * number + b
}

export const genericWorker = ({ fn, workerAmount }) => {
  const workers = Array.from(
    { length: workerAmount },
    () =>
      new Worker(new URL('./workers/testworker.js', import.meta.url), {
        type: 'module',
      }),
  )
  const stringifiedFn = fn.toString()
  const selectParamsBetweenParenthesis = stringifiedFn.substring(
    stringifiedFn.indexOf('(') + 1,
    stringifiedFn.indexOf(')'),
  )

  for (let index = 0; index < workerAmount; index++) {
    const worker = workers[index]

    worker.postMessage({
      params: Boolean(selectParamsBetweenParenthesis)
        ? selectParamsBetweenParenthesis
        : stringifiedFn.substring(0, stringifiedFn.indexOf(' ')),
      body: stringifiedFn.substring(
        stringifiedFn.indexOf('{') + 1,
        stringifiedFn.lastIndexOf('}'),
      ),
    })
  }

  return ({ beforeWorker, afterWorker }) => {
    return new Promise((resolve) => {
      let finished = 0

      function onWorkEnded({ data }) {
        const { result, index } = data

        afterWorker(result, index)

        finished++

        if (finished === workerAmount) {
          resolve()
        }
      }

      let index

      for (index = 0; index < workerAmount; index++) {
        const worker = workers[index]
        worker.onmessage = onWorkEnded

        // console.time('beforeWorker')
        const parameters = beforeWorker(index)

        worker.postMessage(...parameters)

        // console.timeEnd('beforeWorker')
      }
    })
  }
}
