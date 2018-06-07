import configureMockStore from 'redux-mock-store'
import reduxThunk from 'redux-thunk'
import React from 'react'
import { mount } from 'enzyme'
import { Provider } from 'react-redux'

import WordCreate from './WordCreate'

const mockStore = configureMockStore([reduxThunk])

describe('WordCreate', () => {
  let wrapper, store

  beforeEach(() => {
    const initialState = {}
    store = mockStore(initialState)
    wrapper = mount(
      <Provider store={store}>
        <WordCreate />
      </Provider>
    )
  })

  afterEach(() => {
    store.clearActions()
  })

  it('mounts', () => {
    expect(wrapper).toMatchSnapshot()
  })
})
