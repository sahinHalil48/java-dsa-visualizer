import { s, type Frame, type TokenSpec } from '../engine/scene';
import type { HeapState } from '../types';
import { CELL, STEP, boxToken, floatLabel, label, nodeToken, ptrToken, roleOf, slot, stackPtrs } from './common';

// Heap diagram: the same data drawn twice, as a tree (top) and as the array (bottom).
// The same value has the same color in both, so you can see 2i / 2i+1 / i/2 at work.
export function heapFrame(st: HeapState): Frame {
  const len = st.cells.length;
  const base = st.base;
  const slots = Math.max(1, len - base);
  const D = Math.floor(Math.log2(slots));
  const arrLeft = 40;
  const arrW = arrLeft + len * STEP + 20;
  const treeW = Math.max(Math.pow(2, D) * 54, 300);
  const width = Math.max(treeW + 40, arrW);
  const treeLeft = (width - treeW) / 2;
  const treeTop = 70;
  const LV = 74;
  const arrY = treeTop + D * LV + 150;
  const height = arrY + 100;

  const pos = (i: number) => {
    const k = i - base + 1;
    const d = Math.floor(Math.log2(k));
    const p = k - Math.pow(2, d);
    return { x: treeLeft + ((p + 0.5) * treeW) / Math.pow(2, d), y: treeTop + d * LV };
  };
  const parent = (i: number) => (base === 1 ? Math.floor(i / 2) : Math.floor((i - 1) / 2));
  const cx = (i: number) => arrLeft + i * STEP + CELL / 2;

  const under: SVGElement[] = [];
  const statics: SVGElement[] = [];
  const tokens: TokenSpec[] = [];

  // tree edges
  for (let i = base + 1; i <= st.hi; i++) {
    const a = pos(parent(i));
    const b = pos(i);
    under.push(s('line', { class: 'edge', x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
  }
  // tree nodes
  for (let i = base; i <= st.hi; i++) {
    const p = pos(i);
    const c = st.cells[i];
    const role = roleOf(st.marks, i);
    statics.push(label(p.x + 24, p.y - 18, String(i), 'idx idx-tree', 'start'));
    if (c) tokens.push(nodeToken('n' + c.id, p.x, p.y, String(c.v), role));
    else statics.push(s('circle', { class: 'hole', cx: p.x, cy: p.y, r: 20 }));
  }

  // array
  if (st.sortedTail && st.hi < len - 1) {
    const x1 = cx(st.hi + 1) - CELL / 2 - 4;
    const x2 = cx(len - 1) + CELL / 2 + 4;
    under.push(s('rect', { class: 'range range-sorted', x: x1, y: arrY - CELL / 2 - 6, width: x2 - x1, height: CELL + 12, rx: 10 }));
  }
  for (let i = 0; i < len; i++) {
    const c = st.cells[i];
    const role = roleOf(st.marks, i);
    const outside = i > st.hi || i < base;
    const cls = i < base ? 'slot-sentinel' : outside && !st.sortedTail ? 'slot-off' : role ? 'slot-' + role : '';
    statics.push(slot(cx(i), arrY, cls));
    statics.push(label(cx(i), arrY - CELL / 2 - 8, String(i), 'idx'));
    if (c) tokens.push(boxToken((i < base ? 's' : 'a') + c.id, cx(i), arrY, c, role, outside && st.sortedTail ? 'is-sorted' : i < base ? 'is-sentinel' : ''));
  }
  if (base === 1) statics.push(label(cx(0), arrY + CELL / 2 + 20, st.cells[0] ? 'sentinel' : 'unused', 'lbl lbl-small'));

  // floating value (x in insert, tmp in percolateDown)
  if (st.float) {
    const p = pos(st.float.at);
    const fx = p.x + 46;
    const fy = p.y - 34;
    statics.push(label(fx, fy - 26, st.float.label, 'lbl lbl-float'));
    tokens.push(nodeToken('n' + st.float.tok.id, fx, fy, String(st.float.tok.v), 'active', 'floating', 17));
    const ax = cx(st.float.at);
    statics.push(floatLabel(ax, arrY - 78, st.float.label));
    tokens.push(boxToken('a' + st.float.tok.id, ax, arrY - 78, st.float.tok, 'active', 'floating'));
  }

  for (const pt of stackPtrs(st.ptrs)) {
    tokens.push(ptrToken('p' + pt.name, cx(pt.idx), arrY + CELL / 2 + 8 + pt.level * 34 + (base === 1 && pt.idx === 0 ? 20 : 0), pt.name));
    if (pt.idx >= base && pt.idx <= st.hi) {
      const p = pos(pt.idx);
      tokens.push({
        key: 'tp' + pt.name,
        x: p.x - 24,
        y: p.y + 30 + pt.level * 15,
        cls: `tag ptr-${pt.name.replace(/[^a-z0-9]/gi, '')}`,
        build: () => [s('text', { 'text-anchor': 'end' }, [pt.name])],
      });
    }
  }

  return { width, height, under, statics, tokens, edges: [] };
}
