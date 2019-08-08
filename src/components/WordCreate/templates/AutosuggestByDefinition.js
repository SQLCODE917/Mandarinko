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
    const { words } = this.props
    const fieldProps = {
      name: 'id',
      type: 'text',
      placeholder: 'Search by definition',
      component: renderAutosuggestField,
      getSuggestions: getSuggestions(words),
      renderSuggestion: renderSuggestion,
      getSuggestionValue: getSuggestionValue
    }
    return (
      <Field {...fieldProps} />
    )
  }
}

AutosuggestByDefinition.propTypes = {
  words: PropTypes.object
}

/* istanbul ignore next */
const mapStateToProps = ({ words }) => ( { words: words.words } )

export default connect(mapStateToProps)(AutosuggestByDefinition)
