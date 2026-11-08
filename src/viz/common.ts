import { s, type TokenSpec } from '../engine/scene';
import type { Mark, Role, Tok } from '../types';

export const CELL = 50; // cell width/height in array diagrams
export const GAP = 8;
export const STEP = CELL + GAP;

export function roleOf(marks: Mark[], idx: number, row: 'main' | 'aux' = 'main'): Role | undefined {
  // later marks win
  let r: Role | undefined;
  for (const mk of marks) if (mk.idx === idx && (mk.row ?? 'main') === row) r = mk.role;
  return r;
}

/** A square value box centered on (0,0). */
export function boxToken(key: string, x: number, y: number, tok: Tok, role?: Role, extraCls = ''): TokenSpec {
  return {
    key,
    x,
    y,
    cls: `cell ${role ? 'role-' + role : ''} ${extraCls}`,
    build: () => [
      s('rect', { x: -CELL / 2, y: -CELL / 2, width: CELL, height: CELL, rx: 7 }),
      s('text', { class: 'val', y: 1, 'text-anchor': 'middle' }, [String(tok.v)]),
    ],
  };
}

/** A round node centered on (0,0). */
export function nodeToken(key: string, x: number, y: number, label: string, role?: Role, extraCls = '', r = 20): TokenSpec {
  return {
    key,
    x,
    y,
    cls: `node ${role ? 'role-' + role : ''} ${extraCls}`,
    build: () => [s('circle', { r }), s('text', { class: 'val', y: 1, 'text-anchor': 'middle' }, [label])],
  };
}

/** An arrow pointing up at (0,0) with a name underneath. */
export function ptrToken(key: string, x: number, y: number, name: string, dir: 'up' | 'down' = 'up'): TokenSpec {
  const d = dir === 'up' ? 'M0 0 L-6 10 L6 10 Z' : 'M0 0 L-6 -10 L6 -10 Z';
  return {
    key,
    x,
    y,
    cls: `ptr ptr-${name.replace(/[^a-z0-9]/gi, '')}`,
    build: () => [s('path', { d }), s('text', { y: dir === 'up' ? 24 : -16, 'text-anchor': 'middle' }, [name])],
  };
}

/** Empty slot outline centered on (x,y). */
export function slot(x: number, y: number, cls = ''): SVGElement {
  return s('rect', { class: 'slot ' + cls, x: x - CELL / 2, y: y - CELL / 2, width: CELL, height: CELL, rx: 7 });
}

export function label(x: number, y: number, text: string, cls = 'lbl', anchor = 'middle'): SVGElement {
  return s('text', { class: cls, x, y, 'text-anchor': anchor }, [text]);
}

/** Small floating label like "tmp" with the value box under it. */
export function floatLabel(x: number, y: number, text: string): SVGElement {
  return label(x, y - CELL / 2 - 8, text, 'lbl lbl-float');
}

/** Lay out pointer names that share an index so they stack instead of overlapping. */
export function stackPtrs<P extends { idx: number }>(ptrs: P[]): (P & { level: number })[] {
  const used: Record<string, number> = {};
  return ptrs.map((p) => {
    const k = String(p.idx) + ((p as { row?: string }).row ?? '');
    const level = used[k] ?? 0;
    used[k] = level + 1;
    return { ...p, level };
  });
}
