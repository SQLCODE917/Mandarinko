import { describe, it, expect, vi } from 'vitest';
import { render, within } from '@testing-library/react';
import { WordViewerModal } from './WordViewerModal';

describe('WordViewerModal', () => {
  it('renders the root word and triggers edit', () => {
    const onEdit = vi.fn();
    const { container } = render(
      <WordViewerModal
        isOpen
        rootWordId="0"
        words={[
          {
            id: '0',
            spelling: [{ language: 'zh-Hans', text: '主张' }],
            pronunciation: 'zhu(3)zhang(1)',
            definition: ['(v) advocate'],
            childrenIds: ['1'],
          },
          {
            id: '1',
            spelling: [{ language: 'zh-Hans', text: '主' }],
            pronunciation: 'zhu(3)',
            definition: ['(n) master'],
          },
        ]}
        onClose={() => {}}
        onEdit={onEdit}
      />
    );

    const rootNode = container.querySelector('.word-node') as HTMLElement;
    expect(rootNode).toBeTruthy();
    expect(container.textContent).toContain('主张');
    expect(container.textContent).toContain('(v) advocate');

    const editButton = within(rootNode).getByRole('button', { name: 'Edit' });
    editButton.click();
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '0',
        pronunciation: 'zhu(3)zhang(1)',
      })
    );
  });
});
