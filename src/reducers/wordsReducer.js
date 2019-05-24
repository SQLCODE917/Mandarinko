import * as types from '../actions/actionTypes'
import initialState from '../store/initialState'

export default function wordsReducer(state=initialState.words, action) {
  switch (action.type) {
    case types.ADD_WORD:
      const {id, word} = action
      return {
        ...state,
        [id]: word
      };
    case types.ADD_WORDS:
      const { words } = action;
      return {
        ...state,
        allWords: words
      }
    default:
      return state
  }
}
