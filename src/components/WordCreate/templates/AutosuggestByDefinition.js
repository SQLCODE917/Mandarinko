import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Field } from 'redux-form'
import renderAutosuggestField from './renderAutosuggestField.js'
import styles from './AutosuggestByDefinition.css'

export class AutosuggestByDefinition extends Component {
  render() {
    const { allWords } = this.props
    const fieldProps = {
      name: 'id',
      type: 'text',
      placeholder: 'Search by definition',
      component: renderAutosuggestField,
      getSuggestions: this.getSuggestions(allWords),
      renderSuggestion: this.renderSuggestion,
      getSuggestionValue: this.getSuggestionValue
    }
    return (
      <Field {...fieldProps} />
    )
  }

	// Teach Autosuggest how to calculate suggestions for any given input value.
	getSuggestions(allWords) {
    return (value) => {
      const inputValue = value.trim().toLowerCase()
      const inputLength = inputValue.length

      if (inputLength === 0) {
        return []
      } else {
        const suggestions = Object.entries(allWords)
          .filter(([id, word]) => {
              return word.definition.some((entry) => {
                return (entry.toLowerCase().indexOf(inputValue) !== -1)
              })
            }
          ).map(([id, word]) => {
            return { ...word, id }
          })
        return (suggestions) ? suggestions : []
      }
    }
  }

  renderSuggestion(suggestion) {
    return (
    <article>
      <section className={styles.suggestionSpelling}>
        {suggestion.spelling.map((entry) => `${[entry.text]}`)}
      </section>
      <section>
        <ul className={styles.suggestionDefinitionList}>
        {suggestion.definition.map(
          (entry, index) => <li className={styles.suggestionDefinition} key={index}>{entry}</li>
        )}
        </ul>
      </section>
    </article>
    )
  }

  // When suggestion is clicked, Autosuggest needs to populate the input
  // based on the clicked suggestion. Teach Autosuggest how to calculate the
  // input value for every given suggestion.
  getSuggestionValue(suggestion) {
    return suggestion.id
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
