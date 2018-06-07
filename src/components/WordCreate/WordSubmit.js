import { SubmissionError } from 'redux-form';

function submit (values) {
  console.log("Submitted Word!", values);
  const isEmpty = (Object.keys(values).length === 0 && values.constructor === Object)
  if (isEmpty) {
    throw new SubmissionError(
      {
        _error: 'Nothing Submitted!'
      }
    )
  }
}

export default submit
