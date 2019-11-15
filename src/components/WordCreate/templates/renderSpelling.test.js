import React from 'react'
import RenderSpelling from './renderSpelling'
import { shallow } from 'enzyme'
import ErrorLine from './errorLine.js'

describe('renderSpelling', () => {
  // minimal viable props
  // props get mutated on sibling button clicks
  let mvprops;

  beforeEach(() => {
    // https://github.com/redux-form/redux-form/blob/master/src/FieldArray.js
    // https://redux-form.com/8.2.2/docs/api/fieldarray.md/
    // custom Array-like with helpers used by ReduxForm
    const fieldArray = []
    fieldArray.remove = i => fieldArray.splice(i, 1)
    mvprops = {
      fields: fieldArray,
      meta: {
        error: void(0),
        submitFailed: false
      }
    }
  })

  it('renders', () => {
    const wrapper = shallow(<RenderSpelling {...mvprops}/>)
    expect(wrapper.find('[title="Add Spelling"]')).toHaveLength(1)
  })

  it('renders errors', () => {
    const props = {
      ...mvprops,
      meta: {
        error: 'error',
        submitFailed: true
      }
    }
    const wrapper = shallow(<RenderSpelling {...props}/>)
    expect(wrapper.find(ErrorLine)).toHaveLength(1)
  })

  describe('Add Spelling path', () => {
    it('Adds spelling inputs', () => {
      const props = {...mvprops}
      const wrapper = shallow(<RenderSpelling {...props}/>)
      expect(props.fields).toHaveLength(0)
      wrapper.find('[title="Add Spelling"]').simulate('click')
      expect(props.fields[0]).toEqual({ language: "zh-Hant"})
      const spellingWrapper = shallow(<RenderSpelling {...props}/>)
      expect(spellingWrapper.find('[title="Remove Spelling"]')).toHaveLength(1)
    })

    it('removes it', () => {
      const props = {...mvprops}
      const wrapper = shallow(<RenderSpelling {...props}/>)
      wrapper.find('[title="Add Spelling"]').simulate('click')
      expect(props.fields).toHaveLength(1)
      const spellingWrapper = shallow(<RenderSpelling {...props}/>)
      spellingWrapper.find('[title="Remove Spelling"]').simulate('click')
      expect(props.fields).toHaveLength(0)
    })

    it('removes it', () => {
    
    })
  })
})
