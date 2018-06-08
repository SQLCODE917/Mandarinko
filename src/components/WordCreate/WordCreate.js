import React, { Component } from 'react'

import WordCreateForm from './WordCreateForm'
import WordSubmitButton from './WordSubmitButton'

export default class WordCreate extends Component {

  render () {
    return (
      <section>
        <WordCreateForm />
        <WordSubmitButton />
      </section>
    )
  }
}
