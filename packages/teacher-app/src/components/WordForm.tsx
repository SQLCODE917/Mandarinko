import { useState, useCallback } from 'react';
import type { Word, Spelling } from '@mandarinko/core';
import { ValidationService } from '@mandarinko/core';

type ValidationError = { field: string; message: string };
import { OmniSearch } from './OmniSearch';
import './WordForm.css';

interface WordFormProps {
  initialWord?: Word & { id: string };
  onSubmit: (word: Word) => Promise<void>;
  onCancel: () => void;
}

type FieldType =
  | 'spelling'
  | 'pronunciation'
  | 'definition'
  | 'parentIds'
  | 'childrenIds'
  | 'siblingIds'
  | 'derivation'
  | 'hskLevel'
  | 'jlptLevel'
  | 'frequency';

const OPTIONAL_FIELDS: readonly FieldType[] = [
  'parentIds',
  'childrenIds',
  'siblingIds',
  'derivation',
  'hskLevel',
  'jlptLevel',
  'frequency',
];

export function WordForm({ initialWord, onSubmit, onCancel }: WordFormProps) {
  const [spellings, setSpellings] = useState<Spelling[]>(
    initialWord?.spelling || [{ language: 'zh-Hans', text: '' }]
  );
  const [pronunciation, setPronunciation] = useState(initialWord?.pronunciation || '');
  const [definitions, setDefinitions] = useState<string[]>(initialWord?.definition || ['']);
  const [parentIds, setParentIds] = useState<string[]>(initialWord?.parentIds || []);
  const [childrenIds, setChildrenIds] = useState<string[]>(initialWord?.childrenIds || []);
  const [siblingIds, setSiblingIds] = useState<string[]>(initialWord?.siblingIds || []);
  const [derivation, setDerivation] = useState(initialWord?.derivation || '');
  const [hskLevel, setHskLevel] = useState(initialWord?.metadata?.hskLevel || '');
  const [jlptLevel, setJlptLevel] = useState(initialWord?.metadata?.jlptLevel || '');
  const [frequency, setFrequency] = useState(initialWord?.metadata?.frequency || '');

  const [activeOptionalFields, setActiveOptionalFields] = useState<FieldType[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'parentIds' | 'childrenIds' | 'siblingIds' | null>(
    null
  );

  const toggleOptionalField = useCallback((field: FieldType) => {
    setActiveOptionalFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  }, []);

  const addRelationship = useCallback(
    (word: Word & { id: string }) => {
      if (searchMode === 'parentIds') {
        if (!parentIds.includes(word.id)) {
          setParentIds([...parentIds, word.id]);
        }
      } else if (searchMode === 'childrenIds') {
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
    [parentIds, childrenIds, siblingIds, searchMode]
  );

  const removeRelationship = useCallback(
    (type: 'parent' | 'child' | 'sibling', id: string) => {
      if (type === 'parent') {
        setParentIds(parentIds.filter((pid) => pid !== id));
      } else if (type === 'child') {
        setChildrenIds(childrenIds.filter((cid) => cid !== id));
      } else {
        setSiblingIds(siblingIds.filter((sid) => sid !== id));
      }
    },
    [parentIds, childrenIds, siblingIds]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const word: Word = {
        id: initialWord?.id || crypto.randomUUID(),
        spelling: spellings,
        pronunciation,
        definition: definitions.filter((d) => d.trim()),
        ...(parentIds.length > 0 && { parentIds }),
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

      const validationErrors = ValidationService.validateWord(word);
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

  return (
    <form onSubmit={handleSubmit} className="word-form">
      {errors.submit && <div className="error-message">{errors.submit}</div>}

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
                setSpellings(updated);
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
                setSpellings(updated);
              }}
              placeholder="Enter spelling"
            />
            {spellings.length > 1 && (
              <button
                type="button"
                onClick={() => setSpellings(spellings.filter((_, i) => i !== idx))}
                className="btn-remove"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {errors.spelling && <div className="field-error">{errors.spelling}</div>}
        <button
          type="button"
          onClick={() => setSpellings([...spellings, { language: 'zh-Hans', text: '' }])}
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
          onChange={(e) => setPronunciation(e.target.value)}
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
                setDefinitions(updated);
              }}
              placeholder="Enter definition"
            />
            {definitions.length > 1 && (
              <button
                type="button"
                onClick={() => setDefinitions(definitions.filter((_, i) => i !== idx))}
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
          onClick={() => setDefinitions([...definitions, ''])}
          className="btn-secondary"
        >
          Add Definition
        </button>
      </div>

      {/* Optional Fields */}
      <div className="optional-fields-section">
        <h3>Optional Fields</h3>
        {activeOptionalFields.includes('derivation') && (
          <div className="form-group">
            <label>Derivation</label>
            <input
              type="text"
              value={derivation}
              onChange={(e) => setDerivation(e.target.value)}
              placeholder="Explain word derivation"
            />
            <button
              type="button"
              onClick={() => toggleOptionalField('derivation')}
              className="btn-remove-field"
            >
              Remove Field
            </button>
          </div>
        )}

        {activeOptionalFields.includes('parentIds') && (
          <div className="form-group">
            <label>Parent Words</label>
            {searchMode === 'parentIds' ? (
              <OmniSearch onSelect={addRelationship} placeholder="Find parent word..." />
            ) : (
              <button
                type="button"
                onClick={() => setSearchMode('parentIds')}
                className="btn-secondary"
              >
                Search Parent Words
              </button>
            )}
            {parentIds.length > 0 && (
              <div className="relationship-list">
                {parentIds.map((id) => (
                  <div key={id} className="relationship-tag">
                    {id}
                    <button
                      type="button"
                      onClick={() => removeRelationship('parent', id)}
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
              onClick={() => toggleOptionalField('parentIds')}
              className="btn-remove-field"
            >
              Remove Field
            </button>
          </div>
        )}

        {activeOptionalFields.includes('childrenIds') && (
          <div className="form-group">
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
                    {id}
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
          <div className="form-group">
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
                    {id}
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
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : initialWord ? 'Update Word' : 'Create Word'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
