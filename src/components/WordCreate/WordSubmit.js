import { SubmissionError } from 'redux-form';

function submit (values) {
  console.log("Submitted Word!", values);
  throw new SubmissionError(
    {
      _error:'Test Submission Error!'
    }
  )
}

export default submit
