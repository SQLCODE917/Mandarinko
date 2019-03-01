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
  return dispatch => {
    dispatch(loading(true))
    const siblings = word.siblings || []
    const children = word.children || []

    const siblingIDs = siblings.map(save)
    const childrenIDs = children.map(save)
    return save({
      ...word,
      sibllings: siblingIDs,
      children: childrenIDs
    })
  }
}
