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
      top2kWordIds
    } = this.props

    const finishedLoading = top2kWordIds && !!top2kWordIds.length

    console.log("top2K finished loading?", finishedLoading, top2kWordIds);
    return (finishedLoading)?
      <SpacedRepetition/> :
      <section>loading top 2k</section>
  }
}

function mapStateToProps({
  words: {
    top2kWordIds
  }
}) {
  return {
    top2kWordIds
  }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(wordActions, dispatch)
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Top2k)
