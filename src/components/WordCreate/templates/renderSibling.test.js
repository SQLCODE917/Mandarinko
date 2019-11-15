import React from 'react'
import RenderSibling from './renderSibling'
import ErrorLine from '../../errorLine'
import WordTemplate from './WordTemplate'
import AutosuggestByDefinition from './AutosuggestByDefinition'
import { shallow } from 'enzyme'

describe('renderSibling', () => {
  // minimal viable props
  // props get mutated on sibling button clicks
  let mvprops;

  beforeEach(() => {
    // https://github.com/redux-form/redux-form/blob/master/src/FieldArray.js
    // https://redux-form.com/8.2.2/docs/api/fieldarray.md/
    // custom Array-like with helpers used by ReduxForm
    const fieldArray = []
    fieldArray.get = i => fieldArray[i]
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
    const wrapper = shallow(<RenderSibling {...mvprops}/>)
    expect(wrapper.find('[title="Add Sibling"]')).toHaveLength(1)
    expect(wrapper.find('[title="Look Up a Sibling"]')).toHaveLength(1)
  })

  it('renders errors', () => {
    const props = {
      ...mvprops,
      meta: {
        error: 'error',
        submitFailed: true
      }
    }
    const wrapper = shallow(<RenderSibling {...props}/>)
    expect(wrapper.find(ErrorLine)).toHaveLength(1)
  })
  
  describe('Add Sibling path', () => {
    it('adds a new sibling word teplate', () => {
      const props = {...mvprops}
      const wrapper = shallow(<RenderSibling {...props}/>)
      expect(props.fields).toHaveLength(0)
      wrapper.find('[title="Add Sibling"]').simulate('click')
      expect(props.fields[0]).toEqual({})
      const newSiblingWrapper = shallow(<RenderSibling {...props}/>)
      expect(newSiblingWrapper.find(WordTemplate)).toHaveLength(1)
    })

    it('removes it', () => {
      const props = {...mvprops}
      const wrapper = shallow(<RenderSibling {...props}/>)
      wrapper.find('[title="Add Sibling"]').simulate('click')
      const newSiblingWrapper = shallow(<RenderSibling {...props}/>)
      expect(props.fields).toHaveLength(1)
      newSiblingWrapper.find('[title="Remove Sibling"]').simulate('click')
      expect(props.fields).toHaveLength(0)
    })
  })

  describe('Look Up a Sibling path', () => {
    it('allows lookup', () => {
      const props = {...mvprops}
      const wrapper = shallow(<RenderSibling {...props}/>)
      expect(props.fields).toHaveLength(0)
      wrapper.find('[title="Look Up a Sibling"]').simulate('click')
      expect(props.fields[0]).toEqual({ lookup: true })
      const lookupSiblingWrapper = shallow(<RenderSibling {...props}/>)
      expect(lookupSiblingWrapper.find(AutosuggestByDefinition)).toHaveLength(1)
    })

    it('removes it', () => {
      const props = {...mvprops}
      const wrapper = shallow(<RenderSibling {...props}/>)
      wrapper.find('[title="Look Up a Sibling"]').simulate('click')
      expect(props.fields).toHaveLength(1);
      const lookupSiblingWrapper = shallow(<RenderSibling {...props}/>)
      lookupSiblingWrapper.find('[title="Remove Sibling"]').simulate('click')
      expect(props.fields).toHaveLength(0)
    })
  })
})
