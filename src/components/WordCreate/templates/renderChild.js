import React from 'react'
import { FormSection } from 'redux-form'
import * as c from '../../../constants'
import WordTemplate from './WordTemplate'
import ErrorLine from './errorLine'
import styles from './renderChild.css'

const renderChild = ({ fields, meta: { error, submitFailed } }) => (
  <section className={styles.childrenContainer}>
    <button className={styles.button}
      type="button"
      title="Add Child"
      onClick={() => fields.push({})}>
      {c.plusSign} Child
    </button>
    {submitFailed && error && <ErrorLine>{error}</ErrorLine>}
    {fields.map((wordObject, index) => (
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
    ))}
  </section>
);

export default renderChild 
