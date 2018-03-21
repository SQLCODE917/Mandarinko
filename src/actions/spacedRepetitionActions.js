import * as types from './actionTypes'
import { loading } from './loadingActions'

export function setCurrentWordId(wordId) {
  return { type: types.SET_CURRENT_WORD_ID, wordId }
}
