import { describe, expect, it } from 'vitest';
import { ALGORITHMS } from '../src/algorithms';
import { isCorrect as isCorrectBlank } from '../src/engine/blanks';
import type { ArrayState, BucketState, HashState, HeapState, Step, TreeState } from '../src/types';

const last = (steps: Step[]) => steps[steps.length - 1].state;
const byId = (id: string) => ALGORITHMS.find((a) => a.id === id)!;
const rand = (n: number, lo = 0, hi = 99) => Array.from({ length: n }, () => lo + Math.floor(Math.random() * (hi - lo + 1)));
const sorted = (a: number[]) => [...a].sort((x, y) => x - y);

describe('every algorithm', () => {
  for (const alg of ALGORITHMS) {
    describe(alg.id, () => {
      it('runs its defaults and every preset', () => {
        for (const values of [alg.defaults, ...(alg.presets ?? []).map((p) => ({ ...alg.defaults, ...p.values }))]) {
          const steps = alg.run(values);
          expect(steps.length).toBeGreaterThan(1);
          for (const s of steps) {
            expect(s.line).toBeGreaterThan(0);
            expect(s.line).toBeLessThanOrEqual(alg.code.lines.length);
            expect(s.msg.en.length).toBeGreaterThan(0);
            expect(s.msg.tr.length).toBeGreaterThan(0);
          }
        }
      });
      it('has notes and blanks that point at real lines', () => {
        for (const label of Object.keys(alg.notes)) expect(alg.code.labels[label], `note label ${label}`).toBeDefined();
        expect(alg.blanks.length).toBeGreaterThan(0);
        for (const b of alg.blanks) {
          const ln = alg.code.labels[b.label];
          expect(ln, `blank label ${b.label}`).toBeDefined();
          expect(alg.code.lines[ln - 1]).toContain(b.text);
          expect(isCorrectBlank(b, b.text)).toBe(true);
          expect(isCorrectBlank(b, b.text.replace(/\s+/g, ''))).toBe(true);
        }
      });
      it('runs random input when it offers it', () => {
        if (!alg.random) return;
        for (let k = 0; k < 10; k++) expect(alg.run({ ...alg.defaults, ...alg.random() }).length).toBeGreaterThan(1);
      });
    });
  }
});

describe('sorting produces sorted output', () => {
  const ids = ['insertion-sort', 'selection-sort', 'bubble-sort', 'heap-sort', 'merge-sort', 'quick-sort'];
  const cases = [[34, 8, 64, 51, 32, 21], [5, 1, 4, 2, 8], [1, 2, 3, 4, 5], [5, 4, 3, 2, 1], [3, 3, 1, 3, 2], [7], [5, 5, 5, 5], ...Array.from({ length: 30 }, () => rand(1 + Math.floor(Math.random() * 12)))];
  for (const id of ids)
    it(id, () => {
      for (const c of cases) {
        const st = last(byId(id).run({ arr: c.join(' ') }));
        const vals = st.kind === 'array' ? (st as ArrayState).cells.map((x) => x!.v) : (st as HeapState).cells.map((x) => x!.v);
        expect(vals).toEqual(sorted(c));
      }
    });
  it('counting sort', () => {
    for (let k = 0; k < 20; k++) {
      const c = rand(8, 0, 9);
      const st = last(byId('counting-sort').run({ arr: c.join(' '), M: '10' })) as ArrayState;
      expect(st.cells.map((x) => x!.v)).toEqual(sorted(c));
    }
  });
  it('radix sort', () => {
    for (let k = 0; k < 20; k++) {
      const c = rand(9, 0, 999);
      const st = last(byId('radix-sort').run({ arr: c.join(' ') })) as BucketState;
      expect(st.cells.map((x) => x!.v)).toEqual(sorted(c));
    }
  });
  it('insertion sort moves = inversions', () => {
    const c = [34, 8, 64, 51, 32, 21];
    const steps = byId('insertion-sort').run({ arr: c.join(' ') });
    const shifts = steps.filter((s) => s.line === byId('insertion-sort').code.labels.shift).length;
    expect(shifts).toBe(9);
  });
});

const isMinHeap = (st: HeapState) => {
  for (let i = 2; i <= st.hi; i++) if (st.cells[i]!.v < st.cells[Math.floor(i / 2)]!.v) return false;
  return true;
};

describe('heap operations keep heap order', () => {
  it('insert', () => {
    const st = last(byId('heap-insert').run({ heap: '13 21 16 24 31 19 68 65 26 32', x: '14' })) as HeapState;
    expect(st.cells.slice(1, st.hi + 1).map((c) => c!.v)).toEqual([13, 14, 16, 24, 21, 19, 68, 65, 26, 32, 31]);
    for (let k = 0; k < 20; k++) {
      const s2 = last(byId('heap-insert').run({ heap: '', x: rand(6).join(' ') })) as HeapState;
      expect(isMinHeap(s2)).toBe(true);
    }
  });
  it('deleteMin (slides 18-20)', () => {
    const st = last(byId('heap-deletemin').run({ heap: '13 14 16 19 21 19 68 65 26 32 31', times: '1' })) as HeapState;
    expect(st.cells.slice(1, st.hi + 1).map((c) => c!.v)).toEqual([14, 19, 16, 26, 21, 19, 68, 65, 31, 32]);
  });
  it('buildHeap (slides 26-29)', () => {
    const st = last(byId('build-heap').run({ arr: '150 80 40 30 10 70 110 100 20 90 60 50 120 140 130' })) as HeapState;
    expect(st.cells.slice(1, st.hi + 1).map((c) => c!.v)).toEqual([10, 20, 40, 30, 60, 50, 110, 100, 150, 90, 80, 70, 120, 140, 130]);
    for (let k = 0; k < 20; k++) expect(isMinHeap(last(byId('build-heap').run({ arr: rand(11).join(' ') })) as HeapState)).toBe(true);
  });
});

const inorder = (st: TreeState) => {
  const out: number[] = [];
  const go = (id: number | null) => {
    if (id == null) return;
    go(st.nodes[id].left);
    out.push(st.nodes[id].key);
    go(st.nodes[id].right);
  };
  go(st.root);
  return out;
};
const avlOk = (st: TreeState) => {
  const h = (id: number | null): number => {
    if (id == null) return -1;
    const n = st.nodes[id];
    const l = h(n.left),
      r = h(n.right);
    if (Math.abs(l - r) > 1) throw new Error('unbalanced at ' + n.key);
    if (n.h !== Math.max(l, r) + 1) throw new Error('wrong height at ' + n.key);
    return Math.max(l, r) + 1;
  };
  h(st.root);
  return true;
};

describe('trees', () => {
  it('BST insert/remove keep BST order', () => {
    for (let k = 0; k < 20; k++) {
      const keys = [...new Set(rand(10))];
      const st = last(byId('bst-insert').run({ init: keys.slice(0, 5).join(' '), x: keys.slice(5).join(' ') })) as TreeState;
      expect(inorder(st)).toEqual(sorted(keys));
      const del = keys.slice(0, 3);
      const st2 = last(byId('bst-remove').run({ init: keys.join(' '), x: del.join(' ') })) as TreeState;
      expect(inorder(st2)).toEqual(sorted(keys.filter((x) => !del.includes(x))));
    }
  });
  it('AVL insert stays balanced', () => {
    for (let k = 0; k < 30; k++) {
      const keys = [...new Set(rand(12))];
      const st = last(byId('avl-insert').run({ init: keys.slice(0, 7).join(' '), x: keys.slice(7).join(' ') })) as TreeState;
      expect(inorder(st)).toEqual(sorted(keys));
      expect(avlOk(st)).toBe(true);
    }
    const s = last(byId('avl-insert').run({ init: '', x: '3 2 1' })) as TreeState;
    expect(s.nodes[s.root!].key).toBe(2);
  });
  it('traversal orders', () => {
    const out = (order: string) => (last(byId('tree-traversals').run({ init: '6 2 8 1 4 3 9', order })) as TreeState).output!.values;
    expect(out('in')).toEqual([1, 2, 3, 4, 6, 8, 9]);
    expect(out('pre')).toEqual([6, 2, 1, 4, 3, 8, 9]);
    expect(out('post')).toEqual([1, 3, 4, 2, 9, 8, 6]);
  });
});

describe('hashing', () => {
  it('linear probing slide example', () => {
    const st = last(byId('hash-linear').run({ M: '10', keys: '89 18 49 58 69' })) as HashState;
    expect(st.slots.map((s) => s?.v ?? null)).toEqual([49, 58, 69, null, null, null, null, null, 18, 89]);
  });
  it('quadratic probing slide example', () => {
    const st = last(byId('hash-quadratic').run({ M: '10', keys: '89 18 49 58 69' })) as HashState;
    expect(st.slots.map((s) => s?.v ?? null)).toEqual([49, null, 58, 69, null, null, null, null, 18, 89]);
  });
  it('double hashing slide example', () => {
    const st = last(byId('hash-double').run({ M: '10', keys: '89 18 49 58 69', R: '7' })) as HashState;
    expect(st.slots.map((s) => s?.v ?? null)).toEqual([69, null, null, 58, null, null, 49, null, 18, 89]);
  });
  it('chaining keeps every key', () => {
    const st = last(byId('hash-chaining').run({ M: '10', keys: '0 81 64 49 9 36 25 16 4 1' })) as HashState;
    expect(st.chains.flat().length).toBe(10);
    expect(st.chains[9].map((t) => t.v)).toEqual([49, 9]);
  });
});
