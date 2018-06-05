import styles from './renderInputField.css'

const renderInputField = ({ input, label, type, meta: { touched, error } }) => (
  <div className={styles.inputField}>
    <label>{label}</label>
    <div className={styles.inputFieldBody}>
      <input {...input} type={type} placeholder={label} />
      {touched && error && <span className={styles.inputFieldError}>{error}</span>}
    </div>
  </div>
)

export default renderInputField
