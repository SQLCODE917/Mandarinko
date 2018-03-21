import * as types from '../actions/actionTypes'
import initialState from '../store/initialState'

export default function spacedRepetitionReducer(state=initialState.spacedRepetition, action) {
  switch (action.type) {
    case types.SET_CURRENT_WORD_ID:
      return Object.assign({},
        state,
        { currentWordId: action.wordId })
    default:
      return state
  }
}
