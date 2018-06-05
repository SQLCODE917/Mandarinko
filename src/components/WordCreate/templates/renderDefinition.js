import { Field } from 'redux-form'
import * as c from '../../../constants.js'
import styles from './renderDefinition.css'

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
)

export default renderDefinition
