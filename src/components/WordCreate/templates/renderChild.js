import { FormSection } from 'redux-form'
import * as c from '../../../constants'
import WordTemplate from './WordTemplate'
import styles from './renderChild.css'

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

export default renderChild 
