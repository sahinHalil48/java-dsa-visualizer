import type { ParsedCode } from '../types';
import { InputError } from './tracer';
import { m } from '../i18n';

/**
 * Parse Java source written with `//@label` markers at line ends.
 * The markers are removed from the displayed code; they let the algorithm
 * refer to lines by name instead of by fragile line numbers.
 *
 *   for (int p = 1; p < a.length; p++) {   //@outer
 */
export function java(src: string): ParsedCode {
  const raw = src.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
  // remove common indentation
  const indent = Math.min(...raw.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  const lines: string[] = [];
  const labels: Record<string, number> = {};
  raw.forEach((l, i) => {
    const mm = l.match(/\s*\/\/@([\w-]+)\s*$/);
    let text = l;
    if (mm) {
      labels[mm[1]] = i + 1;
      text = l.slice(0, mm.index);
    }
    lines.push(text.slice(indent).replace(/\s+$/, ''));
  });
  return { lines, labels };
}

// ---------- input parsing helpers ----------

export function parseList(s: string, opts: { min?: number; max?: number; lo?: number; hi?: number; name?: string } = {}): number[] {
  const { min = 1, max = 16, lo = -999, hi = 999 } = opts;
  const parts = s
    .split(/[\s,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const nums = parts.map((p) => {
    if (!/^-?\d+$/.test(p)) throw new InputError(m(`"${p}" is not a whole number.`, `"${p}" bir tam sayı değil.`));
    return parseInt(p, 10);
  });
  if (nums.length < min) throw new InputError(m(`Enter at least ${min} numbers.`, `En az ${min} sayı gir.`));
  if (nums.length > max) throw new InputError(m(`Use at most ${max} numbers so the diagram stays readable.`, `Diyagram okunaklı kalsın diye en fazla ${max} sayı gir.`));
  for (const n of nums)
    if (n < lo || n > hi) throw new InputError(m(`Numbers must be between ${lo} and ${hi}.`, `Sayılar ${lo} ile ${hi} arasında olmalı.`));
  return nums;
}

export function parseNum(s: string, lo: number, hi: number, name: string): number {
  const t = s.trim();
  if (!/^-?\d+$/.test(t)) throw new InputError(m(`${name} must be a whole number.`, `${name} bir tam sayı olmalı.`));
  const n = parseInt(t, 10);
  if (n < lo || n > hi) throw new InputError(m(`${name} must be between ${lo} and ${hi}.`, `${name} ${lo} ile ${hi} arasında olmalı.`));
  return n;
}

export const fmt = (a: (number | null | undefined)[]) => '[' + a.map((x) => (x == null ? '_' : x)).join(', ') + ']';

export function randomList(n: number, lo: number, hi: number, distinct = true): number[] {
  const out: number[] = [];
  let guard = 0;
  while (out.length < n && guard++ < 1000) {
    const x = lo + Math.floor(Math.random() * (hi - lo + 1));
    if (!distinct || !out.includes(x)) out.push(x);
  }
  return out;
}
