import { combineReducers } from 'redux'
import { reducer as formReducer } from 'redux-form'
import words from './wordsReducer'
import top2kWordIds from './top2kReducer'
import loading from './loadingReducer'
import spacedRepetition from './spacedRepetitionReducer'

const rootReducer = combineReducers({
  words,
  top2kWordIds,
  loading,
  spacedRepetition,
  form: formReducer
});

export default rootReducer
