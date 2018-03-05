import { Component } from 'react'
import { render } from 'react-dom'

import {
  top2k,
  wordById,
  explodeWord } from '../modules/words/api'

export default function Top2k (TranscludedComponent) {
  return class Top2k extends Component {

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
        word: currentWord
      }

      return (currentWord) ?
        <TranscludedComponent {...props} /> :
        <section>loading</section>
    }
  }
}
