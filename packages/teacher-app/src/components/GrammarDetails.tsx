import type { ReactNode } from 'react';
import type { GrammarPattern } from '@mandarinko/core';
import { EntryHeading } from './EntryHeading';
import { GrammarTitle } from './GrammarTitle';
import './Grammar.css';

/** Reading layout for a single flat pattern; page cards retain their compact entry. */
export function GrammarDetails({
  pattern,
  onEdit,
  children,
}: {
  pattern: GrammarPattern;
  onEdit: () => void;
  children?: ReactNode;
}) {
  return (
    <article className="word-entry grammar-details">
      <header className="grammar-details-heading">
        <div>
          <EntryHeading spelling={pattern.spelling} metadata={pattern.metadata} />
          <h2>
            <GrammarTitle pattern={pattern} />
          </h2>
          {pattern.category && <p className="grammar-details-category">{pattern.category}</p>}
        </div>
        <button type="button" className="grammar-details-edit" onClick={onEdit}>
          Edit
        </button>
      </header>
      <section className="grammar-details-section" aria-label="Meaning & usage">
        <h3>Meaning &amp; usage</h3>
        {pattern.definition.map((definition, index) => (
          <p key={index}>{definition}</p>
        ))}
      </section>
      {pattern.examples.length > 0 && (
        <section className="grammar-details-section" aria-label="Examples">
          <h3>Examples</h3>
          <div className="grammar-details-examples">
            {pattern.examples.map((example, index) => (
              <div className="grammar-example" key={index}>
                <p className="grammar-example-text">
                  {example.spelling.map((spelling, index) => (
                    <span lang={spelling.language} key={index}>
                      {index > 0 ? ' / ' : ''}
                      {spelling.text}
                    </span>
                  ))}
                </p>
                <div className="grammar-translation">
                  {example.definition.map((definition, index) => (
                    <p key={index}>{definition}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {children && (
        <section className="grammar-details-section" aria-label="Compare patterns">
          <h3>Compare</h3>
          {children}
        </section>
      )}
    </article>
  );
}
