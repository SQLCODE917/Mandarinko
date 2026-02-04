import './LCDText.css';

interface LCDTextProps {
  children: React.ReactNode;
  className?: string;
}

export function LCDText({ children, className }: LCDTextProps) {
  const containerClass = `lcd-text ${className}`;
  return (
    <span className={containerClass}>
      {children}
      <span className="cursor">&nbsp;</span>
    </span>
  );
}
