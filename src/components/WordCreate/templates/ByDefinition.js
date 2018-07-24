import styles from './AutosuggestByDefinition.css'

// Teach Autosuggest how to calculate suggestions for any given input value.

export function getSuggestions(allWords) {
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

export function renderSuggestion(suggestion) {
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
export function getSuggestionValue({spelling}) {
  return spelling.reduce(
    (accumulator, { text }) => {
      return `${accumulator}[${text}]`
    },
    ''
  )
}
