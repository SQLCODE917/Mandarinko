import React from 'react'
import { Field } from 'redux-form'
import * as c from '../../../constants.js'
import renderInputField from './renderInputField.js'
import ErrorLine from './errorLine.js'
import styles from './renderDefinition.css'
import {
  required
} from './WordFieldLevelValidation.js'

const renderDefinition = ({ fields, meta: { error, submitFailed } }) => (
  <section className={styles.definitionsContainer}>
    <button className={styles.button}
      type="button"
      title="Add Definition"
      onClick={() => fields.push({})}>
      {c.plusSign} Definition
    </button>
    {submitFailed && error && <ErrorLine>{error}</ErrorLine>}
    {fields.map((definitionObject, index) => (
      <article className={styles.definitionForm}
        key={index}>

        <button className={styles.button}
          type="button"
          title="Remove Definition"
          onClick={() => fields.remove(index)}
        >{c.minusSign}</button>

        <Field name={`${definitionObject}.text`}
          type="text"
          component={renderInputField}
          label="Definition"
          validate={[required]}>
        </Field>
      </article>
    ))}
  </section>
)

export default renderDefinition
