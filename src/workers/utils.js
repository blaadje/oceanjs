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

export const createNewImageFromData = async (data, newSize) => {
  const imageSize = Math.sqrt(data.length) / 2
  const imageData = new ImageData(data, imageSize, imageSize)

  const resizedImage = await createImageBitmap(imageData, {
    resizeHeight: newSize,
    resizeWidth: newSize,
  })

  return resizedImage
}

const constrain = (n, low, high) => {
  return Math.max(Math.min(n, high), low)
}

export const map = async (n, start1, stop1, start2, stop2, withinBounds) => {
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
