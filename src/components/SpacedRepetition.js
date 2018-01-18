import { Component } from 'react'
import { render } from 'react-dom'
import PropTypes from 'prop-types'

import { explodeWord } from '../modules/words/api'

import SpacedRepetitionSurvey from './SpacedRepetitionSurvey'
import Word from './Word'

export default class SpacedRepetition extends Component {
  constructor (props) {
    super (props)
    this.spacedRepeatWord = this.spacedRepeatWord.bind(this)
  }

  spacedRepeatWord(word) {
    return (repetitionBucket) => {
      console.log(`Putting ${word.pronounciation} in the ${repetitionBucket} bucket`)
    }
  }

  render () {
    const { word } = this.props
    return render(
      <article>
        <Word {...word} />
        <SpacedRepetitionSurvey 
          onSubmit={this.spacedRepeatWord(word)}/>
      </article>,
      document.getElementById("react-container")
    )
  }
}

SpacedRepetition.propTypes = {
  word: PropTypes.object.isRequired
}
