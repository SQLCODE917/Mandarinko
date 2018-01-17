import React from 'react'
import { render } from 'react-dom'

import './static/css/app.css'
import Word from './components/Word'
import SpacedRepetitionSurvey from './components/SpacedRepetitionSurvey'

window.React = React

getJSON('/v0/top2k').then((top2kWords) => {
  const wordIDs = top2kWords.words
  const id = wordIDs.pop()
  return getJSON(`/v0/word/${id}`)
}).then((word) => {
  return Promise.all([
    deepResolveIDs (word, 'siblings'),
    deepResolveIDs (word, 'children')
  ]).then((properties) => {
    return properties.reduce((word, property) => {
      return {
        ...word,
        ...property
      }
    }, word)
  })
}).then((word) => {
  const onSurveySubmit = spacedRepeatWord(word)
  return render(
    <article>
      <Word {...word} />
      <SpacedRepetitionSurvey onSubmit={onSurveySubmit}/>
    </article>,
    document.getElementById("react-container")
  )
}).catch((status, errorResponse) => {
  console.log("ERROR ", status, errorResponse);
})

function spacedRepeatWord(word) {
  return (repetitionBucket) => {
    console.log(`Putting ${word.pronounciation} in the ${repetitionBucket} bucket`)
  }
}

function deepResolveIDs (word, propertyName) {
  const ids = word[propertyName]? [...word[propertyName]] : []
  return Promise.all(ids.map((id) => {
    return getJSON(`/v0/word/${id}`)
      .then((innerWord) => {
        if (innerWord[propertyName]) {
          return deepResolveIDs (innerWord, propertyName)
            .then((innerProperties) => {
              return {
                ...innerWord,
                ...innerProperties
              }
            })
        } else {
          return innerWord
        }
      })
  })).then((propertyValue) => {
    const wordFragment = {}
    wordFragment[propertyName] = propertyValue
    return wordFragment
  })
}

function getJSON (url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      const status = xhr.status;
      if (status === 200) {
        resolve(xhr.response);
      } else {
        reject(status, xhr.response);
      }
    };
    xhr.send();
  })
}
