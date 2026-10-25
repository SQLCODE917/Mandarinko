import type { ReactNode } from 'react';
import type { Spelling, WordMetadata } from '@mandarinko/core';
import '@mandarinko/ui/entry.css';
export type EntryHeadingProps = {
  spelling: Spelling[];
  pronunciation?: string;
  metadata?: WordMetadata;
  renderSpelling?: (spelling: Spelling) => ReactNode;
};
export function EntryHeading({
  spelling,
  pronunciation,
  metadata,
  renderSpelling,
}: EntryHeadingProps) {
  return (
    <span className="word-entry-heading">
      <span className="word-entry-spellings">
        {spelling.map((item, index) => (
          <span key={`${index}-${item.language}`}>
            {index > 0 && <span className="word-entry-separator"> / </span>}
            {renderSpelling ? (
              renderSpelling(item)
            ) : (
              <span lang={item.language} title={item.language}>
                {item.text}
              </span>
            )}
          </span>
        ))}
      </span>
      {pronunciation !== undefined && (
        <span className="word-entry-pronunciation">{pronunciation}</span>
      )}
      {metadata?.hskLevel && <span className="word-entry-level">HSK {metadata.hskLevel}</span>}
      {metadata?.jlptLevel && <span className="word-entry-level">JLPT {metadata.jlptLevel}</span>}
    </span>
  );
}
