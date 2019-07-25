import React from 'react'
import {
  combineReducers,
  createStore,
  applyMiddleware
} from 'redux'
import {
  connect,
  Provider
} from 'react-redux'
import thunk from 'redux-thunk'
import {
  reducer as formReducer,
  formValueSelector
} from 'redux-form'
import { mount } from 'enzyme'

import { WordCreate } from './WordCreate'

describe('WordCreate', () => {
  let wrapper, store, subscriptionSpy, actions

  describe('on a clean slate', () => {
    beforeEach(() => {
      actions = {
        getWords: jest.fn(),
        submitNewWord: jest.fn()
      }
      const props = {
        actions
      }
      store = reduxStore( {} )
      subscriptionSpy = jest.fn()
      store.subscribe( subscriptionSpy )
      wrapper = enzymeWrapper( store, props ) 
    })

    afterEach(() => {
      actions.getWords.mockClear()
      actions.submitNewWord.mockClear()
      subscriptionSpy.mockClear()
    })

    it('mounts', () => {
      expect( wrapper ).toMatchSnapshot()
    })

    it('requests all the words', () => {
      expect( actions.getWords ).toHaveBeenCalledTimes( 1 )
    })

    it('submits a new word to the dictionary', () => {
      const form = wrapper.find( WordCreate )
      const instance = form.instance()
      const data = { hello: 'word' }
      instance.submitWord( data )
      expect( actions.submitNewWord ).toHaveBeenCalledWith( data )
    })

    it('triggers the error state on empty form submit', () => {
      const submitButton = wrapper.find('#WordSubmitButton')
      expect(submitButton).toHaveLength(1)
      submitButton.simulate('click')
      expect(wrapper).toMatchSnapshot()
      const state = store.getState()
      // seems that official tests just reach into the state
      // and pull our the error messages:
      // https://github.com/davidkpiano/react-redux-form/blob/master/test/form-component-spec.js
      const expectedErrors = {
        spelling: { _error: 'Required' },
        pronounciation: 'Required',
        definition: { _error: 'Required' }
      }
      expect(state.form.wordCreate.syncErrors).toEqual(expectedErrors)
   
      /*
      const selector = formValueSelector('wordCreate')
      const values = selector(state, 'error')
      */
    })
  })
})

function reduxStore(initialState) {
  return createStore(
    combineReducers({
      form: formReducer
    }),
    initialState,
    applyMiddleware(thunk)
  )
}

function enzymeWrapper(store, props) {
  return mount(
    <Provider store={store}>
      <WordCreate {...props}/>
    </Provider>
  )
}
