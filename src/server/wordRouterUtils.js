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
      console.log("CHILDREN IDS", ids);
      return saveWordComponents( word.siblings )
    }).then( ids => {
      _word.siblings = ids;
      console.log("SIBLING IDS", ids);
      return readFile( VOCABULARY_PATH )
    }).then( jsonString => {
      console.log("VOCAB READ")
      const vocabulary = JSON.parse( jsonString )
      console.log("VOCAB PARSED")
      vocabulary[id] = _word
      return writeFile( VOCABULARY_PATH, JSON.stringify( vocabulary ))
    }).then( () => {
      console.log("RETURNING ID", id);
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
        console.log("READ ERROR", err)
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
        console.log("WRITE ERROR", err);
        reject( err )
      } else { 
        resolve()
      }
    }) 
  })
}

module.exports = {
  saveWord,
  saveWordComponents,
  readFile,
  writeFile
}
