import React, { Component } from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'

import WordCreateForm from './WordCreateForm'
import WordSubmitButton from './WordSubmitButton'

export class WordCreate extends Component {
  componentWillReceiveProps(nextProps) {
    const { form } = nextProps
    if (form.values !== this.props.form.values) {
      console.log("FORM CHANGED", form.values);    
    }
  }

  render () {
    return (
      <section>
        <WordCreateForm />
        <WordSubmitButton />
      </section>
    )
  }
}

WordCreate.propTypes = {
  form: PropTypes.object.isRequired
}

function mapStateToProps({form}) {
  return { form }
}

export default connect(mapStateToProps)(WordCreate)
