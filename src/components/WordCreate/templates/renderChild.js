import React from 'react'
import { FormSection } from 'redux-form'
import WordTemplate from './WordTemplate'
import AutosuggestByDefinition from './AutosuggestByDefinition.js'
import ErrorLine from './errorLine'
import * as c from '../../../constants'
import styles from './renderChild.css'

const renderChild = ({ fields, meta: { error, submitFailed } }) => (
  <section className={styles.childrenContainer}>
    <button className={styles.button}
      type="button"
      title="Add Child"
      onClick={() => fields.push({})}>
      {c.plusSign} Child
    </button>
    <button className={styles.button}
      type="button"
      title="Look Up a Child"
      onClick={() => fields.push({ "lookup": true })}>
      {c.rightPointingMagnifyingGlass} Child
    </button>
    {submitFailed && error && <ErrorLine>{error}</ErrorLine>}
    {fields.map((wordObject, index) => {
      const thisField = fields.get(index)
      if( thisField.lookup) {
        return (
        <article className={styles.childForm}
          key={index}>
          <button className={styles.button}
            type="button"
            title="Remove Child"
            onClick={() => fields.remove(index)}
          >{c.minusSign}</button>
          <FormSection name={`${wordObject}`}>
            <AutosuggestByDefinition />
          </FormSection>
        </article>
        )
      } else {
        return (
        <article className={styles.childForm}
          key={index}>

          <button className={styles.button}
            type="button"
            title="Remove Child"
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
);

export default renderChild 
