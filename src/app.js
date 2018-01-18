import React from 'react'
import { render } from 'react-dom'

import './static/css/app.css'
import SpacedRepetition from './components/SpacedRepetition'

import {
  top2k,
  wordById,
  explodeWord } from './modules/words/api'

window.React = React

top2k()
  .then(({ words }) => wordById(words[0]))
  .then((word) => explodeWord(word))
  .then((word) => {
    return render(
      <SpacedRepetition word={word} />,
      document.getElementById("react-container")
    )
  })
