import { useState, useCallback, useEffect } from 'react';
import type { Word, Spelling } from '@mandarinko/core';
import { ValidationService } from '@mandarinko/core';

type ValidationError = { field: string; message: string };
import { OmniSearch } from './OmniSearch';
import { WordFields } from './WordFields';
import { useWordLookup } from '../hooks/useWordLookup';
import './WordForm.css';

interface WordFormProps {
  initialWord?: WordInput;
  onSubmit: (word: WordInput) => Promise<void>;
  onCancel: () => void;
  resolveWordLabel?: (id: string) => string;
  onCreateChild?: () => void;
  onCreateSibling?: () => void;
  submitDisabled?: boolean;
  resetKey?: string;
  enableReusePrompt?: boolean;
  onReuseExisting?: (word: Word & { id: string }) => void;
}

type WordInput = Omit<Word, 'id'> & { id?: string };

type FieldType =
  | 'spelling'
  | 'pronunciation'
  | 'definition'
  | 'childrenIds'
  | 'siblingIds'
  | 'hskLevel'
  | 'jlptLevel'
  | 'frequency';

const OPTIONAL_FIELDS: readonly FieldType[] = [
  'hskLevel',
  'jlptLevel',
  'frequency',
];

export function WordForm({
  initialWord,
  onSubmit,
  onCancel,
  resolveWordLabel,
  onCreateChild,
  onCreateSibling,
  submitDisabled,
  resetKey,
  enableReusePrompt,
  onReuseExisting,
}: WordFormProps) {
  const [spellings, setSpellings] = useState<Spelling[]>(
    initialWord?.spelling || [{ language: 'zh-Hans', text: '' }]
  );
  const [pronunciation, setPronunciation] = useState(initialWord?.pronunciation || '');
  const [definitions, setDefinitions] = useState<string[]>(initialWord?.definition || ['']);
  const [childrenIds, setChildrenIds] = useState<string[]>(
    (initialWord?.childrenIds ?? []).map((id) => String(id))
  );
  const [siblingIds, setSiblingIds] = useState<string[]>(
    (initialWord?.siblingIds ?? []).map((id) => String(id))
  );
  const [derivation, setDerivation] = useState(initialWord?.derivation || '');
  const [hskLevel, setHskLevel] = useState(initialWord?.metadata?.hskLevel || '');
  const [jlptLevel, setJlptLevel] = useState(initialWord?.metadata?.jlptLevel || '');
  const [frequency, setFrequency] = useState(initialWord?.metadata?.frequency || '');

  const [activeOptionalFields, setActiveOptionalFields] = useState<FieldType[]>(() => {
    const initial: FieldType[] = [];
    if (initialWord?.childrenIds?.length) initial.push('childrenIds');
    if (initialWord?.siblingIds?.length) initial.push('siblingIds');
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'childrenIds' | 'siblingIds' | null>(null);
  const [reusePromptOpen, setReusePromptOpen] = useState(false);
  const [lastDeclinedSpelling, setLastDeclinedSpelling] = useState('');

  useEffect(() => {
    if (!resetKey) return;
    setSpellings(initialWord?.spelling || [{ language: 'zh-Hans', text: '' }]);
    setPronunciation(initialWord?.pronunciation || '');
    setDefinitions(initialWord?.definition || ['']);
    setDerivation(initialWord?.derivation || '');
    setHskLevel(initialWord?.metadata?.hskLevel || '');
    setJlptLevel(initialWord?.metadata?.jlptLevel || '');
    setFrequency(initialWord?.metadata?.frequency || '');
    setErrors({});
    setReusePromptOpen(false);
    setLastDeclinedSpelling('');
  }, [resetKey, initialWord]);

  useEffect(() => {
    setChildrenIds((initialWord?.childrenIds ?? []).map((id) => String(id)));
  }, [initialWord?.childrenIds?.join('|')]);

  useEffect(() => {
    setSiblingIds((initialWord?.siblingIds ?? []).map((id) => String(id)));
  }, [initialWord?.siblingIds?.join('|')]);

  const spellingText = spellings[0]?.text?.trim() ?? '';
  const reuseEnabled =
    Boolean(enableReusePrompt && onReuseExisting) &&
    !initialWord?.id &&
    spellingText !== '' &&
    spellingText !== lastDeclinedSpelling;
  const { match: reuseCandidate } = useWordLookup(spellingText, {
    enabled: reuseEnabled,
  });

  useEffect(() => {
    if (!reuseEnabled) {
      setReusePromptOpen(false);
      return;
    }
    setReusePromptOpen(Boolean(reuseCandidate));
  }, [reuseCandidate, reuseEnabled]);

  const activateRelationshipField = useCallback(
    (field: 'childrenIds' | 'siblingIds') => {
      setActiveOptionalFields((prev) => (prev.includes(field) ? prev : [...prev, field]));
      setSearchMode(field);
    },
    []
  );

  const toggleOptionalField = useCallback((field: FieldType) => {
    setActiveOptionalFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  }, []);

  const addRelationship = useCallback(
    (word: Word & { id: string }) => {
      if (searchMode === 'childrenIds') {
        if (!childrenIds.includes(word.id)) {
          setChildrenIds([...childrenIds, word.id]);
        }
      } else if (searchMode === 'siblingIds') {
        if (!siblingIds.includes(word.id)) {
          setSiblingIds([...siblingIds, word.id]);
        }
      }
      setSearchMode(null);
    },
    [childrenIds, siblingIds, searchMode]
  );

  const removeRelationship = useCallback(
    (type: 'child' | 'sibling', id: string) => {
      if (type === 'child') {
        setChildrenIds(childrenIds.filter((cid) => cid !== id));
      } else {
        setSiblingIds(siblingIds.filter((sid) => sid !== id));
      }
    },
    [childrenIds, siblingIds]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const word: WordInput = {
        spelling: spellings,
        pronunciation,
        definition: definitions.filter((d) => d.trim()),
        ...(childrenIds.length > 0 && { childrenIds }),
        ...(siblingIds.length > 0 && { siblingIds }),
        ...(derivation && { derivation }),
        ...(hskLevel || jlptLevel || frequency
          ? {
              metadata: {
                ...(hskLevel && { hskLevel: Number(hskLevel) }),
                ...(jlptLevel && { jlptLevel: Number(jlptLevel) }),
                ...(frequency && { frequency: Number(frequency) }),
              },
            }
          : {}),
      };
      if (initialWord?.id) {
        word.id = initialWord.id;
      }

      const validationErrors = initialWord?.id
        ? ValidationService.validateWord(word as Word)
        : ValidationService.validateWordInput(word as Omit<Word, 'id'>);
      if (validationErrors.length > 0) {
        const errorMap: Record<string, string> = {};
        validationErrors.forEach((err: ValidationError) => {
          errorMap[err.field] = err.message;
        });
        setErrors(errorMap);
        return;
      }

      await onSubmit(word);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const availableOptionalFields = OPTIONAL_FIELDS.filter((f) => !activeOptionalFields.includes(f));
  const getWordLabel = useCallback(
    (id: string) => (resolveWordLabel ? resolveWordLabel(id) : id),
    [resolveWordLabel]
  );

  return (
    <form onSubmit={handleSubmit} className="word-form">
      {errors.submit && <div className="error-message">{errors.submit}</div>}

      <WordFields
        spellings={spellings}
        onSpellingsChange={setSpellings}
        pronunciation={pronunciation}
        onPronunciationChange={setPronunciation}
        definitions={definitions}
        onDefinitionsChange={setDefinitions}
        derivation={derivation}
        onDerivationChange={setDerivation}
        errors={errors}
        reusePromptOpen={reusePromptOpen}
        reuseCandidate={reuseCandidate}
        onReuseDecline={() => {
          setReusePromptOpen(false);
          setLastDeclinedSpelling(spellings[0]?.text?.trim() ?? '');
        }}
        onReuseAccept={() => {
          setReusePromptOpen(false);
          if (reuseCandidate) {
            onReuseExisting?.(reuseCandidate);
          }
        }}
      />

      {/* Relationship Fields */}
      <div className="relationship-buttons" role="group" aria-label="Add relationship fields">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => activateRelationshipField('siblingIds')}
        >
          Add Sibling
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => activateRelationshipField('childrenIds')}
        >
          Add Child
        </button>
      </div>

      {(onCreateChild || onCreateSibling) && (
        <div className="relationship-buttons" role="group" aria-label="Create related words">
          {onCreateChild && (
            <button type="button" className="btn-secondary" onClick={onCreateChild}>
              Create Child
            </button>
          )}
          {onCreateSibling && (
            <button type="button" className="btn-secondary" onClick={onCreateSibling}>
              Create Sibling
            </button>
          )}
        </div>
      )}

      {/* Optional Fields */}
      <div className="optional-fields-section">
        <h3>Optional Fields</h3>
        <div className="relationship-fields">
          {activeOptionalFields.includes('childrenIds') && (
            <div className="form-group relationship-field">
              <label>Child Words</label>
              {searchMode === 'childrenIds' ? (
                <OmniSearch onSelect={addRelationship} placeholder="Find child word..." />
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchMode('childrenIds')}
                  className="btn-secondary"
                >
                  Search Child Words
                </button>
              )}
              {childrenIds.length > 0 && (
                <div className="relationship-list">
                  {childrenIds.map((id) => (
                    <div key={id} className="relationship-tag">
                      {getWordLabel(id)}
                      <button
                        type="button"
                        onClick={() => removeRelationship('child', id)}
                        className="btn-remove-tag"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => toggleOptionalField('childrenIds')}
                className="btn-remove-field"
              >
                Remove Field
              </button>
            </div>
          )}

          {activeOptionalFields.includes('siblingIds') && (
            <div className="form-group relationship-field">
              <label>Sibling Words</label>
              {searchMode === 'siblingIds' ? (
                <OmniSearch onSelect={addRelationship} placeholder="Find sibling word..." />
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchMode('siblingIds')}
                  className="btn-secondary"
                >
                  Search Sibling Words
                </button>
              )}
              {siblingIds.length > 0 && (
                <div className="relationship-list">
                  {siblingIds.map((id) => (
                    <div key={id} className="relationship-tag">
                      {getWordLabel(id)}
                      <button
                        type="button"
                        onClick={() => removeRelationship('sibling', id)}
                        className="btn-remove-tag"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => toggleOptionalField('siblingIds')}
                className="btn-remove-field"
              >
                Remove Field
              </button>
            </div>
          )}
        </div>

        {activeOptionalFields.includes('hskLevel') && (
          <div className="form-group">
            <label>HSK Level</label>
            <select value={hskLevel} onChange={(e) => setHskLevel(e.target.value)}>
              <option value="">Select HSK Level</option>
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <option key={level} value={level}>
                  HSK {level}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => toggleOptionalField('hskLevel')}
              className="btn-remove-field"
            >
              Remove Field
            </button>
          </div>
        )}

        {activeOptionalFields.includes('jlptLevel') && (
          <div className="form-group">
            <label>JLPT Level</label>
            <select value={jlptLevel} onChange={(e) => setJlptLevel(e.target.value)}>
              <option value="">Select JLPT Level</option>
              {[1, 2, 3, 4].map((level) => (
                <option key={level} value={level}>
                  JLPT N{level}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => toggleOptionalField('jlptLevel')}
              className="btn-remove-field"
            >
              Remove Field
            </button>
          </div>
        )}

        {activeOptionalFields.includes('frequency') && (
          <div className="form-group">
            <label>Frequency</label>
            <input
              type="number"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="Frequency rank"
            />
            <button
              type="button"
              onClick={() => toggleOptionalField('frequency')}
              className="btn-remove-field"
            >
              Remove Field
            </button>
          </div>
        )}
      </div>

      {/* Add Optional Fields Dropdown */}
      {availableOptionalFields.length > 0 && (
        <div className="form-group">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                toggleOptionalField(e.target.value as FieldType);
                e.target.value = '';
              }
            }}
          >
            <option value="">Add Optional Field...</option>
            {availableOptionalFields.map((field) => (
              <option key={field} value={field}>
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Form Actions */}
      <div className="form-actions">
        <button type="submit" disabled={loading || submitDisabled} className="btn-primary">
          {loading ? 'Saving...' : initialWord?.id ? 'Update Word' : 'Create Word'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
