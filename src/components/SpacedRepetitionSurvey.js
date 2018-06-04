import styles from './SpacedRepetitionSurvey.css'

import PropTypes from 'prop-types'

export function SpacedRepetitionSurvey ({onSubmit}) { 
  return (
    <section className={styles.survey} >
      <span className={styles.again}
        onClick={() => {onSubmit("AGAIN")}}>
        Again (&lt;1 m)
      </span>
      <span className={styles.good}
        onClick={() => {onSubmit("GOOD")}}>
        Good (1 d)
      </span>
      <span className={styles.easy}
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

export default SpacedRepetitionSurvey
