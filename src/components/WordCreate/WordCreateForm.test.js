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
  reduxForm,
  formValues,
  SubmissionError
} from 'redux-form'
import { mount } from 'enzyme'

import WordCreateForm from './WordCreateForm'
import WordSubmitButton from './WordSubmitButton'
import { ErrorLine } from './templates'

const testWord = require('../../../testdata/testWord.json')

describe('WordCreateForm', () => {
  let store, wrapper, submitSpy

  beforeEach(() => {
    store = reduxStore()
    submitSpy = jest.fn()
    wrapper = enzymeWrapper(store, submitSpy)
    enterRequired(wrapper, 'spelling', 'pronounciation', 'definition')
  })

  it('should render a word object', () => {
    expect(wrapper).toMatchSnapshot()
  })

  it('should submit back that word object', () => {
    const submitButton = wrapper.find('#WordSubmitButton')
    expect(submitButton).toHaveLength(1)
    submitButton.simulate('click')
    expect(submitSpy.mock.calls.length).toBe(1)
    const expectedWord = {
      spelling: [
        { language: 'zh-Hant', text: 'spelling' }
      ],
      pronounciation: 'pronounciation',
      definition: [
        { text: 'definition' }
      ]
    };

    expect(submitSpy.mock.calls[0][0]).toEqual(expectedWord)
  })

  it('should react to errors', () => {
    submitSpy.mockImplementationOnce(
      () => { throw new SubmissionError({ _error: 'ouch!'}) }
    )
    const submitButton = wrapper.find('#WordSubmitButton')
    expect(submitButton).toHaveLength(1)
    submitButton.simulate('click')
    wrapper.update()
    const errorLine = wrapper.find(ErrorLine)
    expect(errorLine).toHaveLength(1);
  });
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

function enzymeWrapper(store, onSubmit) {
  const Form = WordCreateForm({onSubmit});

  return mount(
    <Provider store={store}>
      <section>
        <Form />
        <WordSubmitButton />
      </section>
    </Provider>
  )
}

function enterRequired(wrapper, spelling, pronounciation, definition) {
  const addSpelling = wrapper.find({title: 'Add Spelling'})
  addSpelling.simulate('click')
  const spellingContainer = wrapper.find({className: 'spellingContainer'})
  const spellingInput = spellingContainer.find('input')
  spellingInput.simulate('change', {target: {value: spelling}})

  const pronounciationInput = wrapper.find({placeholder: 'Pronounciation'})
  pronounciationInput.simulate('change', {target: {value: pronounciation}})

  const addDefinitionButton = wrapper.find({title: 'Add Definition'})
  addDefinitionButton.simulate('click')
  const definitionsContainer = wrapper.find({className: 'definitionsContainer' })
  const definitionInput = definitionsContainer.find('input')
  definitionInput.simulate('change', {target: {value: definition}})
}
