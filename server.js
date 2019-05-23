const Path = require( 'path' )

const express = require( 'express' )
const wordRouter = require( './wordRouter.js' )
const app = express()

app.set( 'port', ( process.env.PORT || 3000 ))

app.use( express.static( 'dist' ))
app.use( '/api/v0', wordRouter )

app.get( '/*', ( req, res ) => {
  res.sendFile( Path.join( __dirname, 'dist', 'index.html' ), err => {
    if ( err ) {
      res.status( 500 ).send( err )
    }
  })
})

app.listen( app.get( 'port' ), err => {
  if ( err ) {
    console.log( err )
    return
  }
  console.log( 'Running app at localhost:' + app.get( 'port' ))
})
