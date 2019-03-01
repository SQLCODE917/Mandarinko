import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import SpacedRepetition from './SpacedRepetition'

import * as wordActions from '../actions/wordActions'

export class Top2k extends Component {

  componentDidMount () {
    this.props.actions.getTop2K()
  }

  render () {
    const {
      loading,
      top2kWordIds
    } = this.props

    const finishedLoading = !loading && !!top2kWordIds.length

    return (finishedLoading)?
      <SpacedRepetition/> :
      <section>loading top 2k</section>
  }
}

function mapStateToProps({ top2kWordIds, words, loading}) {
  return {
    top2kWordIds,
    loading
  }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(wordActions, dispatch)
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Top2k)
