import type { GrammarPattern } from '@mandarinko/core';

const japaneseRun = /([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆]+)/u;

/** Language-tagged title runs share the entry's Furifont treatment. */
export function GrammarTitle({ pattern }: { pattern: Pick<GrammarPattern, 'title' | 'spelling'> }) {
  const japanese = pattern.spelling.some(
    ({ language }) => language === 'ja' || language.startsWith('ja-')
  );
  if (!japanese) return <>{pattern.title}</>;
  return (
    <>
      {pattern.title.split(japaneseRun).map(
        (text, index) =>
          text && (
            <span key={index} lang={index % 2 === 1 ? 'ja' : undefined}>
              {text}
            </span>
          )
      )}
    </>
  );
}
