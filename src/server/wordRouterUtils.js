const FS = require( 'fs' )
const Path = require( 'path' )
const UUIDv4 = require( 'uuid/v4' )

const VOCABULARY_PATH = Path.join( __dirname, '..', '..', 'vocabulary.json' )

function saveWord( word ) {
  const _word = { ...word }
  const id = UUIDv4();
  console.log("SAVING WORD", word, " ID ", id);

  return saveWordComponents( word.children )
    .then( ids => {
      _word.children = ids
      return saveWordComponents( word.siblings )
    }).then( ids => {
      _word.siblings = ids;
      return readFile( VOCABULARY_PATH )
    }).then( jsonString => {
      const vocabulary = JSON.parse( jsonString )
      vocabulary[id] = _word
      return writeFile( VOCABULARY_PATH, JSON.stringify( vocabulary ))
    }).then( () => {
      return id;
    })
}

function saveWordComponents( components=[] ) {
  return Promise.all( components.map( saveWord ))
}

function readFile( path, encoding='utf8') {
  return new Promise(( resolve, reject ) => {
    FS.readFile( path, encoding, ( err, contents ) => {
      if( err ) {
        reject( err )
      } else {
        resolve( contents )
      }
    })
  })
}

function writeFile( path, data, encoding='utf8' ) {
  return new Promise(( resolve, reject ) => {
    FS.writeFile( path, data, encoding, err => {
      if( err ) {
        reject( err )
      } else { 
        resolve()
      }
    }) 
  })
}

function wordById( id, vocabulary ) {
  const word = vocabulary[id]
  return explodeWord( word, vocabulary )
}

// `explode` word Ids into full word objects, recursively
function explodeWord( word, vocabulary ) {
  const siblings = deepResolveIDs( word, 'siblings', vocabulary )
  const children = deepResolveIDs( word, 'children', vocabulary )
  return {
    ...word,
    siblings,
    children
  }
}

function deepResolveIDs( word, propertyName, vocabulary ) {
  const ids = word[propertyName]? [...word[propertyName]] : []

  return ids.map(id => {
    const innerWord = vocabulary[id]
    if (innerWord[propertyName]) {
      const innerProperties = deepResolveIDs (innerWord, propertyName, vocabulary)
      innerWord[propertyName] = innerProperties
    }
    return innerWord
  })
}
module.exports = {
  saveWord,
  saveWordComponents,
  readFile,
  writeFile,
  wordById,
  explodeWord,
  deepResolveIDs
}
