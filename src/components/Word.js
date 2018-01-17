import Siblings from './Siblings'
import Spelling from './Spelling'
import Definition from './Definition'
import Children from './Children'

import '../static/css/Word.css'

const Word = ({ 
  spelling,
  pronounciation,
  definition,
  derivation=void(0),
  children=[],
  siblings=[]}) =>
  <article className="word">
    <Siblings siblings={siblings}/>
    <article className="row main">
      <Spelling spelling={spelling}/>
      <section className="pronounciation">
        {pronounciation}
      </section>
    </article>
    <section className="derivation row">
      {derivation}
    </section>
    <Definition definition={definition}/>
    <Children children={children}/>
  </article>

export default Word
