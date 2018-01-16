const { render } = ReactDOM

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
    <article className="row main">
      <section className="spelling">
        {spelling.map((spellingObject, i) =>
          <span className={`spelling-form ${spellingObject.language}`} key={i}>
            {spellingObject.text}
          </span>
        )}
      </section>
      <section className="pronounciation">
        {pronounciation}
      </section>
    </article>
    <section className="derivation row">
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
  return render(
    <Word {...word} />,
    document.getElementById("react-container")
  )
}).catch((status, errorResponse) => {
  console.log("ERROR ", status, errorResponse);
})

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
