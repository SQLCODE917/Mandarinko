export {
  words,
  top2k,
  wordById,
  explodeWord
}

function words () {
  return getJSON('/v0/words')
}

function top2k () {
  return getJSON('/v0/top2k')
}

function wordById (id) {
  return getJSON(`/v0/word/${id}`)
}

// `explode` word Ids into full word objects, recursively
function explodeWord (word) {
  return Promise.all([
      deepResolveIDs (word, 'siblings'),
      deepResolveIDs (word, 'children')
    ]).then((properties) => {
      return properties.reduce((word, property) => {
        return {
          ...word,
          ...property
        }
      }, word)
    })
}

function deepResolveIDs (word, propertyName) {
  const ids = word[propertyName]? [...word[propertyName]] : []
  return Promise.all(ids.map((id) => {
    return wordById(id)
      .then((innerWord) => {
        if (innerWord[propertyName]) {
          return deepResolveIDs (innerWord, propertyName)
            .then((innerProperties) => {
              return {
                ...innerWord,
                ...innerProperties
              }
            })
        } else {
          return innerWord
        }
      })
  })).then((propertyValue) => {
    const wordFragment = {}
    wordFragment[propertyName] = propertyValue
    return wordFragment
  })
}

function getJSON (url) {
  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw Error(response.statusText)
      }
      return response.json()
    }).catch(e => {
      console.log(`Error fetching ${url}`)
      throw e
    })
}
