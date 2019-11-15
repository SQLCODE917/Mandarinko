import React from 'react'
import { BrowserRouter as Router, Route, Redirect, NavLink } from 'react-router-dom'

import styles from './app.css'
import { WordCreate } from './components/WordCreate'
import WordById from './components/WordById'
import Top2k from './components/Top2k'

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
                to="/words/new">Add word</NavLink>
            </li>
          </ul>
        </nav>
        <section>
          <Route path="/" exact render={() => <Redirect to="/top2k"/>}/>
          <Route path="/top2k" component={Top2k}/>
          <Route path="/word/:id" component={WordById}/>
          <Route path="/words/new" component={WordCreate}/>
        </section>
      </article>
    </Router>
  );
}

export default App
