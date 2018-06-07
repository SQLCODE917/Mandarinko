import React from 'react'
import { connect } from 'react-redux'
import { submit } from 'redux-form'

const WordSubmit = ({ dispatch }) => (
  <button
    id="WordSubmitButton"
    type="button"
    onClick={() => dispatch(submit('wordCreate'))}
  >
    Submit
  </button>
)

export default connect()(WordSubmit)
