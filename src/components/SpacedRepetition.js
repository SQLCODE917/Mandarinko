import React, { Component } from 'react'
import PropTypes from 'prop-types'

import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'

import * as wordActions from '../actions/wordActions'
import * as spacedRepetitionActions from '../actions/spacedRepetitionActions'
import * as loadingActions from '../actions/loadingActions'

import SpacedRepetitionSurvey from './SpacedRepetitionSurvey'
import Word from './Word'

class SpacedRepetition extends Component {

  componentWillReceiveProps(nextProps) {
    const { wordActions, words } = this.props
    const { currentWordId } = nextProps
    if (currentWordId !== void(0) && words && !words[currentWordId]) {
      wordActions.getWord(currentWordId)
    }
  }

  componentDidMount() {
    const { top2kWordIds, currentWordId } = this.props
    const { spacedRepetitionActions } = this.props
    if(currentWordId === void(0) && top2kWordIds && top2kWordIds.length) {
      spacedRepetitionActions.setCurrentWordId(top2kWordIds[0])
    }
  }

  render () {
    const { currentWordId, words, loading } = this.props
    const finishedLoading = (currentWordId !== void(0) && words && words[currentWordId])
    debugger;
    if (!finishedLoading) {
      return <section>loading spaced repetition</section>
    } else {
      const word = words[currentWordId]
      return (
        <article>
          <Word {...word} />
          <SpacedRepetitionSurvey 
            onSubmit={spacedRepeatWord}/>
        </article>
      )
    }
  }
}

function mapStateToProps({ words, loading }) {
  return {
    words,
    loading
  }
}

function mapStateToProps({spacedRepetition}) {
  return {
    ...spacedRepetition
  }
}

function mapDispatchToProps(dispatch) {
  return {
    loadingActions: bindActionCreators(loadingActions, dispatch),
    wordActions: bindActionCreators(wordActions, dispatch),
    spacedRepetitionActions: bindActionCreators(spacedRepetitionActions, dispatch)
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SpacedRepetition)

function spacedRepeatWord (word) {
  return (repetitionBucket) => {
    console.log(`Putting ${word.pronounciation} in the ${repetitionBucket} bucket`)
  }
}
