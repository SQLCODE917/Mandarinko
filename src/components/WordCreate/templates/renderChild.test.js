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
import renderChild from './renderChild'
import AutosuggestByDefinition from './AutosuggestByDefinition'
import WordTemplate from './WordTemplate'
import ErrorLine from './errorLine'

describe('renderChild', () => {
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
          name="children"
          component={renderChild}
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

  it('renders a blank word form', () => {
    expect(wrapper).toMatchSnapshot()
  })

  it('adds a lookup child form when clicked', () => {
    wrapper.find('[title="Look Up a Child"]').simulate('click')
    wrapper.update()
    expect(wrapper.find('.childForm')).toHaveLength(1)
    expect(wrapper.find(AutosuggestByDefinition)).toHaveLength(1)
  })

  it('adds a child form when clicked', () => {
    wrapper.find('[title="Add Child"]').simulate('click')
    wrapper.update()
    expect(wrapper.find('.childForm')).toHaveLength(1)
    expect(wrapper.find(WordTemplate)).toHaveLength(1)
  })

  it('removes the added child form when clicked', () => {
    wrapper.find('[title="Add Child"]').simulate('click')
    wrapper.update()
    expect(wrapper.find('.childForm')).toHaveLength(1)
    wrapper.find('[title="Remove Child"]').simulate('click')
    wrapper.update()
    expect(wrapper.find('.childForm')).toHaveLength(0)
  })

  it('removes the lookup child form when clicked', () => {
    wrapper.find('[title="Look Up a Child"]').simulate('click')
    wrapper.update()
    expect(wrapper.find('.childForm')).toHaveLength(1)
    expect(wrapper.find(AutosuggestByDefinition)).toHaveLength(1)
    wrapper.find('[title="Remove Child"]').simulate('click')
    wrapper.update()
    expect(wrapper.find('.childForm')).toHaveLength(0)
  })

  it('shows the error when necessary', () => {
    const props = {
      fields: [],
      meta: {
        error: 'ayyyy',
        submitFailed: true
      }
    }
    const wrapper = mount(<div>{renderChild(props)}</div>)
    expect(wrapper.find(ErrorLine)).toHaveLength(1)
  })
})
