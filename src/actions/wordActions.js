import * as types from './actionTypes'
import { loading } from './loadingActions'
import {
  words,
  top2k,
  wordById,
  explodeWord,
  save
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
    dispatch(addWords(words()))
  }
}

export function submitNewWord(word) {
  //minimize round trips to server, submit the whole thing
  save(word)
  /*
  return dispatch => {
    dispatch(loading(true))
    const errorModel = {
      siblings: [],
      children: []
    }
    const siblings = word.siblings || []
    const children = word.children || []

    const siblingIDs = []
    try {
      siblings.forEach((sibling, index) => {
        try {
          const siblingID = save(sibling)
          siblingIDs[index] = siblingID
        } catch (e) {
          errorModel.siblings[index] = e
          throw e
        }
      })
    } catch (e) {
      throw errorModel
    }

    const childrenIDs = []
    children.forEach((child, index) => {
      try {
        const childID = save(child)
        childrenIDs[index] = childID
      } catch (e) {
        errorModel.children[index] = e
        throw errorModel
      }
    })

    try {
      return save({
        ...word,
        sibllings: siblingIDs,
        children: childrenIDs
      })
    } catch (e) {
      errorModel.error = e
      throw errorModel
    }
  }*/
}
