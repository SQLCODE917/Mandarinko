import * as types from './actionTypes'
import { loading } from './loadingActions'
import {
  words,
  top2k,
  wordById,
  explodeWord } from '../modules/words/api'

export function setTop2k(wordIds) {
  return { type: types.SET_TOP_2K, wordIds }
}

export function getTop2K() {
  return dispatch => {
    dispatch(loading(true))
    return top2k()
      .then(({ words }) => {
        dispatch(setTop2k(words))
        dispatch(loading(false))
      })
  }
}

export function addWord(id, word) {
  return { type: types.ADD_WORD, ...{id, word}}
}

export function getWord(id) {
  return dispatch => {
    dispatch(loading(true))
    return wordById(id)
      .then((word) => explodeWord(word))
      .then((word) => {
        dispatch(addWord(id, word))
        dispatch(loading(false))
      })
  }
}

export function addWords(words) {
  return { type: types.ADD_WORDS, words }
}

export function getWords() {
  return dispatch => {
    dispatch(loading(true))
    return words()
      .then((words) => {
        dispatch(addWords(words))
        dispatch(loading(false))
      })
  }
}
