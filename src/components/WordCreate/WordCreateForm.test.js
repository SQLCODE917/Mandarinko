import React from 'react'
import {
  combineReducers,
  createStore,
  applyMiddleware,
  compose
} from 'redux'
import {
  Provider
} from 'react-redux'
import thunk from 'redux-thunk'
import {
  reducer as formReducer,
  reduxForm
} from 'redux-form'
import { mount } from 'enzyme'

import { WordCreateForm } from './WordCreateForm.js'

const testWord = require('../../../testdata/testWord.json')

describe('WordCreateForm', () => {
  let store, wrapper, submitSpy

  beforeEach(() => {
    store = reduxStore()
    submitSpy = jest.fn()
    wrapper = enzymeWrapper(store, testWord, submitSpy)
  })

  it('should render a word object', () => {
    expect(wrapper).toMatchSnapshot()
  })
})

function reduxStore(initialState = {}) {
  return createStore(
    combineReducers({
      form: formReducer
    }),
    initialState,
    applyMiddleware(thunk)
  )
}

function enzymeWrapper(store, initialValues, onSubmit) {
  const Form = reduxForm({
    form: 'wordCreate',
    onSubmit,
    initialValues
  })(WordCreateForm)

  return mount(
    <Provider store={store}>
      <Form />
    </Provider>
  )
}
