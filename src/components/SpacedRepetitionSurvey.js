import '../static/css/SpacedRepetitionSurvey.css'

import PropTypes from 'prop-types'

export default function SpacedRepetitionSurvey ({onSubmit}) { 
  return (
    <section className="survey" >
      <span className="red button"
        onClick={() => {onSubmit("AGAIN")}}>
        Again (&lt;1 m)
      </span>
      <span className="green button"
        onClick={() => {onSubmit("GOOD")}}>
        Good (1 d)
      </span>
      <span className="blue button"
        onClick={() => {onSubmit("EASY")}}>
        Easy (4 d)
      </span>
    </section>
  )
}

SpacedRepetitionSurvey.propTypes = {
  onSubmit: PropTypes.func
}

SpacedRepetitionSurvey.defaultProps = {
  onSubmit: () => {}
}
