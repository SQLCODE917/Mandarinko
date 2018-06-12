import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'
import fetchMock from 'fetch-mock'

import * as actions from './wordActions'
import * as loadingActions from './loadingActions'
import * as types from './actionTypes' 

const vocabulary = require('../../vocabulary.json')
const top2k = require('../../top2k.json')

const middlewares = [thunk]
const mockStore = configureMockStore(middlewares)

describe('Word Actions', () => {
  it('should create an action to set Top2k ids', () => {
    const wordIds = 'wordIds'
    const expectedAction = {
      type: types.SET_TOP_2K,
      wordIds
    }
    expect(actions.setTop2k(wordIds)).toEqual(expectedAction)
  })

  it('should create an action to add a word', () => {
    const [id, word] = ['id', 'word']
    const expectedAction = {
      type: types.ADD_WORD,
      id,
      word
    }
    expect(actions.addWord(id, word)).toEqual(expectedAction)
  })
})

describe('Async Word Actions', () => {
  beforeEach(() => {
    fetchMock.reset()
    fetchMock.restore()
  })

  it('gets a word by ID', () => {
    [0,1,2,3,4,5].forEach((id) => {
      fetchMock.once(`/v0/word/${id}`, vocabulary[id])
    })

    const store = mockStore({})

    const testWord = require('../../testdata/testWord.json')
    const expectedActions = [
      loadingActions.loading(true),
      actions.addWord(0, testWord),
      loadingActions.loading(false)
    ]

    return store.dispatch(actions.getWord(0))
      .then(() => {
        expect(store.getActions()).toEqual(expectedActions)
      })
  })

  it('gets a list of top 2k word ids', () => {
    fetchMock.once('/v0/top2k', top2k)

    const store = mockStore({})

    const expectedActions = [
      loadingActions.loading(true),
      actions.setTop2k([0]),
      loadingActions.loading(false)
    ]

    return store.dispatch(actions.getTop2K())
      .then(() => {
        expect(store.getActions()).toEqual(expectedActions)
      })
  })

  it('gets the entire vocabulary', () => {
    fetchMock.once('/v0/words', vocabulary)

    const store = mockStore({})

    const expectedActions = [
      loadingActions.loading(true),
      actions.addWords(vocabulary),
      loadingActions.loading(false)
    ]

    return store.dispatch(actions.getWords())
      .then(() => {
        expect(store.getActions()).toEqual(expectedActions)
      })
  })
})
