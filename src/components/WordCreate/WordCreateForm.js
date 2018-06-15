import React from 'react'
import { reduxForm } from 'redux-form'
import styles from './WordCreateForm.css'
import submit from './WordSubmit'
import { WordTemplate, ErrorLine } from './templates'

export const WordCreateForm = ({ error, onSubmit }) => {
  return (
    <form onSubmit={onSubmit}
      className={styles.wordCreateForm}>
      <WordTemplate />
      {error && <ErrorLine>{error}</ErrorLine>}
    </form>
  )
}

export default reduxForm({
  form: 'wordCreate',
  keepDirtyOnReinitialize: true,
  onSubmit: submit
})(WordCreateForm)
