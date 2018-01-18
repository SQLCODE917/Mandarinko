import React from 'react'
import { render } from 'react-dom'

import './static/css/app.css'
import Top2k from './components/Top2k'

window.React = React

render (
  <Top2k />,
  document.getElementById("react-container")
)
