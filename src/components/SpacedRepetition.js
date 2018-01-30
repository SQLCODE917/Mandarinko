import PropTypes from 'prop-types'

import SpacedRepetitionSurvey from './SpacedRepetitionSurvey'
import Word from './Word'

export const SpacedRepetition = ({ word, onSurveySubmit }) => {
  return (
    <article>
      <Word {...word} />
      <SpacedRepetitionSurvey 
        onSubmit={spacedRepeatWord}/>
    </article>
  )
}

SpacedRepetition.propTypes = {
  word: PropTypes.object.isRequired
}

function spacedRepeatWord (word) {
  return (repetitionBucket) => {
    console.log(`Putting ${word.pronounciation} in the ${repetitionBucket} bucket`)
  }
}
