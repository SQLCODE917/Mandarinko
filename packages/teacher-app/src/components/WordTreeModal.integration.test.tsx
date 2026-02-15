import { render, screen, within, waitFor } from '@testing-library/react';
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

    const childForm1 = formsAfterAdd[1];
    const childForm2 = formsAfterAdd[2];
    const siblingForm = formsAfterAdd[3];

    await fillWordForm(childForm1, {
      spelling: '主',
      pronunciation: 'zhu(3)',
      definition: '(n) master',
    });
    await user.click(getSubmitButton(childForm1));
    await waitFor(() => expect(createWordMock).toHaveBeenCalledTimes(1));

    await fillWordForm(siblingForm, {
      spelling: 'しゅちょう',
      pronunciation: 'shuchou',
      definition: '(n) insistence',
    });
    await user.click(getSubmitButton(siblingForm));
    await waitFor(() => expect(createWordMock).toHaveBeenCalledTimes(2));

    await fillWordForm(childForm2, {
      spelling: '张',
      pronunciation: 'zhang(1)',
      definition: '(n) sheet',
    });

    const zhangForm = screen.getByDisplayValue('张').closest('form') as HTMLFormElement;
    await user.click(within(zhangForm).getByRole('button', { name: 'Create Child' }));
    await user.click(within(zhangForm).getByRole('button', { name: 'Create Child' }));

    const formsAfterGrandchildren = Array.from(container.querySelectorAll('form.word-form'));
    const grandchildForms = formsAfterGrandchildren.slice(-2);
    await fillWordForm(grandchildForms[0], {
      spelling: '弓',
      pronunciation: 'gong(1)',
      definition: '(n) bow',
    });
    await user.click(getSubmitButton(grandchildForms[0]));
    await waitFor(() => expect(createWordMock).toHaveBeenCalledTimes(3));

    await fillWordForm(grandchildForms[1], {
      spelling: '长',
      pronunciation: 'chang(2)',
      definition: '(adj) long',
    });
    await user.click(getSubmitButton(grandchildForms[1]));
    await waitFor(() => expect(createWordMock).toHaveBeenCalledTimes(4));

    await user.click(getSubmitButton(zhangForm));
    await waitFor(() => expect(createWordMock).toHaveBeenCalledTimes(5));

    await waitFor(() => expect((rootSubmit as HTMLButtonElement).disabled).toBe(false));
    await user.click(rootSubmit);
    await waitFor(() => expect(createWordMock).toHaveBeenCalledTimes(6));
  });
});
