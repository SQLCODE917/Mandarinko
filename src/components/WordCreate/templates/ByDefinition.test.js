import React from 'react'
import { mount } from 'enzyme'
import {
  getSuggestions,
  renderSuggestion,
  getSuggestionValue
} from './ByDefinition'

const allWords = require('../../../../testdata/testVocabulary.json')

describe('By Definition', () => {
  describe('getSuggestions', () => {
    it('should return an empty set for no input', () => {
      const suggestions = getSuggestions({})('');
      expect(suggestions).toEqual([]);
    })

    it('should return words on definition match', () => {
      const suggestions = getSuggestions(allWords)('vi')
      const expected = [
        {
          "children": [
            1,
            2
          ],
          "definition": [
            "(n) view, position, proposition",
            "(v) advocate, stand for, maintain, hold"
          ],
          "derivation": "",
          "id": "0",
          "pronounciation": "zhu(3)zhang(1)",
          "siblings": [
            5
          ],
          "spelling": [
            {
              "language": "zh-Hans",
              "text": "主张"
            },
            {
              "language": "zh-Hant",
              "text": "-張"
            }
          ]
        }
      ]
      expect(suggestions).toEqual(expected)
    })

    it('should return an empty set on no match', () => {
      const suggestions = getSuggestions(allWords)('ayyyyyyyyyy')
      expect(suggestions).toEqual([])
    })
  })

  describe('renderSuggestion', () => {
    it('should render', () => {
      const suggestion = getSuggestions(allWords)('vi').pop()
      const wrapper = mount(
        <div>
          {renderSuggestion(suggestion)}
        </div>
      )
      expect(wrapper).toMatchSnapshot()
    }) 
  })

  describe('getSuggestionValue', () => {
    it('formats it as a string', () => {
      const suggestion = getSuggestions(allWords)('vi').pop()
      const value = getSuggestionValue(suggestion)
      expect(value).toEqual('[主张][-張]')
    })
  })
})
