import React from 'react'
import { render } from 'react-dom'
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom'

import './static/css/app.css'
import Top2k from './components/Top2k'
import SpacedRepetition from './components/SpacedRepetition'

window.React = React

const SpacedRepeatTop2k = Top2k(SpacedRepetition)

render (
  <Router>
    <section>
      <Route path="/" exact render={() => <Redirect to="/top2k"/>}/>
      <Route path="/top2k" component={SpacedRepeatTop2k}/>
    </section>
  </Router>,
  document.getElementById("react-container")
)
