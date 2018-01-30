import React from 'react'
import { render } from 'react-dom'

import './static/css/app.css'
import Top2k from './components/Top2k'
import SpacedRepetition from './components/SpacedRepetition'

window.React = React

const SpacedRepeatTop2k = Top2k(SpacedRepetition)

render (
  <SpacedRepeatTop2k />,
  document.getElementById("react-container")
)
