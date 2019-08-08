import {
  required,
  atLeastOne
} from './WordFieldLevelValidation'

describe('Word Field-Level Validation', () => {
  describe('required', () => {
    it('should not raise an issue when present', () => {
      expect(required('hello')).toEqual()
    })

    it('should raise an issue when not present', () => {
      expect(required()).toEqual('Required')
    })
  })

  describe('atLeastOne', () => {
    it('should not raise an issue when present', () => {
      expect(atLeastOne(['one'])).toEqual()
    })

    it('should raise an issue when not present', () => {
      expect(atLeastOne([])).toEqual('Please include at least one')
    })
  })
})
