import type { Word } from '@mandarinko/core';
import { derivationParts } from '../domain/derivationLinks';

export type DerivationNavigation = {
  words: readonly Word[];
  hrefForWord: (wordId: string) => string;
  onNavigate: (wordId: string) => void;
};

export function DerivationText({
  text,
  currentWordId,
  navigation,
}: {
  text: string;
  currentWordId?: string;
  navigation: DerivationNavigation;
}) {
  return (
    <>
      {derivationParts(text, navigation.words, currentWordId).map((part, index) =>
        part.wordId !== undefined ? (
          <a
            key={index}
            href={navigation.hrefForWord(part.wordId)}
            onClick={(event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              navigation.onNavigate(part.wordId!);
            }}
          >
            {part.text}
          </a>
        ) : (
          part.text
        )
      )}
    </>
  );
}
