import React from 'react'
import styles from './renderInputField.css'
import ErrorLine from '../../errorLine.js'

const renderInputField = ({ input, label, type, meta: { touched, error } }) => (
  <div className={styles.inputField}>
    <label>{label}</label>
    <div className={styles.inputFieldBody}>
      <input className={styles.input}
        {...input}
        type={type}
        placeholder={label}
      />
      {touched && error && <ErrorLine>{error}</ErrorLine>}
    </div>
  </div>
)

export default renderInputField
