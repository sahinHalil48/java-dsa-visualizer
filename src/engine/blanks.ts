import type { Blank } from '../types';

// Spaces and a trailing semicolon do not matter when checking an answer.
const norm = (s: string) => s.replace(/\s+/g, '').replace(/;$/, '');

export function isCorrect(b: Blank, value: string): boolean {
  const v = norm(value);
  return [b.text, ...(b.accept ?? [])].some((a) => norm(a) === v);
}
