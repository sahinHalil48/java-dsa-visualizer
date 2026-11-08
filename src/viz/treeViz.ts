import { s, type EdgeSpec, type Frame, type TokenSpec } from '../engine/scene';
import type { Role, TreeState } from '../types';
import { label, nodeToken } from './common';

// Binary search tree / AVL diagram.
// x position = rank of the key (in-order position), so a node keeps its column
// even while pointers are being changed in the middle of a rotation.
// Nodes that are temporarily cut off from the root (e.g. k1 during a rotation)
// keep their last depth and are drawn with dashed edges.

const lastDepth = new Map<number, number>();

export function treeFrame(st: TreeState): Frame {
  const ids = Object.keys(st.nodes).map(Number);
  const sorted = [...ids].sort((a, b) => st.nodes[a].key - st.nodes[b].key);
  const rank = new Map(sorted.map((id, i) => [id, i]));
  const XS = 54,
    YS = 74,
    left = 50,
    top = 56;

  // depth from the root
  const depth = new Map<number, number>();
  const reachable = new Set<number>();
  const bfs = (start: number, d0: number, mark: boolean) => {
    const q: [number, number][] = [[start, d0]];
    while (q.length) {
      const [id, d] = q.shift()!;
      if (depth.has(id) || !st.nodes[id]) continue;
      depth.set(id, d);
      if (mark) reachable.add(id);
      const n = st.nodes[id];
      if (n.left != null) q.push([n.left, d + 1]);
      if (n.right != null) q.push([n.right, d + 1]);
    }
  };
  if (st.root != null) bfs(st.root, 0, true);
  const rest = ids.filter((id) => !depth.has(id)).sort((a, b) => (lastDepth.get(a) ?? 0) - (lastDepth.get(b) ?? 0));
  for (const id of rest) if (!depth.has(id)) bfs(id, lastDepth.get(id) ?? 0, false);
  for (const [id, d] of depth) lastDepth.set(id, d);

  const maxD = Math.max(0, ...depth.values());
  const pos = (id: number) => ({ x: left + (rank.get(id) ?? 0) * XS + XS / 2, y: top + (depth.get(id) ?? 0) * YS });

  // roles (a 'sub' mark colors the whole subtree)
  const roles = new Map<number, Role>();
  const paint = (id: number | null) => {
    if (id == null || !st.nodes[id] || roles.get(id) === 'sub') return;
    roles.set(id, 'sub');
    paint(st.nodes[id].left);
    paint(st.nodes[id].right);
  };
  for (const mk of st.marks) {
    if (mk.role === 'sub') paint(mk.id);
  }
  for (const mk of st.marks) if (mk.role !== 'sub') roles.set(mk.id, mk.role);

  const statics: SVGElement[] = [];
  const under: SVGElement[] = [];
  const tokens: TokenSpec[] = [];
  const edges: EdgeSpec[] = [];
  const hgt = (id: number | null) => (id == null || !st.nodes[id] ? -1 : st.nodes[id].h ?? 0);

  for (const id of ids) {
    const n = st.nodes[id];
    const p = pos(id);
    tokens.push(nodeToken('n' + id, p.x, p.y, String(n.key), roles.get(id), reachable.has(id) || st.root == null ? '' : 'detached'));
    if (st.avl) {
      const bf = hgt(n.left) - hgt(n.right);
      tokens.push({
        key: 'h' + id,
        x: p.x,
        y: p.y,
        cls: 'avlinfo' + (Math.abs(bf) > 1 ? ' unbalanced' : ''),
        build: () => [
          s('text', { class: 'avl-h', x: 24, y: 16 }, ['h' + (n.h ?? 0)]),
          s('text', { class: 'avl-bf', x: 0, y: -27, 'text-anchor': 'middle' }, [(bf > 0 ? '+' : '') + bf]),
        ],
      });
    }
    for (const side of ['left', 'right'] as const) {
      const c = n[side];
      if (c != null && st.nodes[c]) edges.push({ key: `${id}${side}`, from: 'n' + id, to: 'n' + c, inset: 20, cls: reachable.has(id) || st.root == null ? '' : 'edge-detached' });
    }
  }

  for (const lb of st.labels ?? []) {
    if (!st.nodes[lb.id]) continue;
    const p = pos(lb.id);
    tokens.push({ key: 'lb' + lb.text, x: p.x - 26, y: p.y - 22, cls: 'tag tag-k', build: () => [s('text', { 'text-anchor': 'end' }, [lb.text])] });
  }

  if (st.ghost) {
    let gx = left + 10,
      gy = top - 20;
    if (st.ghost.near != null && st.nodes[st.ghost.near]) {
      const p = pos(st.ghost.near);
      const dx = st.ghost.side === 'left' ? -34 : 34;
      gx = p.x + dx;
      gy = p.y + (st.ghost.side ? 46 : -36);
    } else if (st.root == null) {
      gx = left + 30;
      gy = top;
    }
    tokens.push(nodeToken('ghost', gx, gy, String(st.ghost.key), 'active', 'ghost', 17));
  }

  const width = Math.max(left * 2 + ids.length * XS, 320, st.output ? left + 140 + st.output.values.length * 40 : 0);
  let height = top + maxD * YS + 60;
  if (st.root == null && ids.length === 0) statics.push(label(width / 2, top + 4, 'root = null', 'lbl lbl-empty'));

  if (st.output) {
    const oy = height + 20;
    statics.push(label(left - 10, oy + 5, st.output.label, 'lbl lbl-row', 'start'));
    st.output.values.forEach((v, i) => {
      const x = left + 110 + i * 40;
      statics.push(s('rect', { class: 'out-cell', x: x - 17, y: oy - 16, width: 34, height: 32, rx: 6 }), label(x, oy + 5, String(v), 'val-small'));
    });
    height += 60;
  }

  return { width, height, under, statics, tokens, edges };
}
