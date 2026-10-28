import React, { useState } from 'react';

interface Props {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  maxItems: number;
  maxLength: number;
  placeholder?: string;
}

/** Editable list of short labels (tags, categories): add with Enter or the button, remove with ×. */
const TagListEditor: React.FC<Props> = ({ id, label, values, onChange, maxItems, maxLength, placeholder }) => {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addDraft = () => {
    const value = draft.trim();
    if (!value) return;
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setError(`"${value}" is already in the list`);
      return;
    }
    if (values.length >= maxItems) {
      setError(`You can add at most ${maxItems} items`);
      return;
    }
    onChange([...values, value]);
    setDraft('');
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter adds the item instead of submitting the surrounding form
    if (e.key === 'Enter') {
      e.preventDefault();
      addDraft();
    }
  };

  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      {values.length > 0 && (
        <ul className="list-unstyled d-flex flex-wrap gap-2 mb-2" aria-label={`${label} list`}>
          {values.map((value) => (
            <li key={value} className="badge bg-secondary-subtle text-secondary-emphasis d-flex align-items-center">
              <span>{value}</span>
              <button
                type="button"
                className="btn-close ms-2"
                style={{ fontSize: '0.6rem' }}
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((v) => v !== value))}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="input-group">
        <input
          id={id}
          type="text"
          className={`form-control ${error ? 'is-invalid' : ''}`}
          value={draft}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
        />
        <button type="button" className="btn btn-outline-secondary" onClick={addDraft} disabled={!draft.trim()}>
          Add
        </button>
        {error && <div className="invalid-feedback">{error}</div>}
      </div>
    </div>
  );
};

export default TagListEditor;
