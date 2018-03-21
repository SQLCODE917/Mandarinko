import React from 'react'
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom'

import './static/css/app.css'
import SpacedRepetitionTop2k from './components/SpacedRepetitionTop2k'
import WordCreate from './components/WordCreate'

window.React = React

const App = () => {
  return (
    <Router>
      <section>
        <Route path="/" exact render={() => <Redirect to="/top2k"/>}/>
        <Route path="/top2k" component={SpacedRepetitionTop2k}/>
        <Route path="/word/new" component={WordCreate}/>
      </section>
    </Router>
  );
}

export default App
