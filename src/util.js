const deepPick = (fields, object={}) => {
  const [first, ...rest] = fields.split(".")
  return (rest.length) ?
    deepPick(rest.join("."), object[first]) :
    object[first]
}

module.exports = {
  deepPick
}
