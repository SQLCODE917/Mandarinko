import reducer from './wordsReducer'
import { INITIAL_STATE } from '../reducers/wordsReducer'
import * as wordActions from '../actions/wordActions'

describe('Words Reducer', () => {
  it('should return the initial state', () => {
    expect(reducer(void(0), {})).toEqual(INITIAL_STATE)
  })

  it('should handle ADD_WORD', () => {
    const addWord = wordActions.addWord('0', 'word')
    const expectedState = { words: { '0': 'word' } }
    expect(reducer({}, addWord)).toEqual(expectedState)
  })

  it('should handle ADD_WORDS', () => {
    const addWords = wordActions.addWords('words')
    const expectedState = { 'allWords': 'words' }
    expect(reducer({}, addWords)).toEqual(expectedState)
  })
})
