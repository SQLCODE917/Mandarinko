import React from 'react'
import AutosuggestByDefinition,
  { AutosuggestByDefinition as Disconnected } from './AutosuggestByDefinition'
import { shallow, mount } from 'enzyme'
import {
  combineReducers,
  createStore,
  applyMiddleware
} from 'redux'
import { Provider } from 'react-redux'
import thunk from 'redux-thunk'
import {
  Field,
  Form,
  reducer as formReducer,
  reduxForm
} from 'redux-form'
import wordsReducer from '../../../reducers/wordsReducer'

describe('Autosuggest By Definition Field', () => {
  describe('shallow', () => {
    it('renders', () => {
      const props = {
        words: {}
      }
      const wrapper = shallow(<Disconnected {...props} />)
      const component = wrapper.find(Field)
      expect(component).toHaveLength(1)
    })
  });

  describe('mount', () => {
    let wrapper, store, submitSpy
    beforeEach(() => {
      submitSpy = jest.fn()
      store = createStore(
        combineReducers({
          form: formReducer,
          words: wordsReducer
        }),
        {
          words: { words: {} },
          form: {}
        },
        applyMiddleware(thunk)
      )

      const form = ({ onSubmit }) => 
        <Form onSubmit={onSubmit}>
          <AutosuggestByDefinition/>
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
    it('renders really well', () => {
      const component = wrapper.find(AutosuggestByDefinition)
      expect(component).toHaveLength(1)
    });
  });
})
