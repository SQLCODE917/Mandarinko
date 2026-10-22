import type { Word } from '@mandarinko/core';
import { DerivationText, type DerivationNavigation } from './DerivationText';
import { EntryHeading } from './EntryHeading';
import './WordEntry.css';

export function WordEntry({
  word,
  navigation,
  strokeOrder = false,
}: {
  word: Omit<Word, 'id'> & { id?: string };
  navigation?: DerivationNavigation;
  strokeOrder?: boolean;
}) {
  return (
    <span className="word-entry">
      <EntryHeading
        spelling={word.spelling}
        pronunciation={word.pronunciation}
        metadata={word.metadata}
        strokeOrder={strokeOrder}
      />
      {word.derivation && (
        <span className="word-entry-derivation">
          {navigation ? (
            <DerivationText
              text={word.derivation}
              currentWordId={word.id}
              navigation={navigation}
            />
          ) : (
            word.derivation
          )}
        </span>
      )}
      <span className="word-entry-definitions">{word.definition.join('; ')}</span>
    </span>
  );
}
