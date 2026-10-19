import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { Word } from '@mandarinko/core';
import { WordEditorSession, type EditorRow } from '../domain/wordEditorSession';
import type { EngineCallbacks } from '../domain/wordTraversalEngine';
import './WordEditor.css';

export type WordEditorHandle = { finish: () => Promise<string | undefined | false> };

export const WordEditor = forwardRef<
  WordEditorHandle,
  {
    word?: Word;
    words: Word[];
    callbacks: EngineCallbacks;
  }
>(function WordEditor({ word, words, callbacks }, ref) {
  const [session] = useState(() => new WordEditorSession(word, words, callbacks));
  const [, redraw] = useReducer((revision: number) => revision + 1, 0);
  const host = useRef<HTMLDivElement>(null);
  const [closeBlocked, setCloseBlocked] = useState(false);
  const [focusRow, setFocusRow] = useState<number | null>(session.rows[0].key);
  useLayoutEffect(() => session.subscribe(redraw), [session]);
  useLayoutEffect(() => {
    if (focusRow !== null)
      host.current
        ?.querySelector<HTMLTextAreaElement>(`[data-row="${focusRow}"] textarea`)
        ?.focus();
  }, [focusRow]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (session.dirty || session.saving || session.error) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [session]);
  useImperativeHandle(
    ref,
    () => ({
      finish: async () => {
        if (!(await session.finish())) {
          setCloseBlocked(true);
          host.current?.querySelector<HTMLElement>('[role="alert"], .editor-row-message')?.focus();
          return false;
        }
        return session.rows[0].id;
      },
    }),
    [session]
  );

  const add = (relation: 'child' | 'sibling') => setFocusRow(session.addRow(relation).key);
  const renderRow = (row: EditorRow, index: number) => (
    <EditorWordRow
      key={row.key}
      row={row}
      session={session}
      name={
        row.relation === 'root'
          ? 'Main word'
          : `${row.relation === 'child' ? 'Child' : 'Sibling'} ${index + 1}`
      }
    />
  );
  return (
    <div className="word-editor" ref={host}>
      <div className="editor-toolbar">
        <span>Click to edit · Tab to save · Enter for a new line</span>
        <button type="button" onClick={() => add('child')}>
          + Child
        </button>
        <button type="button" onClick={() => add('sibling')}>
          + Sibling
        </button>
        <button
          type="button"
          disabled={session.saving || (!session.dirty && !session.error)}
          title="Previously saved changes are kept"
          onClick={() => void session.discardUnsaved()}
        >
          Discard unsaved edits
        </button>
        <span role="status" aria-live="polite">
          {session.saving
            ? 'Saving…'
            : session.dirty
              ? 'Unsaved draft'
              : session.rows[0].id
                ? 'Saved'
                : 'New word'}
        </span>
      </div>
      {closeBlocked && session.dirty && !session.error && (
        <p role="alert" className="editor-validation">
          Complete the required fields or discard unsaved edits before closing.
        </p>
      )}
      {session.error && (
        <div role="alert" tabIndex={-1} className="editor-error">
          {session.error}. Your edits are kept here.{' '}
          <button type="button" onClick={() => void session.retry()}>
            Retry save
          </button>
        </div>
      )}
      {renderRow(session.rows[0], 0)}
      {(['child', 'sibling'] as const).map((relation) => {
        const rows = session.rows.filter((row) => row.relation === relation);
        return (
          rows.length > 0 && (
            <section
              key={relation}
              className="editor-relations"
              aria-label={relation === 'child' ? 'Children' : 'Siblings'}
            >
              <h3>{relation === 'child' ? 'Children' : 'Siblings'}</h3>
              {rows.map(renderRow)}
              <button type="button" onClick={() => add(relation)}>
                + {relation === 'child' ? 'Child' : 'Sibling'}
              </button>
            </section>
          )
        );
      })}
    </div>
  );
});

function EditorWordRow({
  row,
  session,
  name,
}: {
  row: EditorRow;
  session: WordEditorSession;
  name: string;
}) {
  const rowRef = useRef<HTMLElement>(null);
  const [focusField, setFocusField] = useState<{ label: string } | null>(null);
  useLayoutEffect(() => {
    if (focusField)
      rowRef.current
        ?.querySelector<HTMLTextAreaElement>(`textarea[aria-label="${name}: ${focusField.label}"]`)
        ?.focus();
  }, [focusField, name]);
  const change = (patch: Partial<Omit<Word, 'id'>>) => session.change(row, patch);
  const commit = () => {
    void session.commit(row);
  };
  const field = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    resolve = false
  ) => (
    <GrowingField
      label={`${name}: ${label}`}
      value={value}
      onChange={onChange}
      onBlur={() => {
        void session.commit(row, resolve);
      }}
    />
  );
  return (
    <article className="editor-row" data-row={row.key} aria-label={name} ref={rowRef}>
      <div className="editor-row-heading">
        <strong>{name}</strong>
        {!row.id && row.relation !== 'root' && (
          <button type="button" disabled={session.saving} onClick={() => session.removeDraft(row)}>
            Discard draft
          </button>
        )}
      </div>
      <div className="editor-cells">
        <div className="editor-cell editor-spellings">
          <span className="editor-label">Character / spelling</span>
          {row.word.spelling.map((spelling, index) => (
            <div className="editor-spelling" key={index}>
              <select
                aria-label={`${name}: Language ${index + 1}`}
                value={spelling.language}
                onBlur={commit}
                onChange={(event) =>
                  change({
                    spelling: row.word.spelling.map((item, i) =>
                      i === index ? { ...item, language: event.target.value } : item
                    ),
                  })
                }
              >
                {[...new Set(['zh-Hans', 'zh-Hant', 'ja', spelling.language])].map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
              {field(
                `Spelling ${index + 1}`,
                spelling.text,
                (text) =>
                  change({
                    spelling: row.word.spelling.map((item, i) =>
                      i === index ? { ...item, text } : item
                    ),
                  }),
                index === 0
              )}
              {index > 0 && (
                <button
                  type="button"
                  aria-label={`Remove ${name} spelling ${index + 1}`}
                  onClick={() => {
                    change({ spelling: row.word.spelling.filter((_, i) => i !== index) });
                    commit();
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <label className="editor-cell">
          <span className="editor-label">Pronunciation</span>
          {field('Pronunciation', row.word.pronunciation, (pronunciation) =>
            change({ pronunciation })
          )}
        </label>
        <div className="editor-cell editor-definitions">
          <span className="editor-label">Definitions</span>
          {row.word.definition.map((definition, index) => (
            <div className="editor-definition" key={index}>
              {field(`Definition ${index + 1}`, definition, (text) =>
                change({
                  definition: row.word.definition.map((item, i) => (i === index ? text : item)),
                })
              )}
              {index > 0 && (
                <button
                  type="button"
                  aria-label={`Remove ${name} definition ${index + 1}`}
                  onClick={() => {
                    change({ definition: row.word.definition.filter((_, i) => i !== index) });
                    commit();
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <label className="editor-cell editor-derivation">
          <span className="editor-label">Derivation</span>
          {field('Derivation', row.word.derivation ?? '', (derivation) => change({ derivation }))}
        </label>
      </div>
      <div className="editor-row-tools">
        <button
          type="button"
          onClick={() => {
            change({ spelling: [...row.word.spelling, { language: 'zh-Hant', text: '' }] });
            setFocusField({ label: `Spelling ${row.word.spelling.length}` });
          }}
        >
          + Variant
        </button>
        <button
          type="button"
          onClick={() => {
            change({ definition: [...row.word.definition, ''] });
            setFocusField({ label: `Definition ${row.word.definition.length}` });
          }}
        >
          + Definition
        </button>
        {row.id && row.relation !== 'root' && (
          <button type="button" disabled={session.saving} onClick={() => void session.unlink(row)}>
            Unlink
          </button>
        )}
      </div>
      <details className="editor-metadata">
        <summary>Levels & frequency</summary>
        {(['hskLevel', 'jlptLevel', 'frequency'] as const).map((key) => (
          <label key={key}>
            {key === 'hskLevel' ? 'HSK' : key === 'jlptLevel' ? 'JLPT' : 'Frequency'}
            <input
              type="number"
              aria-label={`${name}: ${key}`}
              value={row.word.metadata?.[key] ?? ''}
              onChange={(event) =>
                change({
                  metadata: {
                    ...row.word.metadata,
                    [key]: event.target.value === '' ? undefined : Number(event.target.value),
                  },
                })
              }
              onBlur={commit}
            />
          </label>
        ))}
      </details>
      {row.message && (
        <p
          className={`editor-row-message${row.messageKind === 'error' ? ' editor-validation' : ''}`}
          role={row.messageKind === 'error' ? 'alert' : undefined}
          tabIndex={-1}
        >
          {row.messageKind === 'error' && <strong>Check this word: </strong>}
          {row.message}
        </p>
      )}
      {row.matches.map((word) => (
        <button
          key={word.id}
          type="button"
          onClick={() => {
            if (session.reuse(row, word)) void session.commit(row);
          }}
        >
          {word.spelling.map((spelling) => spelling.text).join(' / ')} · {word.pronunciation} ·{' '}
          {word.definition.join('; ')}
        </button>
      ))}
    </article>
  );
}

function GrowingField({
  label,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = () => {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight + 2}px`;
    };
    resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [value]);
  return (
    <textarea
      ref={ref}
      aria-label={label}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
    />
  );
}
