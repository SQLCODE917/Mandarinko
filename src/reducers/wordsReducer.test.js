import reducer from './wordsReducer'
import initialState from '../store/initialState'
import * as wordActions from '../actions/wordActions'

describe('Words Reducer', () => {
  it('should return the initial state', () => {
    expect(reducer(void(0), {})).toEqual(initialState.words)
  })

  it('should handle ADD_WORD', () => {
    const addWord = wordActions.addWord('id', 'word')
    const expectedState = { 'id': 'word' }
    expect(reducer({}, addWord)).toEqual(expectedState)
  })
})
