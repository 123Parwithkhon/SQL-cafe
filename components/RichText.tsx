// Мини-разметка уроков: `код`, **жирный**, пустая строка — новый абзац.
// Без dangerouslySetInnerHTML — текст разбирается в React-элементы.
import type { ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-lazur/10 px-1 py-0.5 font-mono text-[0.9em] text-terra-dark">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\n+/).map((paragraph, i) => (
        <p key={i} className="mt-2 leading-relaxed first:mt-0">
          {inline(paragraph)}
        </p>
      ))}
    </>
  );
}
