import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';

type RenderResult = {
  container: HTMLElement;
  unmount: () => void;
};

type MountedRoot = {
  container: HTMLElement;
  unmount: () => void;
};

const mountedRoots: MountedRoot[] = [];

const getByRole = (container: HTMLElement, role: string, options?: { name?: string | RegExp }) => {
  const name = options?.name;
  if (role === 'button') {
    const buttons = Array.from(container.querySelectorAll('button'));
    const match = buttons.find((button) => {
      const text = button.textContent?.trim() ?? '';
      if (!name) return true;
      return typeof name === 'string' ? text === name : name.test(text);
    });
    if (!match) throw new Error(`Unable to find button with name ${String(name)}`);
    return match;
  }

  if (role === 'textbox') {
    const inputs = Array.from(container.querySelectorAll('input, textarea'));
    const match = inputs.find((input) => {
      const value = (input as HTMLInputElement).value ?? '';
      if (!name) return true;
      return typeof name === 'string' ? value === name : name.test(value);
    });
    if (!match) throw new Error(`Unable to find textbox with name ${String(name)}`);
    return match;
  }

  throw new Error(`Role "${role}" not supported in test utils`);
};

const getByPlaceholderText = (container: HTMLElement, text: string) => {
  const input = container.querySelector(`[placeholder="${text}"]`);
  if (!input) throw new Error(`Unable to find input with placeholder "${text}"`);
  return input as HTMLInputElement;
};

const getByDisplayValue = (container: HTMLElement, value: string) => {
  const inputs = Array.from(container.querySelectorAll('input, textarea'));
  const match = inputs.find((input) => (input as HTMLInputElement).value === value);
  if (!match) throw new Error(`Unable to find input with value "${value}"`);
  return match as HTMLInputElement;
};

const queryByPlaceholderText = (container: HTMLElement, text: string) =>
  container.querySelector(`[placeholder="${text}"]`) as HTMLInputElement | null;

export const screen = {
  getByRole: (role: string, options?: { name?: string | RegExp }) =>
    getByRole(document.body, role, options),
  getByPlaceholderText: (text: string) => getByPlaceholderText(document.body, text),
  getByDisplayValue: (value: string) => getByDisplayValue(document.body, value),
  queryByPlaceholderText: (text: string) => queryByPlaceholderText(document.body, text),
};

export const within = (container: HTMLElement) => ({
  getByRole: (role: string, options?: { name?: string | RegExp }) =>
    getByRole(container, role, options),
  getByPlaceholderText: (text: string) => getByPlaceholderText(container, text),
  getByDisplayValue: (value: string) => getByDisplayValue(container, value),
  queryByPlaceholderText: (text: string) => queryByPlaceholderText(container, text),
});

export const render = (ui: ReactElement): RenderResult => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });

  const unmount = () => {
    act(() => root.unmount());
    container.remove();
  };

  const entry = { container, unmount };
  mountedRoots.push(entry);

  return {
    container,
    unmount,
  };
};

export const cleanup = () => {
  while (mountedRoots.length > 0) {
    const root = mountedRoots.pop();
    root?.unmount();
  }
};

export const waitFor = async (
  callback: () => void,
  { timeout = 1000, interval = 20 }: { timeout?: number; interval?: number } = {}
) => {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await act(async () => {
        callback();
      });
      return;
    } catch (err) {
      if (Date.now() - start >= timeout) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
};
