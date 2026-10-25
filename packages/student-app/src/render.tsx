import { renderToString } from 'react-dom/server';
import { App } from './App';
import type { DictionaryBoot } from './dictionary';
export const render = (boot: DictionaryBoot) => renderToString(<App boot={boot} />);
