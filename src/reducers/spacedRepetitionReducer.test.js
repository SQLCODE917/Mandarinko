import reducer from './spacedRepetitionReducer'
import * as actions from '../actions/spacedRepetitionActions'
import initialState from '../store/initialState'

describe('Spaced Repetition Reducer', () => {
  it('should return default state', () => {
    expect(reducer(void(0), {})).toEqual(initialState.spacedRepetition)
  })

  it('should handle SET_CURRENT_WORD_ID', () => {
    const action  = actions.setCurrentWordId('wordId')
    expect(reducer({}, action)).toEqual({
      currentWordId: 'wordId'
    })
  })
})
