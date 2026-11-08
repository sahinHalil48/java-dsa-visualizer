import { m } from '../../i18n';
import { InputError, Tracer } from '../../engine/tracer';
import { fmt, parseList } from '../../engine/code';
import type { HeapState, Mark, Ptr, Tok } from '../../types';

/** Shared Java for percolateDown (root at index 1, min-heap), exactly as in the PQ slides. */
export const PERCOLATE_DOWN = `
private void percolateDown(int hole) {                               //@psig
    int child;
    int tmp = array[hole];                                            //@tmp
    for (; hole * 2 <= currentSize; hole = child) {                   //@loop
        child = hole * 2;                                             //@child
        if (child != currentSize && array[child + 1] < array[child])  //@ifr
            child++;                                                  //@inc
        if (array[child] < tmp)                                       //@cmp
            array[hole] = array[child];                               //@move
        else
            break;                                                    //@brk
    }
    array[hole] = tmp;                                                //@place
}`;

export const percolateNotes = {
  psig: m('Move the element at `hole` down until heap order holds again.', '`hole`\'daki elemanı heap kuralı tekrar sağlanana kadar aşağı indir.'),
  tmp: m('Take the element out; its position becomes a hole that moves down.', 'Elemanı dışarı al; yeri aşağı inen bir boşluk (hole) olur.'),
  loop: m('Continue while the hole has a left child (2·hole ≤ currentSize).', 'Boşluğun sol çocuğu olduğu sürece devam et (2·hole ≤ currentSize).'),
  child: m('Left child is at 2·hole.', 'Sol çocuk 2·hole\'da.'),
  ifr: m('If there is a right child and it is smaller, take it. The SMALLER child must move up, otherwise it would end up under its bigger sibling. `child != currentSize` handles a node with only one child.', 'Sağ çocuk varsa ve daha küçükse onu seç. KÜÇÜK çocuk yukarı çıkmalı, yoksa büyük kardeşinin altında kalır. `child != currentSize` tek çocuklu düğümü kontrol eder.'),
  inc: m('Use the right child.', 'Sağ çocuğu kullan.'),
  cmp: m('Is the smaller child smaller than tmp? Then tmp cannot stay here.', 'Küçük çocuk tmp\'den küçük mü? O zaman tmp burada kalamaz.'),
  move: m('Move the child up (a move, not a swap). The hole moves down.', 'Çocuğu yukarı çıkar (swap değil, kaydırma). Boşluk aşağı iner.'),
  brk: m('tmp is not bigger than its children: stop.', 'tmp çocuklarından büyük değil: dur.'),
  place: m('Write tmp into the hole.', 'tmp\'yi boşluğa yaz.'),
};

export function parseHeap(s: string, max = 15, allowEmpty = false): number[] {
  if (allowEmpty && !s.trim()) return [];
  const v = parseList(s, { min: 1, max });
  for (let i = 2; i <= v.length; i++) {
    const p = Math.floor(i / 2);
    if (v[i - 1] < v[p - 1])
      throw new InputError(
        m(`This is not a min-heap: ${v[i - 1]} (index ${i}) is smaller than its parent ${v[p - 1]} (index ${p}). Use buildHeap first, or pick a slide example.`, `Bu bir min-heap değil: ${v[i - 1]} (index ${i}) ebeveyni ${v[p - 1]}'den (index ${p}) küçük. Önce buildHeap kullan ya da bir slayt örneği seç.`),
      );
  }
  return v;
}

export class HeapSim {
  /** cells[0] is the sentinel slot */
  cells: (Tok | null)[];
  size: number;
  nextId: number;
  constructor(
    public t: Tracer,
    values: number[],
    capacity: number,
  ) {
    this.cells = [null, ...values.map((v, i) => ({ id: i + 1, v }))];
    while (this.cells.length < capacity + 1) this.cells.push(null);
    this.size = values.length;
    this.nextId = values.length + 1;
  }
  S(extra: Partial<HeapState> = {}): HeapState {
    return { kind: 'heap', base: 1, cells: this.cells.slice(), hi: this.size, marks: [], ptrs: [], ...extra };
  }
  show() {
    return fmt(this.cells.slice(1, this.size + 1).map((c) => c?.v ?? null));
  }

  /** percolateDown exactly as in the slides; snaps on the shared labels */
  percolateDown(start: number, outer: Ptr[] = []) {
    const t = this.t;
    let hole = start;
    t.stack.push(`percolateDown(${start})`);
    const tmp = this.cells[hole]!;
    this.cells[hole] = null;
    t.set({ hole, tmp: tmp.v, child: undefined });
    t.count('moves');
    const F = () => ({ label: 'tmp', tok: tmp, at: hole });
    const P = (extra: Ptr[] = []): Ptr[] => [...outer, { name: 'hole', idx: hole }, ...extra];
    t.snap('tmp', m(`tmp = ${tmp.v}. Index ${hole} is now a hole.`, `tmp = ${tmp.v}. ${hole}. index artık boşluk.`), this.S({ float: F(), ptrs: P() }));
    for (;;) {
      t.set({ hole });
      if (hole * 2 > this.size) {
        t.snap('loop', m(`2·${hole} = ${hole * 2} > currentSize = ${this.size}: the hole is a leaf. Stop.`, `2·${hole} = ${hole * 2} > currentSize = ${this.size}: boşluk yaprak. Dur.`), this.S({ float: F(), ptrs: P() }));
        break;
      }
      t.snap('loop', m(`2·${hole} = ${hole * 2} ≤ ${this.size}: the hole has a child.`, `2·${hole} = ${hole * 2} ≤ ${this.size}: boşluğun çocuğu var.`), this.S({ float: F(), ptrs: P() }));
      let child = hole * 2;
      t.set({ child });
      t.snap('child', m(`child = ${child} (value ${this.cells[child]!.v}).`, `child = ${child} (değer ${this.cells[child]!.v}).`), this.S({ float: F(), ptrs: P([{ name: 'child', idx: child }]), marks: [{ idx: child, role: 'cmp' }] }));
      const hasRight = child !== this.size;
      if (hasRight) t.count('cmp');
      const right = hasRight && this.cells[child + 1]!.v < this.cells[child]!.v;
      const mk: Mark[] = hasRight ? [{ idx: child, role: 'cmp' }, { idx: child + 1, role: 'cmp' }] : [{ idx: child, role: 'cmp' }];
      t.snap(
        'ifr',
        !hasRight
          ? m(`child = currentSize: only one child.`, `child = currentSize: tek çocuk var.`)
          : right
            ? m(`Right child ${this.cells[child + 1]!.v} < left child ${this.cells[child]!.v}: take the right one.`, `Sağ çocuk ${this.cells[child + 1]!.v} < sol çocuk ${this.cells[child]!.v}: sağı al.`)
            : m(`Left child ${this.cells[child]!.v} ≤ right child ${this.cells[child + 1]!.v}: keep the left one.`, `Sol çocuk ${this.cells[child]!.v} ≤ sağ çocuk ${this.cells[child + 1]!.v}: solda kal.`),
        this.S({ float: F(), ptrs: P([{ name: 'child', idx: child }]), marks: mk }),
      );
      if (right) {
        child++;
        t.set({ child });
        t.snap('inc', m(`child = ${child}.`, `child = ${child}.`), this.S({ float: F(), ptrs: P([{ name: 'child', idx: child }]), marks: [{ idx: child, role: 'cmp' }] }));
      }
      t.count('cmp');
      const up = this.cells[child]!.v < tmp.v;
      t.snap(
        'cmp',
        up ? m(`${this.cells[child]!.v} < tmp = ${tmp.v}: the child moves up.`, `${this.cells[child]!.v} < tmp = ${tmp.v}: çocuk yukarı çıkar.`) : m(`${this.cells[child]!.v} ≥ tmp = ${tmp.v}: tmp fits in the hole.`, `${this.cells[child]!.v} ≥ tmp = ${tmp.v}: tmp boşluğa sığar.`),
        this.S({ float: F(), ptrs: P([{ name: 'child', idx: child }]), marks: [{ idx: child, role: 'cmp' }] }),
      );
      if (!up) {
        t.snap('brk', m('Stop: tmp fits in the hole.', 'Dur: tmp boşluğa sığıyor.'), this.S({ float: F(), ptrs: P() }));
        break;
      }
      this.cells[hole] = this.cells[child];
      this.cells[child] = null;
      t.count('moves');
      const old = hole;
      hole = child;
      t.snap('move', m(`array[${old}] = array[${child}] = ${this.cells[old]!.v}. The hole moves down to ${child}.`, `array[${old}] = array[${child}] = ${this.cells[old]!.v}. Boşluk ${child}'e iner.`), this.S({ float: F(), ptrs: P(), marks: [{ idx: old, role: 'move' }] }));
    }
    this.cells[hole] = tmp;
    t.count('moves');
    t.snap('place', m(`array[${hole}] = tmp = ${tmp.v}.`, `array[${hole}] = tmp = ${tmp.v}.`), this.S({ ptrs: outer, marks: [{ idx: hole, role: 'write' }] }));
    t.set({ hole: undefined, child: undefined, tmp: undefined });
    t.stack.pop();
  }
}

export const heapPresetsPQ = '13 21 16 24 31 19 68 65 26 32';
