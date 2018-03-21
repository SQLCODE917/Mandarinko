import * as types from './actionTypes'

export function loading(status) {
  return { type: types.LOADING, status }
}
