import * as types from '../actions/actionTypes'
import initialState from '../store/initialState'

export default function loadingReducer(state=initialState.loading, action) {
  switch (action.type) {
    case types.LOADING:
      return action.status
    default:
      return state
  }
}
