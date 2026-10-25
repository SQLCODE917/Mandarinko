import type { ReactNode } from 'react';
import type { Word } from '@mandarinko/core';
import { EntryHeading } from './EntryHeading.js';
import { DerivationText, type DerivationNavigation } from './DerivationText.js';
export function WordEntry({
  word,
  navigation,
  heading,
}: {
  word: Omit<Word, 'id'> & { id?: string };
  navigation?: DerivationNavigation;
  heading?: ReactNode;
}) {
  return (
    <span className="word-entry">
      {heading ?? <EntryHeading {...word} />}
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
