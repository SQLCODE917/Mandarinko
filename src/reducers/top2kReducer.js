import * as types from '../actions/actionTypes'
import initialState from '../store/initialState'

export default function top2kReducer(state=initialState.top2kWordIds, action) {
  switch (action.type) {
    case types.SET_TOP_2K:
      return action.wordIds
    default:
      return state
  }
}
