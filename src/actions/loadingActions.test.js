import * as actions from './loadingActions'
import * as types from './actionTypes'

describe('Loading Actions', () => {
  it('should create an action to set the loading status', () => {
    const status = true
    const expectedAction = {
      type: types.LOADING,
      status
    }
    expect(actions.loading(status)).toEqual(expectedAction)
  })
})
