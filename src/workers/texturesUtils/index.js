import * as Comlink from 'comlink'

const blended = Comlink.wrap(
  new Worker('./blendedTexture.js', { type: 'module' }),
)
const create = Comlink.wrap(
  new Worker('./createTexture.js', { type: 'module' }),
)
const heightmap = Comlink.wrap(
  new Worker('./heightmapTexture.js', { type: 'module' }),
)
const normalFromHeightmap = Comlink.wrap(
  new Worker('./normalFromHeightmapTexture.js', { type: 'module' }),
)
const reflection = Comlink.wrap(
  new Worker('./reflectionTexture.js', { type: 'module' }),
)
const translate = Comlink.wrap(
  new Worker('./translateTexture.js', { type: 'module' }),
)

const workers = {
  blended,
  create,
  heightmap,
  normalFromHeightmap,
  reflection,
  translate,
}

export default workers
