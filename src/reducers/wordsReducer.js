import * as types from '../actions/actionTypes'

export const INITIAL_STATE = {
  top2kWordIds: [],
  words: {},
  loading: false,
  spacedRepetition: {
    currentWordId: void(0),
    again: [],
    good: [],
    easy: []
  },
  error: void(0)
}

export default function wordsReducer(state=INITIAL_STATE, action) {
  switch (action.type) {
    case types.ADD_WORD:
      const {id, word} = action
      return {
        ...state,
        words: {
          ...state.words,
          [id]: word
        }
      };
    case types.ADD_WORDS:
      const { words } = action;
      return {
        ...state,
        allWords: words
      }
    case types.SET_CURRENT_WORD_ID:
      return {
        ...state,
        spacedRepetition: {
          ...state.spacedRepetition,
          currentWordId: action.id
        }
      }
    case types.LOADING:
      return {
        ...state,
        loading: action.status
      }
    case types.SET_TOP_2K:
      return {
        ...state,
        top2kWordIds: action.wordIds
      }
      return action.wordIds
    case types.ERROR: {
      return {
        ...state,
        error: action.error
      }
    }
    default:
      return state
  }
}
