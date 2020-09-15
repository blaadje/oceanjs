import * as Comlink from 'comlink'
import Vertex from '../Vertex'

const array2DFromImage = (array, imageWidth) => {
  const updatedArray = []
  const rgba = 4
  let xDimensionArray = []
  let u = 1

  for (let i = 0; i < array.length; i += rgba) {
    xDimensionArray.push({
      r: array[i],
      g: array[i + 1],
      b: array[i + 2],
    })

    if (u >= imageWidth) {
      updatedArray.push(xDimensionArray)
      xDimensionArray = []
      u = 0
    }

    u++
  }

  return updatedArray
}

const updatedVerticesFromTexture = (
  vertexAmount,
  verticesArray,
  texture,
  factor = 0.01,
) => {
  const resizedImageSize = texture.width
  const array2D = array2DFromImage(texture.data, resizedImageSize)
  const gapBetweenPixels = Math.floor(resizedImageSize / vertexAmount)
  const updatedArray = [...verticesArray]
  let u = 0
  let f = 0
  let a = 0
  let b = 0

  for (; a <= resizedImageSize; ) {
    for (; b <= resizedImageSize; ) {
      if (u >= updatedArray.length || f >= updatedArray.length) {
        break
      }

      const { r: red } = array2D[b][a]
      const { x, y, z } = updatedArray[f][u]

      updatedArray[f][u] = new Vertex(x, y, z + red * factor)

      b += gapBetweenPixels
      u++
    }
    a += gapBetweenPixels
    f++
    u = 0
    b = 0
  }

  return updatedArray
}

const volumeFromTexture = (getSubVertices, texture, factor) => {
  const vertexAmount = getSubVertices[0].length
  const updatedSubVertices = updatedVerticesFromTexture(
    vertexAmount,
    getSubVertices,
    texture,
    factor,
  )

  return updatedSubVertices
}

Comlink.expose(volumeFromTexture)
