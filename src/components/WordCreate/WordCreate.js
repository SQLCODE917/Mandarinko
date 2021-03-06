import React, { Component } from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { SubmissionError } from 'redux-form'

import WordCreateForm from './WordCreateForm'
import WordSubmitButton from './WordSubmitButton'
import * as actions from '../../actions/wordActions'

export class WordCreate extends Component {
  constructor(props) {
    super(props);

    this.submitWord = this.submitWord.bind(this);
  }
  
  componentDidMount() {
    const { actions } = this.props
    actions.getWords()
  }
  
  submitWord (data) {
    const {
      actions: {
        submitNewWord      
      }
    } = this.props;
    const newWordId = submitNewWord(data)
  }

  render () {
    const Form = WordCreateForm({ onSubmit: this.submitWord });
    return (
      <section>
        <Form />
        <WordSubmitButton />
      </section>
    )
  }
}

/* istanbul ignore next */
function mapStateToProps({ words }) {
  return {
    words: words.words
  }
}

/* istanbul ignore next */
function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(actions, dispatch)
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(WordCreate)
