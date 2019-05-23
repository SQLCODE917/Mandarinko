export {
  words,
  top2k,
  wordById,
  explodeWord,
  save
}

function words () {
  return require('../../../vocabulary.json')
}

function top2k () {
  return require('../../../top2k.json')
}

function wordById (id) {
  const vocabulary = words()
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
  console.debug("SAVING WORD", word)
  fetch( '/api/v0/word/new', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify( word )
  }).then( id => {
    console.log('WORD SAVED, ID', id)
  }).catch( e => {
    console.log('ERROR', e)
  })
}
