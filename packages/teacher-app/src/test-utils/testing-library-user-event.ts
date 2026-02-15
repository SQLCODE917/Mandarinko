const setNativeValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const elementValueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (prototypeValueSetter && elementValueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (elementValueSetter) {
    elementValueSetter.call(element, value);
  } else {
    element.value = value;
  }
};

const triggerInput = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  setNativeValue(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
};

const click = async (element: Element) => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const type = async (element: Element, text: string) => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    await act(async () => {
      triggerInput(element, text);
    });
  }
};

const clear = async (element: Element) => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    await act(async () => {
      triggerInput(element, '');
    });
  }
};

const setup = () => ({
  click,
  type,
  clear,
});

export default {
  setup,
  click,
  type,
  clear,
};
import { act } from 'react';
