import { useLayoutEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import './WordTreeModal.css';

export function EntryDialog({
  title,
  titleId,
  titleRef,
  authoring,
  className,
  onClose,
  children,
}: {
  title: string;
  titleId?: string;
  titleRef?: RefObject<HTMLDivElement>;
  authoring?: boolean;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ownTitle = useRef<HTMLDivElement>(null);
  const heading = titleRef ?? ownTitle;
  const generatedId = useId();
  const id = titleId ?? generatedId;
  useLayoutEffect(() => {
    const trigger = document.activeElement;
    return () => {
      if ((trigger instanceof HTMLElement || trigger instanceof SVGElement) && trigger.isConnected)
        trigger.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      className={`word-tree-modal${className ? ` ${className}` : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={id}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
        if (event.key === 'Tab') {
          const fields = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), textarea:not(:disabled), input:not(:disabled), select:not(:disabled), summary, a[href]'
            ),
          ].filter(
            (element) =>
              element.getClientRects().length > 0 && !element.closest('fieldset:disabled')
          );
          const first = fields[0],
            last = fields[fields.length - 1];
          if (
            (!event.shiftKey && document.activeElement === last) ||
            (event.shiftKey &&
              (document.activeElement === first || document.activeElement === heading.current))
          ) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
          }
        }
      }}
    >
      <div className="word-tree-backdrop" onClick={onClose} />
      <div className={`word-tree-content${authoring ? ' is-authoring' : ''}`}>
        <div className="word-tree-header">
          <div className="word-tree-title" id={id} tabIndex={-1} ref={heading}>
            {title}
          </div>
          <button type="button" className="word-tree-close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="word-tree-body">{children}</div>
      </div>
    </div>
  );
}
