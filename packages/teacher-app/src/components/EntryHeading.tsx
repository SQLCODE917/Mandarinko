import type { Spelling, WordMetadata } from '@mandarinko/core';
import { StrokeOrderSpelling } from './StrokeOrderSpelling';
import { hasStrokeOrder } from '../services/strokeOrder';
import './WordEntry.css';

export function EntryHeading({
  spelling,
  pronunciation,
  metadata,
  strokeOrder = false,
}: {
  spelling: Spelling[];
  pronunciation?: string;
  metadata?: WordMetadata;
  strokeOrder?: boolean;
}) {
  return (
    <span className="word-entry-heading">
      <span className="word-entry-spellings">
        {spelling.map((item, index) => (
          <span key={`${index}-${item.language}`}>
            {index > 0 && <span className="word-entry-separator"> / </span>}
            {strokeOrder && hasStrokeOrder(item.text, item.language) ? (
              <StrokeOrderSpelling text={item.text} language={item.language} />
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
