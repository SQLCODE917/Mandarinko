import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import ErrorLine from './errorLine'
import Word from  './Word'
import * as actions from '../actions/wordActions'

export class WordById extends Component {
  componentDidMount() {
    const {
      match: { params: { id }},
      words,
      actions: {
        getWord 
      }
    } = this.props
    if (!words[id] ) {
      getWord(id)
    }
  }

  render() {
    const {
      match: { params: { id }},
      words
    } = this.props

    if( words[id] ) {
      return (
        <Word {...words[id]} />
      )
    } else {
      return (
        <ErrorLine>Looking up word {id}</ErrorLine>      
      )
    }
  }
}

/* istanbul ignore next */
function mapStateToProps({
  words
}) {
  return {
    words: words.words
  }
}

/* istanbul ignore next */
const mapDispatchToProps = dispatch => {
  return {
    actions: bindActionCreators(actions, dispatch)
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(WordById)
