import { Field } from 'redux-form'
import * as c  from '../../../constants.js'
import renderInputField from './renderInputField.js'
import ErrorLine from './errorLine.js'
import styles from './renderSpelling.css'

const renderSpelling = ({ fields, meta: { error, submitFailed } }) => (
  <section className={styles.spellingContainer}>
    <button className={styles.button}
      type="button"
      onClick={() => fields.push({
        language: "zh-Hant"
      })}>
      {c.plusSign} Spelling
    </button>
    {submitFailed && error && <ErrorLine>{error}</ErrorLine>}
    {fields.map((spellingObject, index) => (
      <article className={styles.spellingForm} key={index}>
        <button className={styles.button}
          type="button"
          title="Remove Spelling"
          onClick={() => fields.remove(index)}
        >
          {c.minusSign}
        </button>
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
 export default renderSpelling
