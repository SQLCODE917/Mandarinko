import { useId, useState, type ReactNode } from 'react';
import type { ReadingNode, Word } from '@mandarinko/core';
import { EntryHeading, WordEntry, type DerivationNavigation } from '@mandarinko/ui';

type Navigation = { navigation: DerivationNavigation };

function WordLink({
  word,
  children,
  navigation,
}: Navigation & { word: Word; children: ReactNode }) {
  return (
    <a
      href={navigation.hrefForWord(word.id)}
      onClick={(event) => {
        if (
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          navigation.onNavigate(word.id);
        }
      }}
    >
      {children}
    </a>
  );
}

/** The arrow controls disclosure; headings and derivation references navigate independently. */
function ComponentBranch({
  node,
  children,
  navigation,
}: Navigation & { node: ReadingNode; children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const id = useId();
  const label = node.word.spelling.map((spelling) => spelling.text).join(' / ');
  return (
    <div className="component-branch">
      <button
        type="button"
        className="component-toggle"
        aria-expanded={expanded}
        aria-controls={`${id}-body ${id}-children`}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label} component`}
        onClick={() => setExpanded((value) => !value)}
      >
        <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
      </button>
      <div className="component-content">
        <WordLink word={node.word} navigation={navigation}>
          <EntryHeading {...node.word} />
        </WordLink>
        <span className="component-body" id={`${id}-body`} hidden={!expanded}>
          <WordEntry word={node.word} navigation={navigation} heading={<></>} />
        </span>
        <div id={`${id}-children`} hidden={!expanded}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function RelationList({
  nodes,
  collapsible = false,
  navigation,
}: Navigation & {
  nodes: ReadingNode[];
  collapsible?: boolean;
}) {
  return (
    <ul className="relation-list">
      {nodes.map((node) => {
        const children = node.children.length > 0 && (
          <RelationList nodes={node.children} collapsible={collapsible} navigation={navigation} />
        );
        return (
          <li key={node.word.id}>
            {collapsible ? (
              <ComponentBranch node={node} navigation={navigation}>
                {children}
              </ComponentBranch>
            ) : (
              <>
                <WordLink word={node.word} navigation={navigation}>
                  <EntryHeading {...node.word} />
                </WordLink>
                <WordEntry word={node.word} navigation={navigation} heading={<></>} />
                {children}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
