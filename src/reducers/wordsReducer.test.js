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

  it('should handle SET_CURRENT_WORD_ID', () => {
    const action = wordActions.setCurrentWordId('uuid.v4')
    const expectedState = {
      spacedRepetition: { currentWordId: 'uuid.v4' }
    }
    const baseState = { spacedRepetition: {} }
    expect(reducer(baseState, action)).toEqual(expectedState)
  })

  it('should handle LOADING', () => {
    const action = wordActions.setLoading('status')
    const expectedState = { loading: 'status' }
    expect(reducer({}, action)).toEqual(expectedState)
  })

  it('should handle SET_TOP_2K', () => {
    const action = wordActions.setTop2k('wordIds')
    const expectedState = { top2kWordIds: 'wordIds' }
    expect(reducer({}, action)).toEqual(expectedState)
  })

  it('should handle ERROR', () => {
    const action = wordActions.setError('error')
    const expectedState = { error: 'error' }
    expect(reducer({}, action)).toEqual(expectedState)
  })
})
