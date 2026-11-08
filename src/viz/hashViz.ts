import { s, type Frame, type TokenSpec } from '../engine/scene';
import type { HashState } from '../types';
import { CELL, boxToken, label, roleOf, slot } from './common';

// Hash table drawn vertically (index 0 at the top), like in the slides.
// Separate chaining: each slot points to a linked list.
// Probing: the incoming key walks down the probe sequence until it finds a free slot.
export function hashFrame(st: HashState): Frame {
  const M = st.mode === 'chain' ? st.chains.length : st.slots.length;
  const top = 104,
    RH = 52,
    cellX = 104;
  const rowY = (i: number) => top + i * RH;
  const maxChain = Math.max(0, ...st.chains.map((c) => c.length));
  const width = st.mode === 'chain' ? Math.max(440, cellX + 76 * (maxChain + 2) + 20) : 440;
  const height = top + M * RH;

  const under: SVGElement[] = [];
  const statics: SVGElement[] = [];
  const tokens: TokenSpec[] = [];

  // formula + load factor
  if (st.calc) statics.push(label(16, 30, st.calc, 'lbl calc', 'start'));
  const lam = st.size / M;
  statics.push(label(16, 62, `λ = N / M = ${st.size} / ${M} = ${lam.toFixed(2)}`, 'lbl lbl-small', 'start'));
  const barW = 120;
  under.push(s('rect', { class: 'lam-bg', x: 190, y: 52, width: barW, height: 10, rx: 5 }));
  under.push(s('rect', { class: 'lam-fg' + (lam > (st.mode === 'chain' ? 1 : 0.5) ? ' lam-high' : ''), x: 190, y: 52, width: Math.min(1, lam) * barW, height: 10, rx: 5 }));

  for (let i = 0; i < M; i++) {
    const y = rowY(i);
    const role = roleOf(st.marks, i);
    statics.push(label(30, y + 5, String(i), 'idx idx-hash', 'end'));
    const order = st.probe?.indexOf(i) ?? -1;
    if (order >= 0) {
      statics.push(s('circle', { class: 'probe-dot', cx: 54, cy: y, r: 10 }), label(54, y + 4, String(order), 'probe-num'));
    }
    if (st.mode === 'probe') {
      statics.push(slot(cellX, y, role ? 'slot-' + role : ''));
      const c = st.slots[i];
      if (c) tokens.push(boxToken('t' + c.id, cellX, y, c, role));
    } else {
      // bucket cell holding the list head pointer
      statics.push(slot(cellX, y, 'slot-head ' + (role ? 'slot-' + role : '')));
      const chain = st.chains[i];
      if (chain.length === 0) statics.push(label(cellX, y + 4, 'null', 'lbl lbl-small'));
      let px = cellX;
      chain.forEach((c, k) => {
        const x = cellX + 76 * (k + 1);
        under.push(s('line', { class: 'edge arrow', x1: px + (k === 0 ? 4 : CELL / 2), y1: y, x2: x - CELL / 2 - 4, y2: y, 'marker-end': 'url(#arrowhead)' }));
        tokens.push(boxToken('t' + c.id, x, y, c, roleOf(st.marks, 1000 * (i + 1) + k)));
        px = x;
      });
      if (chain.length) statics.push(s('circle', { class: 'head-dot', cx: cellX, cy: y, r: 4 }));
    }
  }

  if (st.incoming) {
    const { tok, at } = st.incoming;
    let x = cellX + 92;
    if (st.mode === 'chain') x = cellX + 76 * (st.chains[at].length + 1);
    tokens.push(boxToken('t' + tok.id, x, rowY(at), tok, 'active', 'incoming'));
  }

  return { width, height, under, statics, tokens, edges: [] };
}
