const {deepPick} = require('./src/util')

const fs = require('fs')
const express = require('express')

const app = express()
app.set('port', (process.env.PORT || 3000))

app.use(express.static('dist'))

const data = JSON.parse(fs.readFileSync('vocabulary.json'))

app.get('/v0/word/:wordId', (req, res) => {
  const wordId = deepPick("params.wordId", req)
  res.header("Content-Type",'application/json')
  res.send(data[wordId])
})

app.get('/v0/top2k', (req, res) => {
  const data = JSON.parse(fs.readFileSync('top2k.json'))
  res.header("Content-Type",'application/json')
  res.send(data)
})

app.listen(app.get('port'), (err) => {
    if (err) {
          console.log(err)
          return
        }
    console.log('Running app at localhost:' + app.get('port'))
})
