import type { CSSProperties } from 'react';
import '../styles/crt.css';

interface CRTTextProps {
  children: string;
  className?: string;
}

export function CRTText({ children, className = '' }: CRTTextProps) {
  const style = { '--crt-steps': Math.max(1, Array.from(children).length) } as CSSProperties;

  return (
    <span className={`crt-text crt-type ${className}`} style={style}>
      <span className="crt-type__text">{children}</span>
      <span className="crt-type__cursor" aria-hidden="true" />
    </span>
  );
}
