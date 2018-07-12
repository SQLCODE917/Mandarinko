import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Field } from 'redux-form'
import renderAutosuggestField from './renderAutosuggestField.js'
import {
  getSuggestions,
  renderSuggestion,
  getSuggestionValue
} from './ByDefinition.js'

export class AutosuggestByDefinition extends Component {
  render() {
    const { allWords } = this.props
    const fieldProps = {
      name: 'id',
      type: 'text',
      placeholder: 'Search by definition',
      component: renderAutosuggestField,
      getSuggestions: getSuggestions(allWords),
      renderSuggestion: renderSuggestion,
      getSuggestionValue: getSuggestionValue
    }
    return (
      <Field {...fieldProps} />
    )
  }
}

AutosuggestByDefinition.propTypes = {
  allWords: PropTypes.object
}

function mapStateToProps({ words }) {
  const { allWords } = words
  return {
    allWords
  }
}

export default connect(mapStateToProps)(AutosuggestByDefinition)
