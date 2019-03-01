import uuid from 'uuid'
const vocabulary = require('../../../vocabulary.json')
const top2kWords = require('../../../top2k.json')

export {
  words,
  top2k,
  wordById,
  explodeWord,
  save
}

function words () {
  return vocabulary
}

function top2k () {
  return top2kWords 
}

function wordById (id) {
  return vocabulary[id]
}

// `explode` word Ids into full word objects, recursively
function explodeWord (word) {
  const siblings = deepResolveIDs (word, 'siblings')
  const children = deepResolveIDs (word, 'children')
  return {
    ...word,
    siblings,
    children
  }
}

function deepResolveIDs (word, propertyName) {
  const ids = word[propertyName]? [...word[propertyName]] : []

  return ids.map(id => {
    const innerWord = wordById(id)
    if (innerWord[propertyName]) {
      const innerProperties = deepResolveIDs (innerWord, propertyName)
      innerWord[propertyName] = innerProperties
    }
    return innerWord
  })
}

function save (word) {
  const id = uuid.v4()
  console.debug("SAVING WORD", word, "as", id)
  return id
}
