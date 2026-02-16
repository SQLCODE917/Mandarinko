import { describe, it, expect } from 'vitest';
import { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import { useWordTree } from './useWordTree';

function TestTree() {
  const { nodes, rootNode, addChild } = useWordTree({
    isOpen: true,
    rootWordId: '0',
    words: [
      {
        id: '0',
        spelling: [{ language: 'zh-Hans', text: '主张' }],
        pronunciation: 'zhu(3)zhang(1)',
        definition: ['(v) advocate'],
      },
    ],
  });

  useEffect(() => {
    addChild('0');
  }, [addChild]);

  const childCount = rootNode?.word.childrenIds?.length ?? 0;
  return (
    <div>
      <div data-testid="node-count">{nodes.size}</div>
      <div data-testid="child-count">{childCount}</div>
    </div>
  );
}

describe('useWordTree', () => {
  it('adds a draft child and updates parent childrenIds', async () => {
    const { container } = render(<TestTree />);
    await waitFor(() => {
      const nodeCount = Number(
        (container.querySelector('[data-testid="node-count"]') as HTMLElement).textContent
      );
      const childCount = Number(
        (container.querySelector('[data-testid="child-count"]') as HTMLElement).textContent
      );
      expect(nodeCount).toBe(2);
      expect(childCount).toBe(1);
    });
  });
});
