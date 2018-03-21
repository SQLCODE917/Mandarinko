import * as types from '../actions/actionTypes'
import initialState from '../store/initialState'

export default function wordsReducer(state=initialState.words, action) {
  switch (action.type) {
    case types.ADD_WORD:
      const {id, word} = action
      const newWord = {}
      newWord[id] = word
      return Object.assign({}, state, newWord);
    default:
      return state
  }
}
