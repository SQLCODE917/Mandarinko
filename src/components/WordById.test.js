import React from 'react'
import { shallow } from 'enzyme'
import { WordById as Disconnected } from './WordById'
import { Word } from './Word'
import ErrorLine from './errorLine'
const testWord = require('../../testdata/testWord.json')

describe('WordById', () => {
  const getWordSpy = jest.fn();
  //minimal viable props
  const mvprops = {
    match: { params: { id: "OTOO43" }},
    words: {},
    actions: { getWord: getWordSpy }
  }

  beforeEach(() => {
    getWordSpy.mockClear();
  })

  it('fetches a word on mount if its not in cache', () => {
    shallow(<Disconnected {...mvprops}/>)
    expect(getWordSpy).toHaveBeenCalledWith(mvprops.match.params.id)
  })

  it('does nothing on mount if its in the cache', () => {
    const props = {
      ...mvprops,
      words: { [mvprops.match.params.id]: testWord }
    }
    shallow(<Disconnected {...props}/>)
    expect(getWordSpy).not.toHaveBeenCalled()
  })

  it('renders the word when it exists', () => {
    const props = {
      ...mvprops,
      words: { [mvprops.match.params.id]: testWord }
    }
    const wrapper = shallow(<Disconnected {...props}/>)
    expect(wrapper.find(ErrorLine)).toHaveLength(0)
    expect(wrapper.find(Word)).toHaveLength(1)
  })

  it('renders a status message when it doesnt exist', () => {
    const wrapper = shallow(<Disconnected {...mvprops}/>)
    expect(wrapper.find(Word)).toHaveLength(0)
    expect(wrapper.find(ErrorLine)).toHaveLength(1)
  })
})
