export const getVertices = (vertices, size, position) => {
  return vertices.map(({ x, y, z }) => {
    const updatedX = x * (size / 2) + position.x
    const updatedY = y * position.y + 200
    const updatedZ = z * (size / 2) + position.z - 600

    return new Vertex(updatedX, updatedY, updatedZ)
  })
}

export const getSubVertices = ({ x, y, z }, subVerticesAmount, size) => {
  const divideNumber = subVerticesAmount
  const vertexAmount = divideNumber + 1

  const array = [...new Array(vertexAmount)]

  return array.map((_, indexX) => {
    const segmentSize = size / divideNumber
    const positionX = x + segmentSize * indexX

    return array.map((_, indexZ) => {
      const positionZ = z + segmentSize * indexZ
      const positionY = y

      return new Vertex(positionX, positionY, positionZ)
    })
  })
}
