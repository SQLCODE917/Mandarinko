export const required = value => value ? undefined : 'Required'
export const atLeastOne = value => (value.length > 0) ? 
  undefined: 'Please include at least one'
