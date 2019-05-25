import * as types from './actionTypes'
import { loading } from './loadingActions'

export function addWords(words) {
  return { type: types.ADD_WORDS, words }
}
export function setTop2k(wordIds) {
  return { type: types.SET_TOP_2K, wordIds }
}

export function addWord(id, word) {
  return { type: types.ADD_WORD, ...{id, word}}
}

export function getTop2K() {
  return dispatch => {
    fetch( '/api/v0/words/top2k' ).then( response => {
      if( response.ok ) {
        response.json().then( ({ words }) => {
          dispatch( setTop2k( words ))
        })
      } else {
        throw new Error( response.status )
      }
    }).catch( e => {
      console.debug( 'ERROR', e )
    })
  }
}

export function getWord(id) {
  return dispatch => {
    fetch( `/api/v0/word/${id}` ).then( response => {
      if( response.ok ) {
        response.json().then( word => {
          dispatch( addWord( id, word ))
        })
      } else {
        throw new Error( response.status )
      }
    }).catch( e => {
      console.debug( 'ERROR', e )
    })
  }
}

export function getWords() {
  return dispatch => {
    fetch( '/api/v0/words' ).then( response => {
      if( response.ok ) {
        response.json().then( vocabulary => {
          dispatch(addWords(vocabulary))
        })
      } else {
        throw new Error (response.status)
      }
    }).catch( e => {
      console.debug( 'ERROR', e )
    })
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
