import React from 'react'
import { Field, FieldArray } from 'redux-form'
import renderSibling from './renderSibling'
import renderSpelling from './renderSpelling'
import renderInputField from './renderInputField'
import renderDefinition from './renderDefinition'
import renderChild from './renderChild'
import styles from './WordTemplate.css'

import {
  required,
  atLeastOne
} from './WordFieldLevelValidation.js'

export default function WordTemplate () {
  return (
  <article className={styles.word}>
    <section className={styles.siblings}>
      <FieldArray
        name="siblings"
        component={renderSibling}
      />
    </section>
    <article className={styles.main}>
      <FieldArray
        name="spelling"
        component={renderSpelling}
        validate={[required, atLeastOne]}
      />
      <Field
        name="pronounciation"
        component={renderInputField}
        type="text"
        label="Pronounciation"
        validate={[required]}
      />
      <section className={styles.definition}>
        <FieldArray
          name="definition"
          component={renderDefinition}
          validate={[required, atLeastOne]}
        />
      </section>
    </article>
    <section className={styles.derivation}>
      <Field
        name="derivation"
        component={renderInputField}
        type="text"
        label="Derivation"
      />
    </section>
    <section className={styles.children}>
      <FieldArray
        name="children"
        component={renderChild}
      />
    </section>
  </article>
  )
}
