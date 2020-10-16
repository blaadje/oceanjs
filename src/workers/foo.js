const workers = [
  new Worker('worker.js', { type: 'module' }),
  new Worker('worker.js', { type: 'module' }),
  new Worker('worker.js', { type: 'module' }),
  new Worker('worker.js', { type: 'module' }),
]

// const generateWorkers = () => {

// }

export const calculate = ({
  time,
  size,
  detailNormal1,
  detailNormal2,
  coloredTexture,
}) =>
  new Promise((resolve) => {
    const workersCount = workers.length
    let finished = 0
    const chunkSize = Math.round(size / workersCount)

    function onWorkEnded({ data }) {
      const { imageData, index, width, height } = data
      const result = new ImageData(imageData, width, height)

      context.putImageData(result, 0, chunkSize * index)

      finished++

      if (finished === workersCount) {
        resolve(waveNormalsResult.transferToImageBitmap())
      }
    }

    let reversedIndex = workersCount

    for (let index = 0; index < workersCount; index++) {
      const worker = workers[index]
      worker.onmessage = onWorkEnded

      const imagePatternContext = imagePattern.getContext('2d')
      const normalsData = imagePatternContext.getImageData(
        0,
        chunkSize * index,
        size,
        chunkSize,
      )

      worker.postMessage(
        {
          width: normalsData.width,
          height: normalsData.height,
          normalsData: normalsData.data,
          textureData: coloredTexture.imageData.data,
          index,
          options: {
            shiny: 1,
            specularity: 3,
            lx: size - 10,
            ly: size - 10 * reversedIndex,
            lz: 3,
          },
        },
        [normalsData.data.buffer],
      )
      reversedIndex--
    }
  })
