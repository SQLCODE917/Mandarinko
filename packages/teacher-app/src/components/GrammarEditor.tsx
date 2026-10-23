import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { EntryText, GrammarPattern } from '@mandarinko/core';
import { GrammarEditorSession, type GrammarEditorPorts } from '../domain/grammarEditorSession';
import { GrowingTextField } from './GrowingTextField';
import './WordEditor.css';
import './Grammar.css';

export type GrammarEditorHandle = { close: () => void };
export const GrammarEditor = forwardRef<
  GrammarEditorHandle,
  {
    pattern?: GrammarPattern;
    patterns: GrammarPattern[];
    ports: GrammarEditorPorts;
    comparisonIds?: string[];
    onExit: (saved?: GrammarPattern) => void;
  }
>(function GrammarEditor({ pattern, patterns, ports, onExit, comparisonIds }, ref) {
  const [comparisonsAvailable] = useState(() => comparisonIds !== undefined);
  const [session] = useState(() => new GrammarEditorSession(pattern, ports, comparisonIds));
  const [, redraw] = useReducer((revision: number) => revision + 1, 0);
  const host = useRef<HTMLDivElement>(null);
  const exited = useRef(false);
  useLayoutEffect(() => session.subscribe(redraw), [session]);
  useLayoutEffect(() => {
    host.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
  }, []);
  useEffect(() => {
    if (session.lifecycle.kind === 'closed' && !exited.current) {
      exited.current = true;
      onExit(session.saved);
    }
  }, [session.lifecycle, session.saved, onExit]);
  useImperativeHandle(ref, () => ({ close: () => session.close() }), [session]);
  const draft = session.draft;
  const commit = () => {
    void session.commit();
  };
  const textField = (label: string, value: string, change: (value: string) => void) => (
    <label className="editor-cell">
      <span className="editor-label">{label}</span>
      <GrowingTextField
        aria-label={label}
        value={value}
        onChange={(event) => change(event.target.value)}
        onBlur={commit}
      />
    </label>
  );
  return (
    <div
      ref={host}
      className="word-editor grammar-editor"
      onKeyDown={(event) => {
        if (
          !event.nativeEvent.isComposing &&
          event.key === 'Enter' &&
          (event.ctrlKey || event.metaKey)
        ) {
          event.preventDefault();
          void session.finish();
        }
      }}
    >
      <div className="editor-toolbar">
        <span>
          {pattern
            ? 'Edit grammar pattern · valid changes autosave on blur'
            : 'New grammar pattern · draft until Create'}
        </span>
        <span role="status">
          {session.saving ? 'Saving…' : session.dirty ? 'Draft retained in this browser' : 'Saved'}
        </span>
        {session.lifecycle.kind === 'failed' ? (
          <button type="button" className="editor-primary" onClick={() => void session.retry()}>
            Retry save
          </button>
        ) : (
          <button
            type="button"
            className="editor-primary"
            disabled={session.saving && !pattern}
            onClick={() => void session.finish()}
          >
            {pattern ? 'Done' : 'Create'}
          </button>
        )}
      </div>
      {session.lifecycle.kind === 'failed' && (
        <p role="alert" className="editor-error">
          {session.lifecycle.message}
        </p>
      )}
      {session.storageError && (
        <p role="alert" className="editor-error">
          {session.storageError}
        </p>
      )}
      {session.lifecycle.kind === 'confirm-leave' && (
        <div className="editor-confirmation">
          <p>This browser could not save your draft. Leaving may lose unfinished input.</p>
          <button type="button" onClick={() => session.cancelLeave()}>
            Keep editing
          </button>
          <button type="button" onClick={() => session.leaveWithoutDraft()}>
            Close without saving draft
          </button>
        </div>
      )}
      <fieldset className="editor-fields" disabled={!session.editable}>
        <EntryTextFields
          value={draft}
          onChange={(updates) => session.change(updates)}
          onBlur={commit}
        />
        <div className="grammar-fields">
          {textField('Title', draft.title, (title) => session.change({ title }))}
          {textField('Category', draft.category ?? '', (category) => session.change({ category }))}
        </div>
        <section aria-label="Examples" className="grammar-examples">
          <h3>Examples</h3>
          {draft.examples.map((example, index) => (
            <div key={index} className="editor-row">
              <EntryTextFields
                prefix={`Example ${index + 1} `}
                value={example}
                onChange={(updates) =>
                  session.change({
                    examples: draft.examples.map((item, i) =>
                      i === index ? { ...item, ...updates } : item
                    ),
                  })
                }
                onBlur={commit}
              />
              <button
                type="button"
                onClick={() => {
                  session.change({ examples: draft.examples.filter((_, i) => i !== index) });
                  commit();
                }}
              >
                Remove example {index + 1}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              session.change({
                examples: [
                  ...draft.examples,
                  {
                    spelling: [{ language: draft.spelling[0]?.language ?? 'ja', text: '' }],
                    definition: [''],
                  },
                ],
              })
            }
          >
            + Example
          </button>
        </section>
        <div className="editor-metadata grammar-metadata">
          {(['hskLevel', 'jlptLevel', 'frequency'] as const).map((key) => (
            <label key={key}>
              {key === 'hskLevel' ? 'HSK' : key === 'jlptLevel' ? 'JLPT' : 'Frequency'}
              <input
                type="number"
                aria-label={
                  key === 'hskLevel'
                    ? 'HSK level'
                    : key === 'jlptLevel'
                      ? 'JLPT level'
                      : 'Frequency'
                }
                value={draft.metadata?.[key] ?? ''}
                onChange={(event) =>
                  session.change({
                    metadata: {
                      ...draft.metadata,
                      [key]: event.target.value === '' ? undefined : Number(event.target.value),
                    },
                  })
                }
                onBlur={commit}
              />
            </label>
          ))}
        </div>
        {comparisonsAvailable ? (
          <details className="grammar-contrasts">
            <summary>Contrast patterns ({draft.comparisonIds?.length ?? 0})</summary>
            {patterns
              .filter((other) => other.id !== pattern?.id)
              .map((other) => (
                <label key={other.id}>
                  <input
                    type="checkbox"
                    checked={draft.comparisonIds?.includes(other.id) ?? false}
                    onChange={(event) => {
                      session.change({
                        comparisonIds: event.target.checked
                          ? [...(draft.comparisonIds ?? []), other.id]
                          : draft.comparisonIds?.filter((id) => id !== other.id),
                      });
                      commit();
                    }}
                  />
                  {other.title}
                </label>
              ))}
          </details>
        ) : (
          <p>
            Comparison data is unavailable. You can still edit pattern content; reopen the editor
            after reloading comparisons.
          </p>
        )}
      </fieldset>
      {session.errors.length > 0 && (
        <div role="alert" className="editor-validation">
          {session.errors.map((error) => (
            <p key={error.field}>
              {error.field}: {error.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
});

function EntryTextFields({
  value,
  prefix = '',
  onChange,
  onBlur,
}: {
  value: EntryText;
  prefix?: string;
  onChange: (updates: Partial<EntryText>) => void;
  onBlur: () => void;
}) {
  return (
    <div className="grammar-text-fields">
      <div className="editor-cell">
        <span className="editor-label">{prefix}Spellings</span>
        {value.spelling.map((spelling, index) => (
          <div className="editor-spelling" key={index}>
            <select
              aria-label={`${prefix}Language ${index + 1}`}
              value={spelling.language}
              onChange={(event) =>
                onChange({
                  spelling: value.spelling.map((item, i) =>
                    i === index ? { ...item, language: event.target.value } : item
                  ),
                })
              }
              onBlur={onBlur}
            >
              <option value="ja">Japanese</option>
              <option value="zh-Hans">Simplified Chinese</option>
              <option value="zh-Hant">Traditional Chinese</option>
              {!['ja', 'zh-Hans', 'zh-Hant'].includes(spelling.language) && (
                <option value={spelling.language}>{spelling.language}</option>
              )}
            </select>
            <GrowingTextField
              aria-label={`${prefix}Spelling ${index + 1}`}
              value={spelling.text}
              onChange={(event) =>
                onChange({
                  spelling: value.spelling.map((item, i) =>
                    i === index ? { ...item, text: event.target.value } : item
                  ),
                })
              }
              onBlur={onBlur}
            />
            {value.spelling.length > 1 && (
              <button
                type="button"
                aria-label={`Remove ${prefix}spelling ${index + 1}`}
                onClick={() => {
                  onChange({ spelling: value.spelling.filter((_, i) => i !== index) });
                  onBlur();
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({
              spelling: [
                ...value.spelling,
                { language: value.spelling[0]?.language ?? 'ja', text: '' },
              ],
            })
          }
        >
          + {prefix}Spelling
        </button>
      </div>
      <div className="editor-cell">
        <span className="editor-label">{prefix}Definitions</span>
        {value.definition.map((definition, index) => (
          <div className="editor-definition" key={index}>
            <GrowingTextField
              aria-label={`${prefix}Definition ${index + 1}`}
              value={definition}
              onChange={(event) =>
                onChange({
                  definition: value.definition.map((item, i) =>
                    i === index ? event.target.value : item
                  ),
                })
              }
              onBlur={onBlur}
            />
            {value.definition.length > 1 && (
              <button
                type="button"
                aria-label={`Remove ${prefix}definition ${index + 1}`}
                onClick={() => {
                  onChange({ definition: value.definition.filter((_, i) => i !== index) });
                  onBlur();
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => onChange({ definition: [...value.definition, ''] })}>
          + {prefix}Definition
        </button>
      </div>
    </div>
  );
}
