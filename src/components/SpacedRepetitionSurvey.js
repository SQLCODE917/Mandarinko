import '../static/css/SpacedRepetitionSurvey.css'

import { Component } from 'react'
import PropTypes from 'prop-types'

export default class SpacedRepetitionSurvey extends Component {
  constructor (props) {
    super (props)
    this.submit = this.submit.bind(this)
  }

  submit (e) {
    e.preventDefault()
    const { _again, _good, _easy } = this.refs
    const { onSubmit } = this.props

    switch (e.currentTarget) {
      case _again:
        onSubmit("AGAIN")
        break;
      case _good:
        onSubmit("GOOD")
        break;
      case _easy:
        onSubmit("EASY")
        break;
      default:
        console.log("ERROR - check e.currentTarget");
        break;
    }
  }

  render () {
    return (
      <section className="survey" >
        <span ref="_again"
          className="red button"
          onClick={this.submit}>
          Again (&lt;1 m)
        </span>
        <span ref="_good"
          className="green button"
          onClick={this.submit}>
          Good (1 d)
        </span>
        <span ref="_easy"
          className="blue button"
          onClick={this.submit}>
          Easy (4 d)
        </span>
      </section>
    )
  }
}

SpacedRepetitionSurvey.propTypes = {
  onSubmit: PropTypes.func
}

SpacedRepetitionSurvey.defaultProps = {
  onSubmit: () => {}
}
