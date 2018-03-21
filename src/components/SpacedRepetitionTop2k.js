import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as wordActions from '../actions/wordActions'
import Top2k from './Top2k'
import SpacedRepetition from './SpacedRepetition'


const SpacedRepeatTop2k = Top2k(SpacedRepetition)

function mapStateToProps({ top2kWordIds, words, loading}) {
  return {
    top2kWordIds,
    words,
    loading
  }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(wordActions, dispatch)
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SpacedRepeatTop2k)
