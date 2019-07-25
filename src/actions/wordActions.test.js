import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'
import fetchMock from 'fetch-mock'

import * as actions from './wordActions'
import * as types from './actionTypes' 

const vocabulary = require('../../vocabulary.json')
const top2k = require('../../top2k.json')
const testWord = require('../../testdata/testWord.json')

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

  it( 'should create an error carrying action', () => {
    const error = 'error';
    const expected = { type: types.ERROR, error }
    expect( actions.setError( error ) ).toEqual( expected )
  })

  it( 'should set the current word ID', () => {
    const id = 'id'
    const expected = { type: types.SET_CURRENT_WORD_ID, id }
    expect( actions.setCurrentWordId( id ) ).toEqual( expected )
  })

  it( 'should set the loading status', () => {
    const status = true
    const expected = { type: types.LOADING, status }
    expect( actions.setLoading( status ) ).toEqual( expected )
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

  describe( '/word/:id', () => {
    it('gets a word by ID', async () => {
      fetchMock.once('/api/v0/word/0', testWord)

      const expectedActions = [
        actions.addWord( 0, testWord ),
      ]

      await store.dispatch( actions.getWord( 0 ) )
      const actual = store.getActions()
      expect( actual ).toEqual( expectedActions )
    })

    it( 'handles non-ok responses', async () => {
      fetchMock.once( '/api/v0/word/0', 404 )

      await store.dispatch( actions.getWord( 0 ) )
      const expected = [
        actions.setError( new Error( 'Not Found' ) )
      ]
      const actual = store.getActions()
      expect( actual ).toEqual( expected )
    })
  })

  describe( '/words/top2k', () => {
    it( 'gets a list of top 2k word ids', async () => {
      fetchMock.once( '/api/v0/words/top2k', top2k )

      const expectedActions = [
        actions.setTop2k( top2k ),
      ]

      await store.dispatch( actions.getTop2K() )
      const actual = store.getActions()
      expect( actual ).toEqual( expectedActions )
    })

    it( 'handles non-ok responses', async () => {
      fetchMock.once( '/api/v0/words/top2k', 404 )

      await store.dispatch( actions.getTop2K() )
      const expected = [
        actions.setError( new Error( 'Not Found' ) )
      ]
      const actual = store.getActions()
      expect( actual ).toEqual( expected )
    })
  })

  describe( '/words', () => {
    it( 'gets the entire vocabulary', async () => {
      fetchMock.once( '/api/v0/words', vocabulary )

      const expectedActions = [
        actions.addWords( vocabulary )
      ]

      await  store.dispatch( actions.getWords() )
      const actual = store.getActions()
      expect( actual ).toEqual( expectedActions )
    })

    it( 'handles non-ok responses', async () => {
      fetchMock.once( '/api/v0/words', 404 )

      await store.dispatch( actions.getWords() )
      const expected = [
        actions.setError( new Error( 'Not Found' ) )
      ]
      const actual = store.getActions()
      expect( actual ).toEqual( expected )
    })
  })

  describe( '/word/new', () => {
    it( 'creates a new word', async () => {
      fetchMock.post( '/api/v0/word/new', {
        body: { id: 'uuid.v4' },
        status: 201
      })
      fetchMock.once( '/api/v0/words', vocabulary )

      const id = await store.dispatch( actions.submitNewWord( { hello: 'world' } ))
      expect( id ).toEqual( 'uuid.v4' )
    })

    it( 'handles non-ok responses', async () => {
      fetchMock.once( '/api/v0/word/new', 404 )

      await store.dispatch( actions.submitNewWord( { hello: 'world' }))
      const expected = [
        actions.setError( new Error( 'Not Found' ))
      ]
      const actual = store.getActions()
      expect( actual ).toEqual( expected )
    })
  })
})
