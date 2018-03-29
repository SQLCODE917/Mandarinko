import reducer from './loadingReducer'
import * as loadingActions from '../actions/loadingActions'
import initialState from '../store/initialState'

describe('Loading Reducer', () => {
  it('should return the default state', () => {
    expect(reducer(void(0), {})).toEqual(initialState.loading)
  })

  it('should handle LOADING', () => {
    const action = loadingActions.loading(true)
    expect(reducer({}, action)).toEqual(true)
  })
})
