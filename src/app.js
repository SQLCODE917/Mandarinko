import React from 'react'
import { BrowserRouter as Router, Route, Redirect, NavLink } from 'react-router-dom'

import styles from './app.css'
import SpacedRepetitionTop2k from './components/SpacedRepetitionTop2k'
import { WordCreate } from './components/WordCreate'

window.React = React

export const App = () => {
  return (
    <Router>
      <article className={styles.mainApp}>
        <nav className={styles.mainNav}>
          <div className={styles.logo}>
            <span className={styles.cartouche}>
              &#22269;&#35821;&#12371;
            </span>
            <span className={styles.logoText}>
              Mandarinko
            </span>
          </div>
          <ul>
            <li>
              <NavLink activeClassName={styles.selected}
                  to="/top2k">Top 2k</NavLink>
            </li>
            <li>
              <NavLink activeClassName={styles.selected}
                to="/word/new">Add word</NavLink>
            </li>
          </ul>
        </nav>
        <section>
          <Route path="/" exact render={() => <Redirect to="/top2k"/>}/>
          <Route path="/top2k" component={SpacedRepetitionTop2k}/>
          <Route path="/word/new" component={WordCreate}/>
        </section>
      </article>
    </Router>
  );
}

export default App
