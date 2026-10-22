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
import {
  WordEditorSession,
  type EditorRow,
  type EditorCallbacks,
} from '../domain/wordEditorSession';
import {
  readEditorLocation,
  writeEditorLocation,
  editorNavigationEvent,
} from '../domain/editorLocation';
import { findBrowserEditorWorkspace } from '../domain/editorDraftStore';
import './WordEditor.css';
import { GrowingTextField } from './GrowingTextField';

export type WordEditorHandle = { close: () => void };
export type EditorExit = { kind: 'close' | 'finished'; wordId?: string };

export const WordEditor = forwardRef<
  WordEditorHandle,
  {
    word?: Word;
    words: Word[];
    callbacks: EditorCallbacks;
    sessions?: Map<string, WordEditorSession>;
    onExit: (result: EditorExit) => void;
  }
>(function WordEditor({ word, words, callbacks, sessions, onExit }, ref) {
  const [session] = useState(() => {
    const location = readEditorLocation();
    const linkedSlot = location ? findBrowserEditorWorkspace(location.workspace) : undefined;
    const owner = linkedSlot?.startsWith('word:')
      ? words.find((w) => w.id === linkedSlot.slice(5))
      : linkedSlot === 'new'
        ? undefined
        : word;
    const slot = owner ? `word:${owner.id}` : 'new';
    const previous = sessions?.get(slot);
    const active =
      previous && previous.lifecycle.kind !== 'closed'
        ? previous
        : new WordEditorSession(owner, words, callbacks);
    sessions?.set(slot, active);
    return active;
  });
  const [recovery, setRecovery] = useState<string | null>(() => {
    const location = readEditorLocation();
    return location &&
      (!location.valid || !session.restoreLocation(location.workspace, location.node))
      ? 'This local editor workspace or character is unavailable. Return to the dictionary to open an existing entry or recover a draft with Create new Word.'
      : null;
  });
  const [paste, setPaste] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [, redraw] = useReducer((revision: number) => revision + 1, 0);
  const host = useRef<HTMLDivElement>(null);
  const exited = useRef(false);
  const [focusRow, setFocusRow] = useState<number | null>(session.rows[0].key);
  useLayoutEffect(() => session.subscribe(redraw), [session]);
  useLayoutEffect(() => {
    if (recovery) return;
    session.onNavigate = (replace = false) => {
      session.pinNavigation();
      writeEditorLocation(session.workspaceId, session.activeKey, replace);
    };
    session.pinNavigation();
    writeEditorLocation(session.workspaceId, session.activeKey, true);
    const restore = () => {
      const location = readEditorLocation();
      if (
        location &&
        (!location.valid || !session.restoreLocation(location.workspace, location.node))
      )
        setRecovery(
          'This local editor workspace or character is unavailable. Return to the dictionary to recover a draft.'
        );
    };
    window.addEventListener('popstate', restore);
    window.addEventListener(editorNavigationEvent, restore);
    return () => {
      session.checkpoint();
      session.onNavigate = undefined;
      window.removeEventListener('popstate', restore);
      window.removeEventListener(editorNavigationEvent, restore);
    };
  }, [session, recovery]);
  useLayoutEffect(() => {
    const view = session.currentView;
    const fields = host.current?.querySelectorAll<HTMLTextAreaElement>('textarea');
    const field = view?.label
      ? [...(fields ?? [])].find((f) => f.getAttribute('aria-label') === view.label)
      : host.current?.querySelector<HTMLTextAreaElement>('[data-row] textarea');
    field?.focus({ preventScroll: true });
    if (view?.start !== undefined) field?.setSelectionRange(view.start, view.end ?? view.start);
    const body = host.current?.closest('.word-tree-body');
    if (body) body.scrollTop = view?.scroll ?? 0;
  }, [session, session.activeKey]);
  useEffect(() => {
    const body = host.current?.closest('.word-tree-body');
    const capture = () => session.captureView({ scroll: body?.scrollTop ?? 0 });
    body?.addEventListener('scroll', capture);
    return () => body?.removeEventListener('scroll', capture);
  }, [session]);
  useLayoutEffect(() => session.updateDependencies(words, callbacks), [session, words, callbacks]);
  useLayoutEffect(() => {
    if (focusRow !== null)
      host.current
        ?.querySelector<HTMLTextAreaElement>(`[data-row="${focusRow}"] textarea`)
        ?.focus();
  }, [focusRow]);
  useLayoutEffect(() => {
    if (session.focusRevision)
      host.current
        ?.querySelector<HTMLTextAreaElement>(`[data-row="${session.rows[0].key}"] textarea`)
        ?.focus();
  }, [session.focusRevision]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (session.storageError) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const checkpoint = () => session.checkpoint();
    window.addEventListener('beforeunload', warn);
    window.addEventListener('popstate', checkpoint, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('popstate', checkpoint, true);
    };
  }, [session]);
  useImperativeHandle(
    ref,
    () => ({
      close: () => {
        void session.close();
      },
    }),
    [session]
  );
  useLayoutEffect(() => {
    if (session.lifecycle.kind === 'closed' && !exited.current) {
      exited.current = true;
      writeEditorLocation(undefined, undefined, true);
      onExit({ kind: session.lifecycle.outcome, wordId: session.resultWordId });
    }
  });
  useLayoutEffect(() => {
    if (session.validation) {
      const row = session.rows.find((r) => r.messageKind === 'error' || r.matches.length);
      const labels = row
        ? !row.word.spelling[0]?.text.trim()
          ? 'Spelling'
          : !row.word.pronunciation.trim()
            ? 'Pronunciation'
            : row.word.definition.some((d) => !d.trim())
              ? 'Definition'
              : 'Spelling'
        : 'Spelling';
      host.current
        ?.querySelector<HTMLTextAreaElement>(
          `[data-row="${row?.key}"] textarea[aria-label*="${labels}"]`
        )
        ?.focus();
    }
    if (
      session.lifecycle.kind === 'confirm-discard' ||
      session.lifecycle.kind === 'confirm-leave'
    ) {
      host.current?.querySelector<HTMLButtonElement>('.editor-confirmation button')?.focus();
    }
  }, [session.lifecycle.kind, session.validation]);

  const add = (relation: 'child' | 'sibling') => {
    const row = session.addRow(relation);
    if (row) setFocusRow(row.key);
  };
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
  if (recovery)
    return (
      <div role="alert" className="editor-error">
        {recovery}
        <button
          type="button"
          onClick={() => {
            writeEditorLocation(undefined, undefined, true);
            onExit({ kind: 'close' });
          }}
        >
          Return to dictionary
        </button>
      </div>
    );
  return (
    <div
      onBlurCapture={(event) => {
        const target = event.target;
        if (target instanceof HTMLTextAreaElement)
          session.captureView({
            label: target.getAttribute('aria-label') ?? undefined,
            start: target.selectionStart,
            end: target.selectionEnd,
            scroll: host.current?.closest('.word-tree-body')?.scrollTop ?? 0,
          });
      }}
      className="word-editor"
      ref={host}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          void session.finish(event.shiftKey && session.isNew);
        }
        if (
          event.key === 'Escape' &&
          (session.lifecycle.kind === 'confirm-discard' ||
            session.lifecycle.kind === 'confirm-leave')
        ) {
          event.stopPropagation();
          event.preventDefault();
          session.cancelDiscard();
        }
      }}
    >
      <div className="editor-toolbar">
        <span>
          {session.restored ? 'Restored draft · ' : ''}New words stay drafts until Create. Existing
          words save on blur.
        </span>
        <button type="button" disabled={!session.editable} onClick={() => add('child')}>
          + Child
        </button>
        <button type="button" disabled={!session.editable} onClick={() => add('sibling')}>
          + Sibling
        </button>
        <button
          type="button"
          className="editor-primary"
          disabled={!session.editable || session.lifecycle.kind === 'failed'}
          onClick={() => void session.finish()}
        >
          {session.nested
            ? `Return to ${session.breadcrumbs[session.breadcrumbs.length - 2].text}`
            : session.batch
              ? 'Create batch'
              : session.hasNewWords
                ? session.rows[0].id
                  ? 'Add words'
                  : 'Create word'
                : 'Done'}
        </button>
        {session.isNew && !session.nested && !session.batch && (
          <button
            type="button"
            disabled={!session.editable || session.lifecycle.kind === 'failed'}
            onClick={() => void session.finish(true)}
          >
            Create and add another
          </button>
        )}
        <button
          type="button"
          disabled={
            session.publishing ||
            (!session.dirty && !session.error) ||
            session.lifecycle.kind === 'confirm-discard' ||
            session.lifecycle.kind === 'confirm-leave'
          }
          onClick={() => session.requestDiscard()}
        >
          {session.isNew && !session.rows[0].id ? 'Discard draft' : 'Discard unsaved edits'}
        </button>
        <span role="status" aria-live="polite">
          {session.storageError
            ? 'Draft not saved'
            : session.saving
              ? 'Saving…'
              : session.error
                ? 'Save failed · draft kept'
                : session.dirty
                  ? 'Draft saved in this browser'
                  : session.rows[0].id
                    ? 'Saved'
                    : 'New word'}
        </span>
      </div>
      <nav className="editor-breadcrumbs" aria-label="Editor breadcrumbs">
        {session.breadcrumbs.map((crumb, index) => (
          <span key={`${crumb.key}:${index}`}>
            {index > 0 && ' → '}
            <button
              type="button"
              aria-current={index === session.breadcrumbs.length - 1 ? 'page' : undefined}
              onClick={() => session.returnTo(index)}
            >
              {crumb.text}
            </button>
          </span>
        ))}
      </nav>
      <details className="editor-session">
        <summary>
          Entry session: {session.defaults.name || 'Untitled'} · {session.defaults.language}
          {session.defaults.hskLevel ? ` · HSK ${session.defaults.hskLevel}` : ''}
          {session.defaults.jlptLevel ? ` · JLPT ${session.defaults.jlptLevel}` : ''}
        </summary>
        <label>
          Name{' '}
          <input
            aria-label="Session name"
            value={session.defaults.name}
            onChange={(e) => session.configure({ ...session.defaults, name: e.target.value })}
          />
        </label>
        <label>
          Language{' '}
          <select
            aria-label="Session language"
            value={session.defaults.language}
            onChange={(e) => session.configure({ ...session.defaults, language: e.target.value })}
          >
            {['zh-Hans', 'zh-Hant', 'ja'].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        {(['hskLevel', 'jlptLevel'] as const).map((key) => (
          <label key={key}>
            {key === 'hskLevel' ? 'HSK' : 'JLPT'}{' '}
            <select
              aria-label={`Session ${key}`}
              value={session.defaults[key] ?? ''}
              onChange={(e) =>
                session.configure({
                  ...session.defaults,
                  [key]: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            >
              <option value="">None</option>
              {Array.from({ length: key === 'hskLevel' ? 9 : 5 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button type="button" onClick={() => session.endEntrySession()}>
          End session
        </button>
      </details>
      {session.batch && (
        <section className="editor-preview" aria-label="Batch preview">
          <p>
            Confirm selected roots and required components with Create batch. Non-empty corrections
            below replace saved values; blank cells preserve them.
          </p>
          {session.previewEntries.map(({ row, root, selected, before, children, siblings }) => (
            <div className="editor-preview-row" key={row.key}>
              <label>
                {root && (
                  <input
                    type="checkbox"
                    aria-label={`Publish ${row.word.spelling[0].text}`}
                    checked={selected}
                    onChange={(e) => session.selectRoot(row.key, e.target.checked)}
                  />
                )}
                <strong>{row.word.spelling.map((s) => s.text).join(' / ')}</strong> ·{' '}
                {!row.id
                  ? 'New'
                  : JSON.stringify(before) === JSON.stringify(row.word)
                    ? 'Reused'
                    : 'Updated'}
              </label>
              <span>
                {row.word.pronunciation || 'Pronunciation missing'} ·{' '}
                {row.word.definition.filter(Boolean).join('; ') || 'Definitions missing'}
              </span>
              {(children || siblings) && (
                <span>
                  {children && `Children: ${children}`}
                  {children && siblings && ' · '}
                  {siblings && `Siblings: ${siblings}`}
                </span>
              )}
              {before && <Corrections before={before} after={row.word} />}
              <button type="button" onClick={() => session.reviewEntry(row.key)}>
                Edit / review components
              </button>
            </div>
          ))}
        </section>
      )}
      {session.validation && (
        <p role="alert" tabIndex={-1} className="editor-validation editor-validation-summary">
          Check the highlighted words before finishing.
        </p>
      )}
      {(session.storageError || session.error) && (
        <div role="alert" className="editor-error">
          {session.storageError || session.error}
          {session.lifecycle.kind === 'failed' && (
            <button type="button" onClick={() => void session.retry()}>
              Retry save
            </button>
          )}
        </div>
      )}
      {session.lifecycle.kind === 'confirm-discard' && (
        <div className="editor-confirmation" role="group" aria-label="Discard draft?">
          <p>
            Discard{' '}
            {session.lifecycle.rowKey === undefined ? 'unsaved draft content' : 'this draft'}? Saved
            dictionary changes will be kept.
          </p>
          <button type="button" onClick={() => session.cancelDiscard()}>
            Keep editing
          </button>
          <button type="button" onClick={() => session.confirmDiscard()}>
            Discard{session.lifecycle.rowKey === undefined ? ' and close' : ' this draft'}
          </button>
        </div>
      )}
      {session.lifecycle.kind === 'confirm-leave' && (
        <div className="editor-confirmation" role="group" aria-label="Draft could not be saved">
          <p>This browser could not save your draft. Leaving may lose unfinished input.</p>
          <button type="button" onClick={() => session.cancelDiscard()}>
            Keep editing
          </button>
          <button type="button" onClick={() => session.leaveWithoutDraft()}>
            Close without saving draft
          </button>
        </div>
      )}
      <fieldset className="editor-fields" disabled={!session.editable}>
        {renderRow(session.rows[0], 0)}
        <ComponentEntry session={session} />
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
      </fieldset>
      <details className="editor-paste">
        <summary>Paste spreadsheet</summary>
        <p>
          Header-based TSV. Non-empty values replace dictionary fields after confirmation; variants
          and relationships are added. Blank cells preserve saved values.
        </p>
        <GrowingField
          label="Spreadsheet TSV"
          value={paste}
          onChange={setPaste}
          onBlur={() => undefined}
        />
        <button
          type="button"
          disabled={!session.editable}
          onClick={() => {
            try {
              session.previewPaste(paste);
              setPasteError('');
            } catch (error) {
              setPasteError(error instanceof Error ? error.message : 'Could not preview paste.');
            }
          }}
        >
          Preview paste
        </button>
        {pasteError && (
          <p role="alert" className="editor-validation">
            {pasteError}
          </p>
        )}
      </details>
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
  const [showDerivation, setShowDerivation] = useState(!row.id || Boolean(row.word.derivation));
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
      session={resolve ? session : undefined}
      row={resolve ? row : undefined}
      label={`${name}: ${label}`}
      value={value}
      onChange={onChange}
      onBlur={() => {
        void session.commit(row, resolve);
      }}
    />
  );
  return (
    <article
      className={`editor-row${row.id && row.relation !== 'root' ? ' is-reused' : ''}`}
      data-row={row.key}
      aria-label={name}
      ref={rowRef}
    >
      <div className="editor-row-heading">
        <strong>{name}</strong>
        {row.id && <span className="editor-shared">Shared dictionary entry</span>}
        {row.relation !== 'root' && (
          <button type="button" onClick={() => session.openComponents(row)}>
            Edit components
          </button>
        )}
        {!row.id && row.relation !== 'root' && (
          <button
            type="button"
            disabled={session.saving || session.lifecycle.kind === 'failed'}
            onClick={() => session.requestDiscard(row)}
          >
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
        {(showDerivation || Boolean(row.word.derivation)) && (
          <label className="editor-cell editor-derivation">
            <span className="editor-label">Derivation</span>
            {field('Derivation', row.word.derivation ?? '', (derivation) => change({ derivation }))}
          </label>
        )}
      </div>
      <div className="editor-row-tools">
        {!showDerivation && !row.word.derivation && (
          <button
            type="button"
            onClick={() => {
              setShowDerivation(true);
              setFocusField({ label: 'Derivation' });
            }}
          >
            + Derivation
          </button>
        )}
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
      {row.message && (!row.id || row.messageKind === 'error') && (
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
  session,
  row,
  onEnter,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  session?: WordEditorSession;
  row?: EditorRow;
  onEnter?: () => void;
}) {
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState(0);
  const composing = useRef(false);
  const suggestions = session && row && open ? session.suggestions(row) : [];
  const accept = (word: Word) => {
    if (session && row && session.reuse(row, word)) {
      void session.commit(row);
      setOpen(false);
      if (row.relation !== 'root') {
        const next = session.addRow(row.relation);
        if (next)
          requestAnimationFrame(() =>
            document
              .querySelector<HTMLTextAreaElement>(`[data-row="${next.key}"] textarea`)
              ?.focus()
          );
      }
    }
  };
  return (
    <div className="editor-input">
      <GrowingTextField
        aria-label={label}
        rows={1}
        value={value}
        role={session ? 'combobox' : undefined}
        aria-autocomplete={session ? 'list' : undefined}
        aria-expanded={session ? open && suggestions.length > 0 : undefined}
        aria-controls={session && row ? `suggestions-${row.key}` : undefined}
        aria-activedescendant={
          suggestions.length && row
            ? `suggestion-${row.key}-${Math.min(selected, suggestions.length - 1)}`
            : undefined
        }
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || composing.current) return;
          if (onEnter && event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onEnter();
            return;
          }
          if (event.key === 'Escape' && open && suggestions.length) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
          if (event.key === 'ArrowDown' && suggestions.length) {
            event.preventDefault();
            setSelected((selected + 1) % suggestions.length);
          }
          if (event.key === 'ArrowUp' && suggestions.length) {
            event.preventDefault();
            setSelected((selected + suggestions.length - 1) % suggestions.length);
          }
          if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && suggestions.length) {
            event.preventDefault();
            event.stopPropagation();
            accept(suggestions[Math.min(selected, suggestions.length - 1)]);
          }
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setSelected(0);
        }}
        onBlur={() => {
          setOpen(false);
          onBlur();
        }}
      />
      {suggestions.length > 0 && row && (
        <div
          role="listbox"
          id={`suggestions-${row.key}`}
          aria-label="Matching words"
          className="editor-suggestions"
        >
          {suggestions.map((word, index) => (
            <button
              key={word.id}
              type="button"
              role="option"
              id={`suggestion-${row.key}-${index}`}
              aria-selected={index === selected}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => accept(word)}
            >
              {word.spelling.map((s) => `${s.text} (${s.language})`).join(' / ')} ·{' '}
              {word.pronunciation} · {word.definition.join('; ')}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ComponentEntry({ session }: { session: WordEditorSession }) {
  const [value, setValue] = useState(''),
    [relation, setRelation] = useState<'child' | 'sibling'>('child');
  const apply = () => {
    const rows = session.addComponents(value, relation);
    setValue('');
    const incomplete = rows.find((r) => !r.id);
    if (incomplete)
      document
        .querySelector<HTMLTextAreaElement>(`[data-row="${incomplete.key}"] textarea`)
        ?.focus();
  };
  return (
    <div className="editor-component-entry">
      <label>
        <span className="editor-label">Add components together · e.g. 女, 馬</span>
        <GrowingField
          label="Component list"
          value={value}
          onChange={setValue}
          onBlur={() => undefined}
          onEnter={apply}
        />
      </label>
      <select
        aria-label="Component relationship"
        value={relation}
        onChange={(e) => setRelation(e.target.value as 'child' | 'sibling')}
      >
        <option value="child">Children</option>
        <option value="sibling">Siblings</option>
      </select>
      <button type="button" disabled={!value.trim() || !session.editable} onClick={apply}>
        Add components
      </button>
    </div>
  );
}

function Corrections({ before, after }: { before: Omit<Word, 'id'>; after: Omit<Word, 'id'> }) {
  const values = (w: Omit<Word, 'id'>) => ({
    Spellings: w.spelling.map((s) => `${s.text} (${s.language})`).join(', '),
    Pronunciation: w.pronunciation,
    Definitions: w.definition.join('; '),
    Derivation: w.derivation ?? '',
    HSK: String(w.metadata?.hskLevel ?? ''),
    JLPT: String(w.metadata?.jlptLevel ?? ''),
  });
  const old = values(before),
    next = values(after);
  return (
    <>
      {(Object.keys(next) as (keyof typeof next)[])
        .filter((key) => old[key] !== next[key])
        .map((key) => (
          <div key={key} className="editor-corrections">
            <strong>{key}</strong> <del>{old[key] || '(empty)'}</del> →{' '}
            <ins>{next[key] || '(empty)'}</ins>
          </div>
        ))}
    </>
  );
}
