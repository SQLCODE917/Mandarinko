const {deepPick} = require('./src/util')

const fs = require('fs')
const path = require('path')
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

app.get('/v0/words', (req, res) => {
  res.header("Content-Type", 'application/json')
  res.send(data)
})

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
    if (err) {
      res.status(500).send(err)
    }
  })
})

app.listen(app.get('port'), (err) => {
  if (err) {
    console.log(err)
    return
  }
  console.log('Running app at localhost:' + app.get('port'))
})
