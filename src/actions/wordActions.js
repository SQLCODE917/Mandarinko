import * as types from './actionTypes'

export function addWords(words) {
  return { type: types.ADD_WORDS, words }
}
export function setTop2k(wordIds) {
  return { type: types.SET_TOP_2K, wordIds }
}

export function addWord(id, word) {
  return { type: types.ADD_WORD, ...{id, word}}
}

export function setCurrentWordId(id) {
  return { type: types.SET_CURRENT_WORD_ID, id }
}

export function setLoading( status ) {
  return { type: types.LOADING, status }
}

export function setError( error ) {
  return { type: types.ERROR, error }
}

export const getTop2K = () => async dispatch => {
  try {
    const resp = await fetch( '/api/v0/words/top2k' )

    if( !resp.ok ) {
      throw new Error( resp.statusText )
    }

    const words = await resp.json()
    dispatch( setTop2k( words ))
  } catch( error ) {
    dispatch( setError( error ))
  }
}

export const getWord = ( id ) => async dispatch => {
  try {
    const resp = await fetch( `/api/v0/word/${id}` )
    
    if( !resp.ok ) {
      throw new Error( resp.statusText )
    }
    
    const word = await resp.json()
    dispatch( addWord( id, word ))
  } catch( error ) {
    dispatch( setError( error ))
  }
}

export const getWords = () => async dispatch => {
  try {
    const resp = await fetch( '/api/v0/words' )

    if( !resp.ok ) {
      throw new Error( resp.statusText )
    }

    const vocabulary = await resp.json()
    dispatch( addWords( vocabulary ))
  } catch( error ) {
    dispatch( setError( error ))
  }
}

export function submitNewWord(word) {
  //minimize round trips to server, submit the whole thing
  return dispatch => {
    fetch( '/api/v0/word/new', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify( word )
    }).then( response => {
      const { ok, status } = response
      if( ok && status === 201 ) {
        response.json().then( id => {
          console.debug('WORD SAVED', id)
          dispatch( getWords() )
        })
      } else {
        throw new Error( status )
      }
    }).catch( e => {
      console.debug('ERROR', e)
    })
  }
}
