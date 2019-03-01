import React from 'react'
import { reduxForm } from 'redux-form'
import styles from './WordCreateForm.css'
import { WordTemplate, ErrorLine } from './templates'

export default function ({ onSubmit }) {
  const WordCreateForm = ({ error, onSubmit }) => {
    return (
      <form onSubmit={onSubmit}
        className={styles.wordCreateForm}>
        <WordTemplate />
        {error && <ErrorLine>{error}</ErrorLine>}
      </form>
    )
  }

  return reduxForm({
    form: 'wordCreate',
    keepDirtyOnReinitialize: true,
    onSubmit
  })(WordCreateForm)
}
