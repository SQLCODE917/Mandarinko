const { render } = ReactDOM

const getJSON = (url) => {
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

const Word = ({ 
  spelling,
  pronounciation,
  definition,
  derivation=void(0),
  children=[],
  siblings=[]}) =>
  <article className="word">
    <section className="siblings">
      {siblings.map((sibling, i) =>
        <Word key={i} {...sibling}/>
      )}
    </section>
    <section className="spelling">
      {spelling.map((spellingObject, i) =>
        <div key={i}>
          {spellingObject.text}
        </div>
      )}
    </section>
    <section className="pronounciation">
      {pronounciation}
    </section>
    <section className="derivation">
      {derivation}
    </section>
    <section className="definition">
      {definition.map((definitionItem, i) =>
        <div key={i}>
          {definitionItem}
        </div>
      )}
    </section>
    <section className="children">
      {children.map((child, i) =>
        <Word key={i} {...child}/>
      )}
    </section>
  </article>

function deepResolveIDs (word, propertyName) {
  const ids = word[propertyName]? [...word[propertyName]] : []
  return Promise.all(ids.map((id) => {
    return getJSON(`/v0/word/${id}`)
      .then((innerWord) => {
        if (innerWord[propertyName]) {
          return deepResolveIDs (innerWord, propertyName)
            .then((deepWords) => {
              return {
                ...innerWord,
                ...deepWords
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

getJSON('/v0/top2k').then((top2kWords) => {
  console.log("TOP 2k WORDS", top2kWords)
  const wordIDs = top2kWords.words
  const id = wordIDs.pop()
  return getJSON(`/v0/word/${id}`)
}).then((word) => {
  console.log("WORD", word)
  return Promise.all([
    deepResolveIDs (word, 'siblings'),
    deepResolveIDs (word, 'children')
  ]).then((properties) => {
    console.log("PROPERTIES", properties)
    return properties.reduce((word, property) => {
      return {
        ...word,
        ...property
      }
    }, word)
  })
}).then((word) => {
  console.log("WORD RESOLVED", word)
  return render(
    <Word {...word} />,
    document.getElementById("react-container")
  )
}).catch((status, errorResponse) => {
  console.log("ERROR ", status, errorResponse);
})
