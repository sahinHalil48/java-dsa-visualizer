import { s, type Frame, type TokenSpec } from '../engine/scene';
import type { BucketState, QueueState, StackState } from '../types';
import { CELL, STEP, boxToken, label, ptrToken, roleOf, slot } from './common';

// ---------- Stack: array drawn bottom-up, topOfStack arrow on the left ----------
export function stackFrame(st: StackState): Frame {
  const cap = st.cells.length;
  const x = 150,
    top = 40;
  const y = (i: number) => top + (cap - 1 - i) * STEP + CELL / 2;
  const statics: SVGElement[] = [];
  const tokens: TokenSpec[] = [];
  statics.push(s('path', { class: 'stack-walls', d: `M${x - 34} ${top - 6} V${y(0) + CELL / 2 + 8} H${x + 34} V${top - 6}` }));
  for (let i = 0; i < cap; i++) {
    const role = roleOf(st.marks, i);
    statics.push(slot(x, y(i), role ? 'slot-' + role : ''), label(x + 44, y(i) + 5, String(i), 'idx', 'start'));
    const c = st.cells[i];
    if (c) tokens.push(boxToken('t' + c.id, x, y(i), c, role));
  }
  const ty = st.top >= 0 ? y(st.top) : y(0) + STEP;
  tokens.push({
    key: 'top',
    x: x - 44,
    y: ty,
    cls: 'ptr ptr-top',
    build: () => [s('path', { d: 'M0 0 L-10 -6 L-10 6 Z' }), s('text', { x: -16, y: 5, 'text-anchor': 'end' }, [`topOfStack = ${st.top}`])],
  });
  const ox = 290;
  statics.push(label(ox, top + 10, 'push(x)', 'lbl lbl-small'), label(ox, y(0) - 30, 'return', 'lbl lbl-small'));
  if (st.incoming) tokens.push(boxToken('t' + st.incoming.id, ox, top + 50, st.incoming, 'active', 'incoming'));
  if (st.out) tokens.push(boxToken('t' + st.out.id, ox, y(0), st.out, 'found'));
  return { width: 360, height: y(0) + CELL / 2 + 70, under: [], statics, tokens, edges: [] };
}

// ---------- Queue: circular array drawn as a ring + the same array as a row ----------
export function queueFrame(st: QueueState): Frame {
  const n = st.cells.length;
  const R = Math.max(90, n * 15);
  const cx = R + 120,
    cy = R + 70;
  const ang = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const P = (i: number, r: number) => ({ x: cx + r * Math.cos(ang(i)), y: cy + r * Math.sin(ang(i)) });
  const statics: SVGElement[] = [];
  const under: SVGElement[] = [];
  const tokens: TokenSpec[] = [];
  under.push(s('circle', { class: 'ring', cx, cy, r: R }));
  under.push(s('path', { class: 'ring-dir', d: `M${cx + 22} ${cy - R + 34} A ${R - 34} ${R - 34} 0 0 1 ${P(1, R - 34).x} ${P(1, R - 34).y}`, 'marker-end': 'url(#arrowhead)' }));
  const rowY = cy + R + 110;
  const rowLeft = Math.max(20, cx - (n * STEP) / 2);
  const rx = (i: number) => rowLeft + i * STEP + CELL / 2;
  for (let i = 0; i < n; i++) {
    const p = P(i, R);
    const role = roleOf(st.marks, i);
    statics.push(slot(p.x, p.y, role ? 'slot-' + role : ''));
    const lp = P(i, R + 44);
    statics.push(label(lp.x, lp.y + 4, String(i), 'idx'));
    statics.push(slot(rx(i), rowY, role ? 'slot-' + role : ''), label(rx(i), rowY - CELL / 2 - 8, String(i), 'idx'));
    const c = st.cells[i];
    if (c) {
      tokens.push(boxToken('r' + c.id, p.x, p.y, c, role));
      tokens.push(boxToken('a' + c.id, rx(i), rowY, c, role));
    }
  }
  const ptrIn = (name: string, i: number, k: number) => {
    const p = P(i, R - 50 - k * 20);
    tokens.push({ key: 'q' + name, x: p.x, y: p.y, cls: `tag ptr-${name}`, build: () => [s('text', { 'text-anchor': 'middle', y: 4 }, [name])] });
  };
  ptrIn('front', st.front, 0);
  ptrIn('back', ((st.back % n) + n) % n, st.back === st.front ? 1 : 0);
  tokens.push(ptrToken('pf', rx(st.front), rowY + CELL / 2 + 8, 'front'));
  tokens.push(ptrToken('pb', rx(((st.back % n) + n) % n), rowY + CELL / 2 + 8 + (st.back === st.front ? 34 : 0), 'back'));
  statics.push(label(cx, cy - 4, `size = ${st.size}`, 'lbl'), label(cx, cy + 16, `capacity = ${n}`, 'lbl lbl-small'));
  if (st.back < 0) statics.push(label(cx, cy + 36, 'back = -1', 'lbl lbl-small'));
  statics.push(label(40, 30, 'enqueue', 'lbl lbl-small'), label(cx * 2 - 40, 30, 'dequeue', 'lbl lbl-small'));
  if (st.incoming) tokens.push(boxToken('r' + st.incoming.id, 40, 70, st.incoming, 'active', 'incoming'));
  if (st.out) tokens.push(boxToken('r' + st.out.id, cx * 2 - 40, 70, st.out, 'found'));
  return { width: Math.max(cx * 2, rowLeft * 2 + n * STEP), height: rowY + 100, under, statics, tokens, edges: [] };
}

// ---------- Radix sort: the array on top, ten buckets below ----------
export function bucketFrame(st: BucketState): Frame {
  const n = st.cells.length;
  const left = 30;
  const BW = 62;
  const width = Math.max(left * 2 + n * STEP, left * 2 + 10 * BW);
  const rowY = 60;
  const bTop = 170;
  const maxB = Math.max(3, ...st.buckets.map((b) => b.length), Math.ceil(n / 3));
  const height = bTop + maxB * 44 + 70;
  const statics: SVGElement[] = [];
  const under: SVGElement[] = [];
  const tokens: TokenSpec[] = [];
  const digitTok = (key: string, x: number, y: number, v: number, role?: string, w = CELL) => {
    const str = String(v).padStart(st.digits, '0');
    const pos = st.digits - 1 - Math.round(Math.log10(st.place));
    return {
      key,
      x,
      y,
      cls: `cell ${role ? 'role-' + role : ''}`,
      build: () => [
        s('rect', { x: -w / 2, y: -19, width: w, height: 38, rx: 7 }),
        s(
          'text',
          { class: 'val val-digits', y: 1, 'text-anchor': 'middle' },
          [...str].map((ch, i) => s('tspan', { class: i === pos ? 'digit-hot' : '' }, [ch])),
        ),
      ],
    } as TokenSpec;
  };
  st.cells.forEach((c, i) => {
    const x = left + i * STEP + CELL / 2;
    const role = roleOf(st.marks, i);
    statics.push(slot(x, rowY, role ? 'slot-' + role : ''), label(x, rowY - CELL / 2 - 8, String(i), 'idx'));
    if (c) tokens.push(digitTok('t' + c.id, x, rowY, c.v, role));
  });
  const bx = (b: number) => left + b * BW + BW / 2;
  for (let b = 0; b < 10; b++) {
    under.push(s('rect', { class: 'bucket' + (st.activeBucket === b ? ' bucket-hot' : ''), x: bx(b) - BW / 2 + 3, y: bTop - 10, width: BW - 6, height: maxB * 44 + 18, rx: 8 }));
    statics.push(label(bx(b), bTop - 20, String(b), 'lbl bucket-lbl'));
    st.buckets[b].forEach((c, k) => tokens.push(digitTok('t' + c.id, bx(b), bTop + 14 + k * 44, c.v, undefined, BW - 14)));
  }
  statics.push(label(left, bTop + maxB * 44 + 46, `place = ${st.place}  →  digit = (x / ${st.place}) % 10`, 'lbl lbl-small', 'start'));
  return { width, height, under, statics, tokens, edges: [] };
}
