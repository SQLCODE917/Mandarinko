import React from 'react'
import { mount } from 'enzyme'
import {
  FieldArray,
  Form,
  reducer as formReducer,
  reduxForm
} from 'redux-form'
import { Provider } from 'react-redux'
import thunk from 'redux-thunk'
import {
  combineReducers,
  createStore,
  applyMiddleware
} from 'redux'

import wordsReducer from '../../../reducers/wordsReducer'
import renderDefinition from './renderDefinition'

describe('renderDefinition', () => {
  let store, submitSpy, wrapper

  beforeEach(() => {
    submitSpy = jest.fn()
    store = createStore(
      combineReducers({
        form: formReducer,
        words: wordsReducer
      }),
      { form: {}, words: { words: {} } },
      applyMiddleware(thunk)
    )
    const form = ({ onSubmit }) => 
      <Form onSubmit={onSubmit}>
        <FieldArray
          name="definition"
          component={renderDefinition}
        />
      </Form>
    const WrappedForm = reduxForm({
      form: 'testForm',
      onSubmit: submitSpy 
    })(form)
    wrapper = mount(
      <Provider store={store}>
        <WrappedForm />
      </Provider>
    )
  })

  it('renders', () => {
    expect(wrapper).toMatchSnapshot()
  })

  it('adds a definition field when clicked', () => {
    wrapper.find('[title="Add Definition"]').simulate('click')
    wrapper.update()
    expect(wrapper.find('.definitionForm')).toHaveLength(1)
  })

  it('removes the definition field when clicked', () => {
    wrapper.find('[title="Add Definition"]').simulate('click')
    wrapper.update()
    expect(wrapper.find('.definitionForm')).toHaveLength(1)
    wrapper.find('[title="Remove Definition"]').simulate('click')
    wrapper.update()
    expect(wrapper.find('.definitionForm')).toHaveLength(0)
  })
})
