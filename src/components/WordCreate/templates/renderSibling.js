import React from 'react'
import { FormSection } from 'redux-form'
import WordTemplate from './WordTemplate.js'
import AutosuggestByDefinition from './AutosuggestByDefinition.js'
import ErrorLine from './errorLine.js'
import * as c from '../../../constants'
import styles from './renderSibling.css'


const renderSibling = ({ fields, meta: { error, submitFailed } }) => (
  <section className={styles.siblingsContainer}>
    <button className={styles.button}
      type="button"
      title="Add Sibling"
      onClick={() => fields.push({})}>
      {c.plusSign} Sibling
    </button>
    <button className={styles.button}
      type="button"
      title="Look Up a Sibling"
      onClick={() => fields.push({ "lookup": true })}>
      {c.rightPointingMagnifyingGlass} Sibling
    </button>
    {submitFailed && error && <ErrorLine>{error}</ErrorLine>}
    {fields.map((wordObject, index) => {
      const thisField = fields.get(index)
      if( thisField.lookup ) {
        return (
        <article className={styles.siblingForm}
          key={index}>
          <button className={styles.button}
            type="button"
            title="Remove Sibling"
            onClick={() => fields.remove(index)}
          >{c.minusSign}</button>
          <FormSection name={`${wordObject}`}>
            <AutosuggestByDefinition />
          </FormSection>
        </article>
        ) 
      } else { 
        return (
        <article className={styles.siblingForm}
          key={index}>

          <button className={styles.button}
            type="button"
            title="Remove Sibling"
            onClick={() => fields.remove(index)}
          >{c.minusSign}</button>
          <FormSection name={`${wordObject}`}>
            <WordTemplate />
          </FormSection>
        </article>
      )
    }
    })}
  </section>
)

export default renderSibling
