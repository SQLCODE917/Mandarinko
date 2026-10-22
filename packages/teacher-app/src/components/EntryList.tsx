import type { ReactNode } from 'react';
import './WordList.css';

export function EntryList<T extends { id: string }>({
  entries,
  loading,
  loadingLabel,
  emptyLabel,
  renderEntry,
  onSelect,
  className,
}: {
  entries: T[];
  loading?: boolean;
  loadingLabel: string;
  emptyLabel: string;
  renderEntry: (entry: T) => ReactNode;
  onSelect?: (entry: T) => void;
  className?: string;
}) {
  if (loading)
    return (
      <div className="word-list-loading" role="status">
        {loadingLabel}
      </div>
    );
  if (!entries.length) return <div className="word-list-empty">{emptyLabel}</div>;
  return (
    <div className={`word-list${className ? ` ${className}` : ''}`}>
      {entries.map((entry) =>
        onSelect ? (
          <button
            key={entry.id}
            type="button"
            className="word-item"
            onClick={() => onSelect(entry)}
          >
            {renderEntry(entry)}
          </button>
        ) : (
          <div key={entry.id} className="word-item">
            {renderEntry(entry)}
          </div>
        )
      )}
    </div>
  );
}
