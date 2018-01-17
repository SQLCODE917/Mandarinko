const Definition = ({definition}) => 
  <section className="definition">
    {definition.map((definitionItem, i) =>
      <div key={i}>
        {definitionItem}
      </div>
    )}
  </section>

export default Definition
