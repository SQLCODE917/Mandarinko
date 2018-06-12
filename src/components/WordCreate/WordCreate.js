import React, { Component } from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'

import WordCreateForm from './WordCreateForm'
import WordSubmitButton from './WordSubmitButton'
import * as actions from '../../actions/wordActions'

export class WordCreate extends Component {

  componentDidMount() {
    const { actions } = this.props
    actions.getWords()
  }
  
  render () {
    return (
      <section>
        <WordCreateForm />
        <WordSubmitButton />
      </section>
    )
  }
}

function mapStateToProps({ words }) {
  const { allWords } = words
  return {
    allWords
  }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(actions, dispatch)
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(WordCreate)
