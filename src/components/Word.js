import Siblings from './Siblings'
import Spelling from './Spelling'
import Definition from './Definition'
import Children from './Children'

import '../static/css/Word.css'

import { Component } from 'react'
import PropTypes from 'prop-types'

export default class Word extends Component {
  render() {
    const {
      spelling,
      pronounciation,
      definition,
      derivation,
      children,
      siblings
    } = this.props

    return (
      <article className="word">
        <Siblings siblings={siblings}/>
        <article className="row main">
          <Spelling spelling={spelling}/>
          <section className="pronounciation">
            {pronounciation}
          </section>
        </article>
        <section className="derivation row">
          {derivation}
        </section>
        <Definition definition={definition}/>
        <Children children={children}/>
      </article>
    )
  }
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
