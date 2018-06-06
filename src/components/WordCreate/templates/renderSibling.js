import { FormSection } from 'redux-form'
import WordTemplate from './WordTemplate'
import * as c from '../../../constants'
import styles from './renderSibling.css'

const renderSibling = ({ fields, meta: { error, submitFailed } }) => (
  <section className={styles.siblingsContainer}>
    <button className={styles.button}
      type="button"
      title="Add Sibling"
      onClick={() => fields.push({})}>
      {c.plusSign} Sibling
    </button>
    {submitFailed && error && <span>{error}</span>}
    {fields.map((wordObject, index) => (
      <article className={styles.siblingForm}
        key={index}>

        <button className={styles.button}
          type="button"
          title="Remove Sibling"
          onClick={() => fields.remove(index)}
        >{c.minusSign}</button>
        <FormSection name={`${wordObject}`}>
          <WordTemplate />
        </FormSection>
      </article>
    ))}
  </section>
)

export default renderSibling
