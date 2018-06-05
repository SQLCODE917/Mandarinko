import React from 'react'
import { Field, FieldArray, FormSection, reduxForm } from 'redux-form'
import * as c from '../../constants.js'
import styles from './WordCreateForm.css'
import submit from './WordSubmit'

export function WordTemplate() {
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
        />
        <Field
          name="pronounciation"
          component={renderInputField}
          type="text"
          label="Pronounciation"
        />
        <section className={styles.definition}>
          <FieldArray
            name="definition"
            component={renderDefinition}
          />
          <div className={styles.addDefinition}/>
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
  );
}

const renderInputField = ({ input, label, type, meta: { touched, error } }) => (
  <div className={styles.inputField}>
    <label>{label}</label>
    <div className={styles.inputFieldBody}>
      <input {...input} type={type} placeholder={label} />
      {touched && error && <span className={styles.inputFieldError}>{error}</span>}
    </div>
  </div>
)

const renderDefinition = ({ fields, meta: { error, submitFailed } }) => (
  <section className={styles.definitionsContainer}>
    <button type="button"
      title="Add Definition"
      onClick={() => fields.push({})}>
      {c.plusSign} Definition
    </button>
    {submitFailed && error && <span>{error}</span>}
    {fields.map((definitionObject, index) => (
      <article className={styles.definitionForm}
        key={index}>

        <button type="button"
          title="Remove Definition"
          onClick={() => fields.remove(index)}
        >{c.minusSign}</button>

        <Field name={`${definitionObject}.text`}
          type="text"
          component={renderInputField}
          label="Definition">
        </Field>
      </article>
    ))}
  </section>
);

const renderSibling = ({ fields, meta: { error, submitFailed } }) => (
  <section className={styles.siblingsContainer}>
    <button type="button"
      title="Add Sibling"
      onClick={() => fields.push({})}>
      {c.plusSign} Sibling
    </button>
    {submitFailed && error && <span>{error}</span>}
    {fields.map((wordObject, index) => (
      <article className={styles.siblingForm}
        key={index}>

        <button type="button"
          title="Remove Sibling"
          onClick={() => fields.remove(index)}
        >{c.minusSign}</button>
        <FormSection name={`${wordObject}`}>
          <WordTemplate />
        </FormSection>
      </article>
    ))}
  </section>
);

const renderChild = ({ fields, meta: { error, submitFailed } }) => (
  <section className={styles.childrenContainer}>
    <button type="button"
      title="Add Child"
      onClick={() => fields.push({})}>
      {c.plusSign} Child
    </button>
    {submitFailed && error && <span>{error}</span>}
    {fields.map((wordObject, index) => (
      <article className={styles.childForm}
        key={index}>

        <button type="button"
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

const renderSpelling = ({ fields, meta: { error, submitFailed } }) => (
  <section className={styles.spellingContainer}>
    <button type="button" onClick={() => fields.push({
        language: "zh-Hant"
      })}>
      {c.plusSign} Spelling
    </button>
    {submitFailed && error && <span>{error}</span>}
    {fields.map((spellingObject, index) => (
      <article className={styles.spellingForm} key={index}>
        <button
          type="button"
          title="Remove Spelling"
          onClick={() => fields.remove(index)}
        >{c.minusSign}</button>
        <Field
          name={`${spellingObject}.text`}
          type="text"
          component={renderInputField}
          label="Spelling"
        />
        <Field
          name={`${spellingObject}.language`}
          component="select">
          <option value="zh-Hant">Traditional Chinese</option>
          <option value="zh-Hans">Simplified Chinese</option>
          <option value="ja">Japanese</option>
        </Field>
      </article>
    ))}
  </section>
)

export const WordCreateForm = (props) => {
  const { error, onSubmit } = props;
  return (
    <form onSubmit={onSubmit}
      className={styles.wordCreateForm}>
      <WordTemplate />
      {error && <strong>{error}</strong>}
    </form>
  )
}

export default reduxForm({
  form: 'wordCreate',
  onSubmit: submit
})(WordCreateForm)
