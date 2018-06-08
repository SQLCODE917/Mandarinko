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
import WordSubmitButton from './WordSubmitButton.js'

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

  it('should submit back that word object', () => {
    const submitButton = wrapper.find('#WordSubmitButton')
    expect(submitButton).toHaveLength(1)
    submitButton.simulate('click')
    expect(submitSpy.mock.calls.length).toBe(1)
    expect(submitSpy.mock.calls[0][0]).toEqual(testWord)
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
      <section>
        <Form />
        <WordSubmitButton />
      </section>
    </Provider>
  )
}
