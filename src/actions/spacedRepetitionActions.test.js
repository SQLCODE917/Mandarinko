import * as actions from './spacedRepetitionActions'
import * as types from './actionTypes'

describe('Spaced Repetition Actions', () => {
  it('should create an action to set the current word', () => {
    const wordId = 'wordId'
    const expectedAction = {
      type: types.SET_CURRENT_WORD_ID,
      wordId
    }
    expect(actions.setCurrentWordId(wordId)).toEqual(expectedAction)
  })
})
