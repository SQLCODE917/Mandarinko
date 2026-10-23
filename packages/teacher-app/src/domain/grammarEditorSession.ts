import {
  validateGrammarPattern,
  type GrammarPattern,
  type ValidationError,
} from '@mandarinko/core';
import { transitionEditor, type EditorLifecycle, type LifecycleEvent } from './editorLifecycle';

export type GrammarInput = Omit<GrammarPattern, 'id'> & { comparisonIds?: string[] };
export interface GrammarDraft {
  draft: GrammarInput;
  requestKey: string;
  pendingCreation?: GrammarInput;
}
export interface GrammarDraftStore {
  read(slot: string): GrammarDraft | undefined;
  write(slot: string, value: GrammarDraft): void;
  remove(slot: string): void;
}
export interface GrammarEditorPorts {
  create: (input: GrammarInput, key: string) => Promise<GrammarPattern>;
  update: (id: string, input: GrammarInput) => Promise<GrammarPattern>;
  drafts: GrammarDraftStore;
  newKey: () => string;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const withoutId = ({ id: _id, ...input }: GrammarPattern): GrammarInput => input;

/** Flat authoring controller. HTTP, browser storage and React are injected adapters. */
export class GrammarEditorSession {
  draft: GrammarInput;
  lifecycle: EditorLifecycle = { kind: 'open' };
  errors: ValidationError[] = [];
  storageError = '';
  saved?: GrammarPattern;
  private readonly slot: string;
  private readonly requestKey: string;
  private pendingCreation?: GrammarInput;
  private baseline: string;
  private queuedCommit = false;
  private listeners = new Set<() => void>();

  constructor(
    private readonly pattern: GrammarPattern | undefined,
    private readonly ports: GrammarEditorPorts,
    comparisonIds?: string[]
  ) {
    this.slot = pattern ? `pattern:${pattern.id}` : 'new';
    let recovered: GrammarDraft | undefined;
    try {
      recovered = ports.drafts.read(this.slot);
    } catch {
      this.storageError = 'This browser could not read the saved grammar draft.';
    }
    const initial = pattern
      ? withoutId(pattern)
      : { spelling: [{ language: 'ja', text: '' }], title: '', definition: [''], examples: [] };
    const initialDraft = comparisonIds === undefined ? initial : { ...initial, comparisonIds };
    this.draft = clone(recovered?.draft ?? initialDraft);
    this.baseline = JSON.stringify(initialDraft);
    this.requestKey = recovered?.requestKey ?? ports.newKey();
    this.pendingCreation = recovered?.pendingCreation;
    if (this.pendingCreation)
      this.lifecycle = {
        kind: 'failed',
        action: 'finish',
        message: 'Creation is unconfirmed. Retry save to check the original request.',
      };
  }
  get dirty() {
    return JSON.stringify(this.draft) !== this.baseline;
  }
  get saving() {
    return this.lifecycle.kind === 'working';
  }
  get editable() {
    return (
      this.lifecycle.kind === 'open' ||
      (this.lifecycle.kind === 'working' && this.lifecycle.action === 'autosave') ||
      (this.lifecycle.kind === 'failed' && !this.pendingCreation)
    );
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private notify() {
    this.listeners.forEach((listener) => listener());
  }
  private checkpoint(): boolean {
    try {
      if (!this.dirty && !this.pendingCreation) this.ports.drafts.remove(this.slot);
      else
        this.ports.drafts.write(this.slot, {
          draft: clone(this.draft),
          requestKey: this.requestKey,
          ...(this.pendingCreation ? { pendingCreation: this.pendingCreation } : {}),
        });
      this.storageError = '';
      return true;
    } catch {
      this.storageError =
        'This browser could not save the grammar draft. Keep this editor open to retain unfinished input.';
      return false;
    }
  }
  change(updates: Partial<GrammarInput>) {
    if (!this.editable) return;
    this.draft = clone({ ...this.draft, ...updates });
    this.errors = [];
    this.checkpoint();
    this.notify();
  }
  private async dispatch(event: LifecycleEvent): Promise<void> {
    const transition = transitionEditor(this.lifecycle, event);
    this.lifecycle = transition.state;
    this.notify();
    if (transition.effects.includes('save')) await this.save();
  }
  private async save() {
    if (this.pattern && !this.dirty) {
      this.saved ??= this.pattern;
      await this.dispatch({ type: 'COMPLETE', stored: this.checkpoint(), hasDraft: false });
      return;
    }
    const snapshot = clone(this.pendingCreation ?? this.draft);
    const { comparisonIds: _comparisonIds, ...content } = snapshot;
    this.errors = validateGrammarPattern({ ...content, id: this.pattern?.id ?? this.requestKey });
    if (this.errors.length) {
      await this.dispatch({ type: 'NEEDS_INPUT', stored: this.checkpoint() });
      return;
    }
    try {
      if (!this.pattern) {
        this.pendingCreation = snapshot;
        this.checkpoint();
      }
      this.saved = this.pattern
        ? await this.ports.update(this.pattern.id, snapshot)
        : await this.ports.create(snapshot, this.requestKey);
      this.pendingCreation = undefined;
      this.baseline = JSON.stringify(snapshot);
      if (
        this.pattern &&
        this.dirty &&
        this.lifecycle.kind === 'working' &&
        (this.queuedCommit || this.lifecycle.action === 'finish' || this.lifecycle.exit === 'close')
      ) {
        this.queuedCommit = false;
        await this.save();
        return;
      }
      this.queuedCommit = false;
      await this.dispatch({ type: 'COMPLETE', stored: this.checkpoint(), hasDraft: this.dirty });
    } catch (error) {
      await this.dispatch({
        type: 'FAIL',
        message: error instanceof Error ? error.message : String(error),
        stored: this.checkpoint(),
      });
    }
  }
  async commit() {
    if (this.lifecycle.kind === 'working' && this.lifecycle.action === 'autosave')
      this.queuedCommit = true;
    if (this.pattern && this.dirty && this.lifecycle.kind === 'open')
      await this.dispatch({ type: 'START', action: 'autosave' });
  }
  async finish() {
    await this.dispatch({ type: 'START', action: 'finish' });
  }
  async retry() {
    await this.dispatch({ type: 'RETRY' });
  }
  close() {
    void this.dispatch({
      type: 'CLOSE',
      needsSave: Boolean(this.pattern && this.dirty),
      stored: this.checkpoint(),
    });
  }
  cancelLeave() {
    void this.dispatch({ type: 'CANCEL' });
  }
  leaveWithoutDraft() {
    void this.dispatch({ type: 'LEAVE_WITHOUT_DRAFT' });
  }
}
