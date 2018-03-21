import { combineReducers } from 'redux'
import words from './wordsReducer'
import top2kWordIds from './top2kReducer'
import loading from './loadingReducer'
import spacedRepetition from './spacedRepetitionReducer'

const rootReducer = combineReducers({
  words,
  top2kWordIds,
  loading,
  spacedRepetition
});

export default rootReducer
