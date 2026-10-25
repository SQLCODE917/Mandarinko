import { EntryHeading as ReadingHeading, type EntryHeadingProps } from '@mandarinko/ui';
import { StrokeOrderSpelling } from './StrokeOrderSpelling';
import { hasStrokeOrder } from '../services/strokeOrder';
import './WordEntry.css';
export function EntryHeading({
  strokeOrder = false,
  ...props
}: Omit<EntryHeadingProps, 'renderSpelling'> & { strokeOrder?: boolean }) {
  return (
    <ReadingHeading
      {...props}
      renderSpelling={
        strokeOrder
          ? (item) =>
              hasStrokeOrder(item.text, item.language) ? (
                <StrokeOrderSpelling text={item.text} language={item.language} />
              ) : (
                <span lang={item.language} title={item.language}>
                  {item.text}
                </span>
              )
          : undefined
      }
    />
  );
}
