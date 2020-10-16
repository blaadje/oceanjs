let fn = null

addEventListener('message', ({ data }) => {
  const { args, body, params, index } = data

  if (!fn) {
    fn = new Function(params, body)

    return
  }

  const imageData = fn.apply(null, args)

  postMessage({ imageData, index: index }, [imageData.buffer])
})
