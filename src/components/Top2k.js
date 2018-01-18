import { Component } from 'react'
import { render } from 'react-dom'

import SpacedRepetition from './SpacedRepetition'
import {
  top2k,
  wordById,
  explodeWord } from '../modules/words/api'

export default class Top2k extends Component {

  constructor (props) {
    super (props)
    this.state = {
      currentWord: void(0)
    }
  }
  componentDidMount () {
    top2k()
      .then(({ words }) => wordById(words[0]))
      .then((word) => explodeWord(word))
      .then((word) => {
        this.setState({ currentWord: word })
      })
  }

  render () {
    const { currentWord } = this.state
    const props = {
      word: currentWord,
      onSurveySubmit: spacedRepeatWord (currentWord)
    }

    return (currentWord) ?
      <SpacedRepetition {...props} /> :
      <section>loading</section>
  }
}

function spacedRepeatWord (word) {
  return (repetitionBucket) => {
    console.log(`Putting ${word.pronounciation} in the ${repetitionBucket} bucket`)
  }
}
