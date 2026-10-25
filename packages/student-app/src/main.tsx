import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import type { DictionaryBoot } from './dictionary';
import { StaticDictionaryRepository } from './staticDictionary';
const boot = JSON.parse(document.getElementById('dictionary-boot')!.textContent!) as DictionaryBoot;
const root = document.getElementById('root')!;
const app = <App boot={boot} repository={new StaticDictionaryRepository(boot.url)} />;
if (root.childElementCount > 0) hydrateRoot(root, app);
else createRoot(root).render(app);
