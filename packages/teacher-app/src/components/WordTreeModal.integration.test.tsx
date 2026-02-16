import { render, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WordTreeModal } from './WordTreeModal';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  createWord: vi.fn(),
  updateWord: vi.fn(),
}));

const createWordMock = vi.mocked(api.createWord);

const fillWordForm = async (
  form: HTMLFormElement,
  {
    spelling,
    pronunciation,
    definition,
  }: { spelling: string; pronunciation: string; definition: string }
) => {
  const utils = within(form);
  const spellingInput = utils.getByPlaceholderText('Enter spelling');
  const pronunciationInput = utils.getByPlaceholderText('e.g., zhu(3)zhang(1)');
  const definitionInput = utils.getByPlaceholderText('Enter definition');

  await userEvent.clear(spellingInput);
  await userEvent.type(spellingInput, spelling);
  await userEvent.clear(pronunciationInput);
  await userEvent.type(pronunciationInput, pronunciation);
  await userEvent.clear(definitionInput);
  await userEvent.type(definitionInput, definition);
};

const getSubmitButton = (form: HTMLFormElement) =>
  form.querySelector('button[type="submit"]') as HTMLButtonElement;

const findFormBySpelling = (container: HTMLElement, value: string) => {
  const forms = Array.from(container.querySelectorAll('form.word-form'));
  return (
    forms.find((form) => {
      const input = form.querySelector('input[placeholder="Enter spelling"]') as HTMLInputElement;
      return input?.value === value;
    }) || null
  );
};

const findNonRootForm = (container: HTMLElement, rootSpelling: string) => {
  const forms = Array.from(container.querySelectorAll('form.word-form'));
  return (
    forms.find((form) => {
      const input = form.querySelector('input[placeholder="Enter spelling"]') as HTMLInputElement;
      return input && input.value !== rootSpelling;
    }) || null
  );
};

const findWordNodeBySpelling = (container: HTMLElement, value: string) => {
  const form = findFormBySpelling(container, value);
  return (form?.closest('.word-node') as HTMLElement | null) ?? null;
};

const getRelationGroup = (node: HTMLElement, title: string) => {
  const groups = Array.from(node.querySelectorAll('.relation-group'));
  return (
    groups.find(
      (group) => group.querySelector('.relation-title')?.textContent?.trim() === title
    ) ?? null
  );
};

describe('WordTreeModal integration flow', () => {
  beforeEach(() => {
    createWordMock.mockReset();
    let counter = 0;
    createWordMock.mockImplementation(async (word) => ({
      ...word,
      id: `id-${(counter += 1)}`,
    }));
  });

  it('creates 主张 with sibling and descendants, enforcing save order', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <WordTreeModal isOpen rootWordId={null} words={[]} onClose={() => {}} />
    );

    const rootForm = container.querySelector('form.word-form') as HTMLFormElement;
    expect(rootForm).toBeTruthy();

    await fillWordForm(rootForm, {
      spelling: '主张',
      pronunciation: 'zhu(3)zhang(1)',
      definition: '(v) advocate',
    });

    await user.click(within(rootForm).getByRole('button', { name: 'Create Child' }));
    await user.click(within(rootForm).getByRole('button', { name: 'Create Child' }));
    await user.click(within(rootForm).getByRole('button', { name: 'Create Sibling' }));

    const formsAfterAdd = Array.from(container.querySelectorAll('form.word-form'));
    expect(formsAfterAdd.length).toBe(4);
    const rootSubmit = getSubmitButton(rootForm);
    expect((rootSubmit as HTMLButtonElement).disabled).toBe(true);

    const rootNode = container.querySelector('.word-node') as HTMLElement;
    const siblingGroup = rootNode ? getRelationGroup(rootNode, 'Siblings') : null;
    const childrenGroup = rootNode ? getRelationGroup(rootNode, 'Children') : null;
    const siblingForm = siblingGroup?.querySelector('form.word-form') as HTMLFormElement;
    const childForms = Array.from(childrenGroup?.querySelectorAll('form.word-form') ?? []);
    const childForm1 = childForms[0];
    const childForm2 = childForms[1];
    expect(childForm1).toBeTruthy();
    expect(childForm2).toBeTruthy();
    expect(siblingForm).toBeTruthy();

    await fillWordForm(childForm1, {
      spelling: '主',
      pronunciation: 'zhu(3)',
      definition: '(n) master',
    });
    await user.click(getSubmitButton(childForm1));
    await waitFor(() => expect(createWordMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(container.querySelectorAll('form.word-form').length).toBe(3));

    const refreshedRootNode = container.querySelector('.word-node') as HTMLElement;
    const refreshedSiblingGroup = refreshedRootNode
      ? getRelationGroup(refreshedRootNode, 'Siblings')
      : null;
    const refreshedChildrenGroup = refreshedRootNode
      ? getRelationGroup(refreshedRootNode, 'Children')
      : null;
    const siblingFormAfter = refreshedSiblingGroup?.querySelector(
      'form.word-form'
    ) as HTMLFormElement;
    expect(siblingFormAfter).toBeTruthy();

    await fillWordForm(siblingFormAfter, {
      spelling: 'しゅちょう',
      pronunciation: 'shuchou',
      definition: '(n) insistence',
    });
    await user.click(getSubmitButton(siblingFormAfter));
    await waitFor(() => expect(createWordMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(container.querySelectorAll('form.word-form').length).toBe(2));

    const latestRootNode = container.querySelector('.word-node') as HTMLElement;
    const latestChildrenGroup = latestRootNode
      ? getRelationGroup(latestRootNode, 'Children')
      : null;
    const latestChildForms = Array.from(
      latestChildrenGroup?.querySelectorAll('form.word-form') ?? []
    );
    const zhangFormFromGroup = latestChildForms[0];
    expect(zhangFormFromGroup).toBeTruthy();

    await fillWordForm(zhangFormFromGroup, {
      spelling: '张',
      pronunciation: 'zhang(1)',
      definition: '(n) sheet',
    });

    const zhangForm =
      (findFormBySpelling(container, '张') as HTMLFormElement | null) || zhangFormFromGroup;
    await user.click(within(zhangForm).getByRole('button', { name: 'Create Child' }));
    await user.click(within(zhangForm).getByRole('button', { name: 'Create Child' }));

    const zhangNode = findWordNodeBySpelling(container, '张');
    const zhangChildrenGroup = zhangNode ? getRelationGroup(zhangNode, 'Children') : null;
    const grandchildForms = Array.from(
      zhangChildrenGroup?.querySelectorAll('form.word-form') ?? []
    );
    expect(grandchildForms.length).toBe(2);
    await fillWordForm(grandchildForms[0], {
      spelling: '弓',
      pronunciation: 'gong(1)',
      definition: '(n) bow',
    });
    await user.click(getSubmitButton(grandchildForms[0]));
    await waitFor(() => expect(createWordMock).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(container.querySelectorAll('form.word-form').length).toBe(3));

    await fillWordForm(grandchildForms[1], {
      spelling: '长',
      pronunciation: 'chang(2)',
      definition: '(adj) long',
    });
    await user.click(getSubmitButton(grandchildForms[1]));
    await waitFor(() => expect(createWordMock).toHaveBeenCalledTimes(4));
    await waitFor(() => expect(container.querySelectorAll('form.word-form').length).toBe(2));

    const freshZhangForm =
      (findFormBySpelling(container, '张') as HTMLFormElement | null) ||
      (findNonRootForm(container, '主张') as HTMLFormElement | null) ||
      childForm2;
    await fillWordForm(freshZhangForm, {
      spelling: '张',
      pronunciation: 'zhang(1)',
      definition: '(n) sheet',
    });
    await user.click(getSubmitButton(freshZhangForm));
    await waitFor(() => expect(container.querySelectorAll('form.word-form').length).toBe(1));

    const latestRootForm = container.querySelector('form.word-form') as HTMLFormElement;
    const latestRootSubmit = getSubmitButton(latestRootForm);
    await fillWordForm(latestRootForm, {
      spelling: '主张',
      pronunciation: 'zhu(3)zhang(1)',
      definition: '(v) advocate',
    });
    await waitFor(() => expect((latestRootSubmit as HTMLButtonElement).disabled).toBe(false));
    await user.click(latestRootSubmit);
    await waitFor(() => expect(createWordMock).toHaveBeenCalledTimes(6));
  });
});
