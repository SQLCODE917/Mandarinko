import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

/** Shared resizing keeps both authoring flows stable while text grows. */
export function GrowingTextField(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = () => {
      const body = element.closest('.word-tree-body');
      const scroll = body?.scrollTop;
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight + 2}px`;
      if (body && scroll !== undefined) body.scrollTop = scroll;
    };
    resize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [props.value]);
  return <textarea ref={ref} rows={1} {...props} />;
}
