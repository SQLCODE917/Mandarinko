import * as types from './actionTypes'
import { loading } from './loadingActions'
import {
  words,
  top2k,
  wordById,
  explodeWord,
} from '../modules/words/api'

export function setTop2k(wordIds) {
  return { type: types.SET_TOP_2K, wordIds }
}

export function getTop2K() {
  return dispatch => {
    const { words } = top2k()
    dispatch(setTop2k(words))
  }
}

export function addWord(id, word) {
  return { type: types.ADD_WORD, ...{id, word}}
}

export function getWord(id) {
  return dispatch => {
    const word = explodeWord(wordById(id))
    dispatch(addWord(id, word))
  }
}

export function addWords(words) {
  return { type: types.ADD_WORDS, words }
}

export function getWords() {
  return dispatch => {
    fetch( '/api/v0/words' ).then( vocabulary => {
      dispatch(addWords(vocabulary))
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
