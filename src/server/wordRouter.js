const FS = require( 'fs' )
const Path = require( 'path' )
const express = require( 'express' )
const utils = require( './wordRouterUtils.js' )

const VOCABULARY_PATH = Path.join( __dirname, '..', '..', 'vocabulary.json' )
const TOP2K_PATH = Path.join( __dirname, '..', '..', 'top2k.json' )

const wordRouter = express.Router();
wordRouter.use(express.json())

// get the entire vocabulary
wordRouter.get( '/words', ( req, res ) => {
  utils.readFile( VOCABULARY_PATH )
    .then( jsonString => {
      res.status( 200 ).send( jsonString )
    })
    .catch( err => {
      console.log( err )
      res.status( 500 ).send( err.code )
    })
})

// get IDs for top 2k
wordRouter.get( '/words/top2k', ( req, res ) => {
  utils.readFile( TOP2K_PATH )
    .then( jsonString => {
      res.status( 200 ).send( jsonString )
    })
    .catch( err => {
      console.log( err )
      res.status( 500 ).send( err.code )
    })
})


// save a new word,
// including siblings and children, recursively
wordRouter.post( '/word/new', ( req, res ) => {
  const save = utils.saveWord( req.body )
    .then( id => {
      res.status( 201 ).send( { id } )
    })

  save.catch( err => {
    console.log( err )
    res.status( 500 ).send( err.code )
  })
})

wordRouter.get( '/word/:id', ( req, res ) => {
  const { id } = req.params
  const read = utils.readFile( VOCABULARY_PATH )
    .then( jsonString => {
      const vocabulary = JSON.parse( jsonString )
      const word = utils.wordById( id, vocabulary )
      res.status( 200 ).send( word )
    })

  read.catch( err => {
    console.log( err )
    res.status( 500 ).send( err.code )
  })
})

module.exports = wordRouter
