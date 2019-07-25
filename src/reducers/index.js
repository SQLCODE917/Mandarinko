import { combineReducers } from 'redux'
import { reducer as formReducer } from 'redux-form'
import words from './wordsReducer'

const rootReducer = combineReducers({
  words,
  form: formReducer
});

export default rootReducer
