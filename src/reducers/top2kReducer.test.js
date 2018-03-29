import reducer from './top2kReducer'
import * as actions from '../actions/wordActions'
import initialState from '../store/initialState'

describe('Top2K Reducer', () => {
  it('should return default state', () => {
    expect(reducer(void(0), {})).toEqual(initialState.top2kWordIds)
  })

  it('should handle SET_TOP_2K', () => {
    const action = actions.setTop2k('wordIds')
    expect(reducer({}, action)).toEqual('wordIds')
  })
})
