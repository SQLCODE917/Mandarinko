import React from 'react'
import {
  combineReducers,
  createStore,
  applyMiddleware,
  compose
} from 'redux'
import { Provider } from 'react-redux'
import thunk from 'redux-thunk'
import { reducer as formReducer } from 'redux-form'
import { mount } from 'enzyme'

import WordCreate from './WordCreate'

describe('WordCreate', () => {
  let wrapper, store

  beforeEach(() => {
    const initialState = {}
    store = createStore(
      combineReducers({
        form: formReducer
      }),
      applyMiddleware(thunk)
    )
    wrapper = mount(
      <Provider store={store}>
        <WordCreate />
      </Provider>
    )
  })

  it('mounts', () => {
    expect(wrapper).toMatchSnapshot()
  })

  it('triggers the error state on empty form submit', () => {
    const submitButton = wrapper.find('#WordSubmitButton')
    expect(submitButton).toHaveLength(1)
    submitButton.simulate('click')
    expect(wrapper).toMatchSnapshot()
  })
})
