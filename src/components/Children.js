import Word from './Word'

const Children = ({children}) => 
  <section className="children">
    {children.map((child, i) =>
      <Word key={i} {...child}/>
    )}
  </section>

export default Children
