import { useState } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { EntrySearch } from './EntrySearch';

it('refreshes cached search text when an edited catalog arrives', async () => {
  function Catalog() {
    const [entries, setEntries] = useState([{ id: 'a', definition: 'before' }]);
    return (
      <>
        <EntrySearch
          entries={entries}
          placeholder="Search entries"
          renderEntry={(entry) => entry.definition}
          onSelect={() => {}}
        />
        <button className="edit" onClick={() => setEntries([{ id: 'a', definition: 'after' }])}>
          Edit fixture
        </button>
        <button className="remove" onClick={() => setEntries([])}>
          Remove fixture
        </button>
      </>
    );
  }
  const user = userEvent.setup();
  const { container } = render(<Catalog />);
  await user.type(container.querySelector('input')!, 'after');
  expect(container.querySelector('[role=status]')?.textContent).toBe('No results');
  await user.click(container.querySelector('.edit')!);
  expect(container.querySelector('.result-item')?.textContent).toBe('after');
  await user.click(container.querySelector('.remove')!);
  expect(container.querySelector('[role=status]')?.textContent).toBe('No results');
});
