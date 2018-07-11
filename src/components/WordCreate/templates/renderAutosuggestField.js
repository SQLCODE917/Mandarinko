import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Autosuggest from 'react-autosuggest'
import ErrorLine from './errorLine.js'
import styles from './renderAutosuggestField.css'
import theme from './AutosuggestTheme.css'

export default class renderAutosuggestField extends Component {
  constructor(props) {
    super(props)

    this.state = {
      value: '',
      suggestions: []
    }

    this.onChange = this.onChange.bind(this)
    this.onSuggestionSelected = this.onSuggestionSelected.bind(this)
    this.onSuggestionsClearRequested = this.onSuggestionsClearRequested.bind(this)
    this.onSuggestionsFetchRequested = this.onSuggestionsFetchRequested.bind(this)
  }

  // Autosuggest will call this function every time you need to clear suggestions.
  onSuggestionsClearRequested = () => {
    this.setState({
      value: '',
      suggestions: []
    })
  }

  onSuggestionsFetchRequested = ({ value }) => {
    const { getSuggestions } = this.props
    this.setState({
      suggestions: getSuggestions(value)
    })
  }

  onChange = (event, { newValue }) => {
    this.setState({
      value: newValue
    })
  }

  onSuggestionSelected = (event, { suggestion }) => {
    this.setState({
      value: suggestion.id
    })
    const { input } = this.props
    input.onChange(suggestion.id)
  }

  componentWillReceiveProps(nextProps) {
    const { input: { value } } = nextProps
    if (value !== void(0)) {
      this.setState({
        value
      })
    } 
  }
  
  render() {
    const {
      input,
      label,
      type,
      placeholder,
      meta: {
        touched,
        error
      },
      renderSuggestion,
      getSuggestionValue
    } = this.props

    const {
      value,
      suggestions
    } = this.state

    const inputProps = {
      placeholder,
      value,
      onChange: this.onChange,
      type
    }

    return (
      <div className={styles.autosuggestField}>
        <label>{label}</label>
        <div className={styles.autosuggestFieldBody}>
          <Autosuggest
            theme={theme}
            suggestions={suggestions}
            onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
            onSuggestionsClearRequested={this.onSuggestionsClearRequested}
            onSuggestionSelected={this.onSuggestionSelected}
            getSuggestionValue={getSuggestionValue}
            renderSuggestion={renderSuggestion}
            inputProps={inputProps}
          />
        </div>
        { touched && error && <ErrorLine>{error}</ErrorLine>}
      </div>
    )
  }
}

renderAutosuggestField.propTypes = {
  getSuggestions: PropTypes.func.isRequired,
  renderSuggestion: PropTypes.func.isRequired,
  getSuggestionValue: PropTypes.func.isRequired
}
