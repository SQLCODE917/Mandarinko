import React from 'react'
import { shallow } from 'enzyme'

import Word, { languageStyle } from './Word'
const testWord = require('../../testdata/testWord.json')

describe('Word', () => {
  it('renders', () => {
    const wrapper = shallow(<Word {...testWord}/>)
    expect(wrapper.find('.siblings')).toHaveLength(1)
    expect(wrapper.find('.children')).toHaveLength(1)
    expect(wrapper.find('.pronounciation')).toHaveLength(1)
    expect(wrapper.find('.derivation')).toHaveLength(1)
    expect(wrapper.find('.definition')).toHaveLength(1)
    expect(wrapper.find('Word')).toHaveLength(3)
  })

  describe('languageStyle', () => {
    it('returns style names for language codes', () => {
      expect(languageStyle('zh-Hant')).toEqual('zhHant')
      expect(languageStyle('zh-Hans')).toEqual('zhHans')
      expect(languageStyle('ja')).toEqual('ja')
    })
  })
})
