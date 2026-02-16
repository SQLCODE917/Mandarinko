import type { Word, Spelling } from '@mandarinko/core';

type WordFieldsProps = {
  spellings: Spelling[];
  onSpellingsChange: (next: Spelling[]) => void;
  pronunciation: string;
  onPronunciationChange: (next: string) => void;
  definitions: string[];
  onDefinitionsChange: (next: string[]) => void;
  derivation: string;
  onDerivationChange: (next: string) => void;
  errors: Record<string, string>;
  reusePromptOpen: boolean;
  reuseCandidate: (Word & { id: string }) | null;
  onReuseDecline: () => void;
  onReuseAccept: () => void;
};

export function WordFields({
  spellings,
  onSpellingsChange,
  pronunciation,
  onPronunciationChange,
  definitions,
  onDefinitionsChange,
  derivation,
  onDerivationChange,
  errors,
  reusePromptOpen,
  reuseCandidate,
  onReuseDecline,
  onReuseAccept,
}: WordFieldsProps) {
  return (
    <>
      {/* Spellings */}
      <div className="form-group">
        <label>Spellings *</label>
        {spellings.map((spelling, idx) => (
          <div key={idx} className="spelling-input-group">
            <select
              value={spelling.language}
              onChange={(e) => {
                const updated = [...spellings];
                updated[idx].language = e.target.value;
                onSpellingsChange(updated);
              }}
            >
              <option value="zh-Hans">Simplified Chinese</option>
              <option value="zh-Hant">Traditional Chinese</option>
              <option value="ja">Japanese</option>
            </select>
            <input
              type="text"
              value={spelling.text}
              onChange={(e) => {
                const updated = [...spellings];
                updated[idx].text = e.target.value;
                onSpellingsChange(updated);
              }}
              placeholder="Enter spelling"
            />
            {spellings.length > 1 && (
              <button
                type="button"
                onClick={() => onSpellingsChange(spellings.filter((_, i) => i !== idx))}
                className="btn-remove"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {errors.spelling && <div className="field-error">{errors.spelling}</div>}
        {reusePromptOpen && reuseCandidate && (
          <div className="reuse-prompt">
            <div className="reuse-text">
              Found an existing word: {reuseCandidate.spelling.map((s) => s.text).join(' / ')}. Use
              it instead?
            </div>
            <div className="reuse-actions">
              <button type="button" className="btn-secondary" onClick={onReuseDecline}>
                No
              </button>
              <button type="button" className="btn-primary" onClick={onReuseAccept}>
                Yes, reuse
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => onSpellingsChange([...spellings, { language: 'zh-Hans', text: '' }])}
          className="btn-secondary"
        >
          Add Spelling
        </button>
      </div>

      {/* Pronunciation */}
      <div className="form-group">
        <label>Pronunciation *</label>
        <input
          type="text"
          value={pronunciation}
          onChange={(e) => onPronunciationChange(e.target.value)}
          placeholder="e.g., zhu(3)zhang(1)"
        />
        {errors.pronunciation && <div className="field-error">{errors.pronunciation}</div>}
      </div>

      {/* Definitions */}
      <div className="form-group">
        <label>Definitions *</label>
        {definitions.map((def, idx) => (
          <div key={idx} className="definition-input-group">
            <input
              type="text"
              value={def}
              onChange={(e) => {
                const updated = [...definitions];
                updated[idx] = e.target.value;
                onDefinitionsChange(updated);
              }}
              placeholder="Enter definition"
            />
            {definitions.length > 1 && (
              <button
                type="button"
                onClick={() => onDefinitionsChange(definitions.filter((_, i) => i !== idx))}
                className="btn-remove"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {errors.definition && <div className="field-error">{errors.definition}</div>}
        <button
          type="button"
          onClick={() => onDefinitionsChange([...definitions, ''])}
          className="btn-secondary"
        >
          Add Definition
        </button>
      </div>

      {/* Derivation */}
      <div className="form-group">
        <label>Derivation</label>
        <input
          type="text"
          value={derivation}
          onChange={(e) => onDerivationChange(e.target.value)}
          placeholder="Explain word derivation"
        />
      </div>
    </>
  );
}
