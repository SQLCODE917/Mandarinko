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
    const onSurveySubmit = spacedRepeatWord(word)
    const props = {
      word,
      onSurveySubmit
    }
    return render(
      <SpacedRepetition {...props} />,
      document.getElementById("react-container")
    )
  })

function spacedRepeatWord (word) {
  return (repetitionBucket) => {
    console.log(`Putting ${word.pronounciation} in the ${repetitionBucket} bucket`)
  }
}
