import React from 'react'
import renderAutosuggestField from './renderAutosuggestField.js'
import {
  getSuggestions,
  renderSuggestion,
  getSuggestionValue
} from './ByDefinition.js'

import { mount } from 'enzyme'

const allWords = require('../../../../vocabulary.json')
const Autosuggest = renderAutosuggestField

describe('Autosuggest Word By Definition', () => {

  it('should render', () => {
    const props = {
      getSuggestions: getSuggestions(allWords),
      renderSuggestion: renderSuggestion,
      getSuggestionValue: getSuggestionValue,
      meta: {},
      type: 'text'
    }
    const wrapper = mount(<Autosuggest {...props}/>)
    expect(wrapper).toMatchSnapshot()
  })

  it('should trigger autosuggest on input', () => {
    const searchString = 'a'
    const getSuggestionsSpy = jest.fn()
    getSuggestionsSpy.mockImplementation(getSuggestions(allWords))
    const props = {
      getSuggestions: getSuggestionsSpy,
      renderSuggestion: renderSuggestion,
      getSuggestionValue: getSuggestionValue,
      meta: {},
      type: 'text'
    }
    const wrapper = mount(<Autosuggest {...props}/>)
    const input = wrapper.find('input')
    input.value = searchString
    input.simulate('change', {
      target: {
        value: searchString
      }
    })

    expect(getSuggestionsSpy.mock.calls).toEqual([[searchString]])
  })

  it('should offer the right autosuggest options', () => {
    const suggestions = getSuggestions(allWords)
    const expected = [
      {
        "definition": ["(n) insistence, assertion"],
        "id": "5",
        "pronounciation": "しゅちょう",
        "spelling": [
          {
            "language": "ja",
            "text": "主張"
          }
        ]
      }
    ]
    expect(suggestions('assertion')).toEqual(expected)
  })

  it('should offer an empty list for no matches', () => {
    const suggestions = getSuggestions(allWords)
    const expected = []
    expect(suggestions('notaword')).toEqual(expected)
  })

  it('should offer an empty list for whitespace input', () => {
    const suggestions = getSuggestions(allWords)
    const expected = []
    expect(suggestions('     ')).toEqual(expected)
  })
})
