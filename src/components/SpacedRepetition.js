import PropTypes from 'prop-types'

import SpacedRepetitionSurvey from './SpacedRepetitionSurvey'
import Word from './Word'

const SpacedRepetition = ({ word, onSurveySubmit }) => {
  return (
    <article>
      <Word {...word} />
      <SpacedRepetitionSurvey 
        onSubmit={onSurveySubmit}/>
    </article>
  )
}

SpacedRepetition.propTypes = {
  word: PropTypes.object.isRequired,
  onSurveySubmit: PropTypes.func
}

SpacedRepetition.defaultProps = {
  onSurveySubmit: () => {}
}
