import { s, type Frame, type TokenSpec } from '../engine/scene';
import type { ArrayState } from '../types';
import { CELL, STEP, boxToken, floatLabel, label, ptrToken, roleOf, slot, stackPtrs } from './common';

// Array diagram: [float row] / main row / pointer row / [aux row] / [aux pointer row]
export function arrayFrame(st: ArrayState): Frame {
  const n = Math.max(st.cells.length, st.aux?.cells.length ?? 0);
  const left = 64;
  const hasFloat = st.float !== undefined;
  const mainY = hasFloat ? 130 : 56;
  const auxY = mainY + 150;
  const width = left + n * STEP + 20;
  const height = (st.aux ? auxY : mainY) + 110;
  const cx = (i: number) => left + i * STEP + CELL / 2;

  const under: SVGElement[] = [];
  const statics: SVGElement[] = [];
  const tokens: TokenSpec[] = [];

  const drawRow = (cells: ArrayState['cells'], y: number, row: 'main' | 'aux', name?: string) => {
    for (const r of st.ranges.filter((r) => (r.row ?? 'main') === row)) {
      const x1 = cx(r.from) - CELL / 2 - 4;
      const x2 = cx(r.to) + CELL / 2 + 4;
      under.push(s('rect', { class: 'range range-' + r.role, x: x1, y: y - CELL / 2 - 6, width: x2 - x1, height: CELL + 12, rx: 10 }));
    }
    if (name) statics.push(label(left - 14, y + 4, name, 'lbl lbl-row', 'end'));
    cells.forEach((c, i) => {
      const role = roleOf(st.marks, i, row);
      statics.push(slot(cx(i), y, role ? 'slot-' + role : ''));
      statics.push(label(cx(i), y - CELL / 2 - 14, String(i), 'idx'));
      if (c) tokens.push(boxToken('t' + c.id, cx(i), y, c, role));
    });
  };

  drawRow(st.cells, mainY, 'main', st.aux ? 'a' : undefined);
  if (st.aux) drawRow(st.aux.cells, auxY, 'aux', st.aux.label);

  if (st.float) {
    const fx = cx(Math.max(0, Math.min(n - 1, st.float.at)));
    const fy = mainY - 92;
    statics.push(floatLabel(fx, fy, st.float.label));
    statics.push(slot(fx, fy, 'slot-float'));
    if (st.float.tok) tokens.push(boxToken('t' + st.float.tok.id, fx, fy, st.float.tok, 'active'));
  }

  for (const p of stackPtrs(st.ptrs)) {
    const y = (p.row === 'aux' ? auxY : mainY) + CELL / 2 + 8 + p.level * 34;
    const i = Math.max(-1, Math.min(n, p.idx));
    tokens.push(ptrToken('p' + (p.row ?? '') + p.name, cx(i), y, p.name));
  }

  return { width, height, under, statics, tokens, edges: [] };
}
