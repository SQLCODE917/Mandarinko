import type { GrammarPattern } from '@mandarinko/core';
import { GrammarTitle } from './GrammarTitle';
import './WordEntry.css';
import './Grammar.css';

export function GrammarEntry({ pattern }: { pattern: GrammarPattern }) {
  const example = pattern.examples[0];
  return (
    <span className="word-entry grammar-entry">
      <span className="grammar-title">
        <GrammarTitle pattern={pattern} />
      </span>
      <span className="word-entry-definitions">{pattern.definition.join('; ')}</span>
      {example && (
        <q className="grammar-card-quote">
          {example.spelling.map((spelling, index) => (
            <span lang={spelling.language} key={index}>
              {index > 0 ? ' / ' : ''}
              {spelling.text}
            </span>
          ))}{' '}
          <span>{example.definition.join('; ')}</span>
        </q>
      )}
    </span>
  );
}
