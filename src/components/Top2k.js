import React, { Component } from 'react'

export default function Top2k (TranscludedComponent) {
  return class Top2k extends Component {

    componentDidMount () {
      this.props.actions.getTop2K()
    }

    render () {
      const finishedLoading = !this.props.loading &&
        !!this.props.top2kWordIds

      return (finishedLoading)?
        <TranscludedComponent {...this.props} /> :
        <section>loading top 2k</section>
    }
  }
}
