import { createStore, applyMiddleware, compose } from 'redux'
import thunk from 'redux-thunk'

import reducers from '../reducers'
import initialState from './initialState'

const configureStore = () => {
  const notProd = process.env.NODE_ENV !== 'production' && window.devToolsExtension

  return createStore(
    reducers,
    initialState,
    // Apply thunk middleware and add support for Redux dev tools in Google Chrome
    notProd ?
      compose(applyMiddleware(thunk), window.devToolsExtension()) :
      applyMiddleware(thunk)

  )
}

export default configureStore;
