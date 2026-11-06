'use client';

// Редактор SQL на CodeMirror 6: подсветка, автодополнение по таблицам «Чайханы»,
// Ctrl/Cmd+Enter — запуск. Лёгкий (~150 КБ) и нормально работает на телефонах.
import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as cmPlaceholder, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { HighlightStyle, syntaxHighlighting, bracketMatching } from '@codemirror/language';
import { sql, SQLite } from '@codemirror/lang-sql';
import { tags } from '@lezer/highlight';
import { CHAIKHANA_SCHEMA } from '@/lib/schema';

const theme = EditorView.theme(
  {
    '&': { backgroundColor: '#142640', color: '#f5ede0', fontSize: '16px', borderRadius: '12px' },
    '.cm-content': { fontFamily: 'var(--font-mono)', padding: '12px 0', caretColor: '#d4a24c' },
    '.cm-gutters': { backgroundColor: '#142640', color: '#5f7799', border: 'none', borderRadius: '12px 0 0 12px' },
    '.cm-activeLine': { backgroundColor: 'rgb(255 255 255 / 0.04)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#d4a24c' },
    '&.cm-focused': { outline: 'none' },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#d4a24c' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'rgb(212 162 76 / 0.3) !important' },
    '.cm-placeholder': { color: '#6f87a8' },
    '.cm-tooltip-autocomplete': { backgroundColor: '#1d3557', border: '1px solid #d4a24c', borderRadius: '8px' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#c8552c', color: '#fff' },
  },
  { dark: true },
);

const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#e8c98a', fontWeight: '600' },
  { tag: [tags.string, tags.special(tags.string)], color: '#9fd8b8' },
  { tag: [tags.number, tags.bool, tags.null], color: '#f0a07c' },
  { tag: tags.comment, color: '#6f87a8', fontStyle: 'italic' },
  { tag: [tags.operator, tags.punctuation], color: '#c9d4e3' },
  { tag: [tags.typeName, tags.standard(tags.name)], color: '#8fc1ff' },
]);

type Props = {
  initialValue: string;
  onChange: (value: string) => void;
  onRun: () => void;
  placeholder: string;
  ariaLabel: string;
  /** Таблицы и столбцы для автодополнения */
  schema?: Record<string, string[]>;
};

export function SqlEditor({ initialValue, onChange, onRun, placeholder, ariaLabel, schema = CHAIKHANA_SCHEMA }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Колбэки через ref — чтобы не пересоздавать редактор при каждом рендере
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          bracketMatching(),
          closeBrackets(),
          autocompletion({ activateOnTyping: true }),
          sql({ dialect: SQLite, schema, upperCaseKeywords: true }),
          syntaxHighlighting(highlight),
          theme,
          cmPlaceholder(placeholder),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': ariaLabel, autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' }),
          keymap.of([
            { key: 'Mod-Enter', run: () => { onRunRef.current(); return true; } },
            ...closeBracketsKeymap,
            ...completionKeymap,
            ...historyKeymap,
            indentWithTab,
            ...defaultKeymap,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    return () => view.destroy();
    // Редактор создаётся один раз на задание; смену задания обрабатывает key у родителя
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="min-h-[140px] overflow-hidden rounded-xl border border-lazur-soft [&_.cm-editor]:min-h-[140px]" />;
}
