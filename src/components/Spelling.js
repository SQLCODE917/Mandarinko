const Spelling = ({spelling}) => 
  <section className="spelling">
    {spelling.map((spellingObject, i) =>
      <span className={`spelling-form ${spellingObject.language}`} key={i}>
        {spellingObject.text}
      </span>
    )}
  </section>

export default Spelling
