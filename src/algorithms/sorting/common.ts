import { m } from '../../i18n';
import { fmt, randomList } from '../../engine/code';
import type { ArrayState, InputField, Range, Tok } from '../../types';

export const toks = (vals: number[]): Tok[] => vals.map((v, i) => ({ id: i + 1, v }));
export const vals = (cells: (Tok | null)[]) => cells.map((c) => (c ? c.v : null));
export const show = (cells: (Tok | null)[]) => fmt(vals(cells));

export function A(cells: (Tok | null)[], extra: Partial<ArrayState> = {}): ArrayState {
  return { kind: 'array', cells: cells.slice(), ptrs: [], marks: [], ranges: [], ...extra };
}

export const sortedR = (from: number, to: number): Range => ({ from, to, role: 'sorted' });

export const arrInput: InputField = { key: 'arr', label: m('Array (numbers separated by spaces)', 'Dizi (boşlukla ayrılmış sayılar)'), type: 'list' };

export const randomArr = (n = 8) => () => ({ arr: randomList(n, 1, 99).join(' ') });

export const sortTests = [
  [34, 8, 64, 51, 32, 21],
  [5, 1, 4, 2, 8],
  [1, 2, 3, 4, 5],
  [5, 4, 3, 2, 1],
  [3, 3, 1, 3, 2],
  [7],
];
