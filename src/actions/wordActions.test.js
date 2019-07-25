import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'
import fetchMock from 'fetch-mock'

import * as actions from './wordActions'
import * as types from './actionTypes' 

const vocabulary = require('../../vocabulary.json')
const top2k = require('../../top2k.json')

const mockStore = configureMockStore([thunk])

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
  let store;

  beforeEach(() => {
    store = mockStore( {} )
  });

  afterEach(() => {
    fetchMock.restore()
    store.clearActions()
  })

  it('gets a word by ID', async () => {
    const testWord = require('../../testdata/testWord.json')
    fetchMock.once('/api/v0/word/0', testWord)

    const expectedActions = [
      actions.addWord( 0, testWord ),
    ]

    await store.dispatch( actions.getWord( 0 ))
    const actual = store.getActions()
    expect( actual ).toEqual( expectedActions )
  })

  it('gets a list of top 2k word ids', async () => {
    fetchMock.once( '/api/v0/words/top2k', top2k )

    const expectedActions = [
      actions.setTop2k( top2k ),
    ]

    await store.dispatch( actions.getTop2K() )
    const actual = store.getActions()
    expect( actual ).toEqual( expectedActions )
  })

  it('gets the entire vocabulary', async () => {
    fetchMock.once( '/api/v0/words', vocabulary )

    const expectedActions = [
      actions.addWords( vocabulary )
    ]

    await  store.dispatch(actions.getWords())
    const actual = store.getActions()
    expect( actual ).toEqual( expectedActions )
  })
})
