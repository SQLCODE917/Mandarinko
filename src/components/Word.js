import React from 'react'
import styles from './Word.css'

import PropTypes from 'prop-types'

export function languageStyle(language) {
  switch(language) {
    case 'zh-Hant': return styles.zhHant;
    case 'zh-Hans': return styles.zhHans;
    case 'ja': return styles.ja;
  }
}

export function Word({
    spelling,
    pronounciation,
    definition,
    derivation,
    children,
    siblings
	}){ 

	return (
		<article className={styles.word}>
			<section className={styles.siblings}>
				{siblings.map((sibling, i) => 
					<Word key={i} {...sibling} />
				)}
			</section>
			<article className={styles.wordBody}>
				<section className={styles.spelling}>
					{spelling.map((spellingObject, i) =>
						<span 
              className={`${styles.spellingForm} ${languageStyle(spellingObject.language)}`} key={i}>
							{spellingObject.text}
						</span>
					)}
				</section>
        <section className="pronounciation">
          {pronounciation}
        </section>
			</article>
			<section className={styles.derivation}>
				{derivation}
			</section>
			<section className={styles.definition}>
				{definition.map((definitionItem, i) =>
					<div key={i}>
						{definitionItem}
					</div>
				)}
			</section> 
			<section className={styles.children}>
				{children.map((child, i) => 
					<Word key={i} {...child}/>
				)}
			</section>
		</article>
	)
}

Word.propTypes = {
  spelling: PropTypes.array.isRequired,
  pronounciation: PropTypes.string.isRequired,
  definition: PropTypes.array.isRequired,
  derivation: PropTypes.string,
  children: PropTypes.array,
  siblings: PropTypes.array
}

Word.defaultProps = {
  derivation: "",
  children: [],
  siblings: []
}

export default Word;
