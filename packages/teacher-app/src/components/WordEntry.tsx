import type { Word } from '@mandarinko/core';
import { WordEntry as ReadingEntry, type DerivationNavigation } from '@mandarinko/ui';
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
    <ReadingEntry
      word={word}
      navigation={navigation}
      heading={
        <EntryHeading
          spelling={word.spelling}
          pronunciation={word.pronunciation}
          metadata={word.metadata}
          strokeOrder={strokeOrder}
        />
      }
    />
  );
}
