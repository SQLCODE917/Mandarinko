import { Component } from 'react'
import { render } from 'react-dom'
import PropTypes from 'prop-types'

import { explodeWord } from '../modules/words/api'

import SpacedRepetitionSurvey from './SpacedRepetitionSurvey'
import Word from './Word'

export default class SpacedRepetition extends Component {
  constructor (props) {
    super (props)
  }

  render () {
    const { word, onSurveySubmit } = this.props
    return (
      <article>
        <Word {...word} />
        <SpacedRepetitionSurvey 
          onSubmit={onSurveySubmit}/>
      </article>
    )
  }
}

SpacedRepetition.propTypes = {
  word: PropTypes.object.isRequired,
  onSurveySubmit: PropTypes.func
}

SpacedRepetition.defaultProps = {
  onSurveySubmit: () => {}
}
