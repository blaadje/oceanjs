let fn = null

addEventListener('message', ({ data }) => {
  const { args, body, params, index } = data

  if (!fn) {
    fn = new Function(params, body)

    return
  }

  const result = fn.apply(null, args)


  postMessage({ result, index }, [result.buffer])
})