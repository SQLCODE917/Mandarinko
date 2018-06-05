import { Field, FieldArray } from 'redux-form'
import renderSibling from './renderSibling'
import renderSpelling from './renderSpelling'
import renderInputField from './renderInputField'
import renderDefinition from './renderDefinition'
import renderChild from './renderChild'
import styles from './WordTemplate.css'

const WordTemplate = () => (
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
)

export default WordTemplate
