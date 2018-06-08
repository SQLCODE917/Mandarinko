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

import WordCreate from './WordCreate'

describe('WordCreate', () => {
  let wrapper, store

  describe('on a clean slate', () => {
    beforeEach(() => {
      const initialState = {}
      store = reduxStore(initialState) 
      wrapper = enzymeWrapper(store) 
    })

    it('mounts', () => {
      expect(wrapper).toMatchSnapshot()
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
      expect(state.form.wordCreate.error).toEqual('Nothing Submitted!')
   
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

function enzymeWrapper(store) {
  return mount(
    <Provider store={store}>
      <WordCreate />
    </Provider>
  )
}
