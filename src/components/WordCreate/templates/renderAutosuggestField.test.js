import React from 'react'
import renderAutosuggestField from './renderAutosuggestField.js'
import {
  getSuggestions,
  renderSuggestion,
  getSuggestionValue
} from './ByDefinition.js'
import ErrorLine from './errorLine.js'

import { mount } from 'enzyme'

const allWords = require('../../../../testdata/testVocabulary.json')
const Autosuggest = renderAutosuggestField

describe('Autosuggest Word By Definition', () => {
  let wrapper, getSuggestionsSpy, inputChangeSpy

  beforeEach(() => {
    inputChangeSpy = jest.fn()
    const input = {
      onChange: inputChangeSpy
    }

    getSuggestionsSpy = jest.fn()
      .mockImplementation(getSuggestions(allWords))

    const props = {
      getSuggestions: getSuggestionsSpy,
      renderSuggestion: renderSuggestion,
      getSuggestionValue: getSuggestionValue,
      meta: {},
      type: 'text',
      input
    }
    wrapper = mount(<Autosuggest {...props}/>)
  })

  it('should render', () => {
    expect(wrapper).toMatchSnapshot()
  })

  it('should trigger autosuggest on input', () => {
    const searchString = 'a'
    const input = wrapper.find('input')
    input.value = searchString
    input.simulate('change', {
      target: {
        value: searchString
      }
    })

    expect(getSuggestionsSpy.mock.calls).toEqual([[searchString]])
  })

  it('should clear out suggestions when requested', () => {
    wrapper.setState({value: 'hello', suggestions: ['world']})
    expect(wrapper.state().value).toEqual('hello')
    const { onSuggestionsClearRequested } = wrapper.instance()
    onSuggestionsClearRequested()
    expect(wrapper.state()).toEqual({ value: '', suggestions: []})
  })

  it('should stimulate the input on suggestion selected', () => {
    const { onSuggestionSelected } = wrapper.instance()
    const suggestion = { id: 'id' }
    onSuggestionSelected('event', { suggestion })
    expect(inputChangeSpy).toHaveBeenCalledWith('id')
  })

  it('should update suggestion when updated in new props', () => {
    expect(wrapper.state().value).toEqual('')
    wrapper.setProps({ input: { value: 'hello' }})
    expect(wrapper.state().value).toEqual('hello')
  })

  it('should not update suggestion when none given in new props', () => {
    expect(wrapper.state().value).toEqual('')
    const { componentWillReceiveProps } = wrapper.instance()
    componentWillReceiveProps({ input: {}})
    expect(wrapper.state().value).toEqual('')
  })

  it('shows errors as they happen', () => {
    expect(wrapper.find(ErrorLine)).toHaveLength(0)
    wrapper.setProps({ meta: { touched: true, error: 'ayyyy' }})
    expect(wrapper.find(ErrorLine)).toHaveLength(1)
  })
})
