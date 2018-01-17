import Word from './Word'

const Siblings = ({siblings}) =>
  <section className="siblings">
    {siblings.map((sibling, i) =>
      <Word key={i} {...sibling}/>
    )}
  </section>

export default Siblings
