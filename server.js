const path = require('path')

const express = require('express')

const app = express()

app.set('port', (process.env.PORT || 3000))

app.use(express.static('dist'))

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
