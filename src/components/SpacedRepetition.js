import React, { Component } from 'react'
import PropTypes from 'prop-types'

import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'

import * as wordActions from '../actions/wordActions'

import SpacedRepetitionSurvey from './SpacedRepetitionSurvey'
import Word from './Word'

class SpacedRepetition extends Component {

  componentWillReceiveProps(nextProps) {
    const {
      wordActions,
      words,
      currentWordId
    } = nextProps
    // at first, we would only have a word ID, but no word
    if (currentWordId !== void(0) && !words[currentWordId]) {
      wordActions.getWord(currentWordId)
    }
  }

  componentDidMount() {
    const {
      top2kWordIds,
      currentWordId,
      wordActions: {
        setCurrentWordId
      }
    } = this.props

    if(currentWordId === void(0)) {
      setCurrentWordId(top2kWordIds[0])
    }
  }

  render () {
    const {
      words,
      currentWordId
    } = this.props
    const finishedLoading =
      (currentWordId !== void(0)) && words[currentWordId];

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

SpacedRepetition.propTypes = {
  top2kWordIds: PropTypes.array.isRequired,
  currentWordId: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  words: PropTypes.object
}

function mapStateToProps({ words }) {

  return {
    words: words.words,
    top2kWordIds: words.top2kWordIds,
    currentWordId: words.spacedRepetition.currentWordId
  }
}

function mapDispatchToProps(dispatch) {
  return {
    wordActions: bindActionCreators(wordActions, dispatch)
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SpacedRepetition)

function spacedRepeatWord (word) {
  return (repetitionBucket) => {
    console.log(`Putting ${word.pronounciation} in the ${repetitionBucket} bucket`)
  }
}
