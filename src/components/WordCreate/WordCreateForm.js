import React from 'react'
import { reduxForm } from 'redux-form'
import styles from './WordCreateForm.css'
import submit from './WordSubmit'
import { WordTemplate } from './templates'

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
