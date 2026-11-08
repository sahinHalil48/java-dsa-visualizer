import { m } from '../../i18n';
import { java, parseList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm, HeapState, Mark, Ptr, Tok } from '../../types';
import { randomArr, show, toks, arrInput } from './common';

const code = java(`
public static void heapSort(int[] a) {                 //@sig
    for (int i = a.length / 2 - 1; i >= 0; i--)         //@build
        percDown(a, i, a.length);                       //@buildcall
    for (int j = a.length - 1; j > 0; j--) {            //@sortloop
        swap(a, 0, j);                                  //@swapmax
        percDown(a, 0, j);                              //@sortcall
    }
}                                                       //@end

private static int leftChild(int i) {
    return 2 * i + 1;                                   //@left
}

private static void percDown(int[] a, int i, int n) {   //@psig
    int child;
    int tmp = a[i];                                     //@ptmp
    for (; leftChild(i) < n; i = child) {               //@pfor
        child = leftChild(i);                           //@pchild
        if (child != n - 1 && a[child] < a[child + 1])  //@pifr
            child++;                                    //@pinc
        if (tmp < a[child])                             //@pcmp
            a[i] = a[child];                            //@pmove
        else
            break;                                      //@pbreak
    }
    a[i] = tmp;                                         //@pplace
}
`);

export const heapSort: Algorithm = {
  id: 'heap-sort',
  category: 'sorting',
  name: m('Heapsort', 'Heapsort'),
  summary: m('Build a max-heap, then repeatedly swap the maximum to the end and fix the heap. O(N log N) even in the worst case, no extra array.', 'Bir max-heap kur, sonra maksimumu sona swap edip heap\'i düzeltmeyi tekrarla. En kötü durumda bile O(N log N), ekstra dizi yok.'),
  code,
  notes: {
    sig: m('The root is at index 0 here (not 1 like in the PQ slides), because every cell holds data.', 'Burada kök index 0\'da (PQ slaytlarındaki gibi 1\'de değil), çünkü bütün hücreler dolu.'),
    build: m('buildHeap: start at the last parent N/2−1 and go backwards to the root. Leaves are already heaps. Total O(N).', 'buildHeap: son ebeveyn N/2−1\'den başla, köke kadar geriye git. Yapraklar zaten heap. Toplam O(N).'),
    buildcall: m('Fix the subtree rooted at i. Its two subtrees are already heaps because we go bottom-up.', 'i köklü alt ağacı düzelt. Aşağıdan yukarı gittiğimiz için iki alt ağacı zaten heap.'),
    sortloop: m('j is the last index of the heap. Each round the heap shrinks by one and the sorted part grows by one.', 'j heap\'in son index\'i. Her turda heap bir küçülür, sıralı kısım bir büyür.'),
    swapmax: m('deleteMax: the maximum (root) goes to a[j], the cell the heap no longer needs. That is why no extra array is needed.', 'deleteMax: maksimum (kök) a[j]\'ye gider, heap\'in artık ihtiyacı olmayan hücre. Bu yüzden ekstra dizi gerekmez.'),
    sortcall: m('A small element came to the root, so percolate it down. The heap size is now j, so the sorted part is not touched.', 'Köke küçük bir eleman geldi, onu aşağı indir. Heap boyutu artık j, sıralı kısma dokunulmaz.'),
    left: m('With the root at 0: left child = 2i+1, right child = 2i+2, parent = (i−1)/2.', 'Kök 0\'dayken: sol çocuk = 2i+1, sağ çocuk = 2i+2, ebeveyn = (i−1)/2.'),
    psig: m('Percolate down in a heap of size n starting at index i.', 'n boyutlu heap\'te i\'den başlayarak aşağı süzdür.'),
    ptmp: m('Take the element out; its place becomes a hole that moves down.', 'Elemanı dışarı al; yeri aşağı inen bir boşluk (hole) olur.'),
    pfor: m('Continue while the hole has at least one child inside the heap.', 'Boşluğun heap içinde en az bir çocuğu olduğu sürece devam et.'),
    pchild: m('Start with the left child.', 'Önce sol çocuk.'),
    pifr: m('If a right child exists (child != n−1) and it is bigger, use it. Max-heap: the BIGGER child moves up.', 'Sağ çocuk varsa (child != n−1) ve daha büyükse onu seç. Max-heap: BÜYÜK çocuk yukarı çıkar.'),
    pinc: m('Switch to the right child.', 'Sağ çocuğa geç.'),
    pcmp: m('Is the bigger child larger than tmp? Then tmp cannot sit here.', 'Büyük çocuk tmp\'den büyük mü? O zaman tmp burada duramaz.'),
    pmove: m('Move the child up into the hole; the hole moves down.', 'Çocuğu boşluğa çıkar; boşluk aşağı iner.'),
    pbreak: m('tmp is at least as big as its children: the hole is the right place.', 'tmp çocuklarından büyük ya da eşit: boşluk doğru yer.'),
    pplace: m('Put tmp into the hole.', 'tmp\'yi boşluğa koy.'),
    end: m('Done: ascending order, because we used a max-heap.', 'Bitti: artan sıra, çünkü max-heap kullandık.'),
  },
  inputs: [arrInput],
  defaults: { arr: '31 41 59 26 53 58 97' },
  presets: [
    { name: m('Slide 19 numbers', 'Slayt 19 sayıları'), values: { arr: '31 41 59 26 53 58 97' } },
    { name: m('Exercise from the notes', 'Notlardaki alıştırma'), values: { arr: '4 10 3 5 1' } },
  ],
  random: randomArr(8),
  run(input) {
    const t = new Tracer(code);
    const a: (Tok | null)[] = toks(parseList(input.arr, { min: 1, max: 15 }));
    const n = a.length;
    const S = (hi: number, extra: Partial<HeapState> = {}): HeapState => ({ kind: 'heap', base: 0, cells: a.slice(), hi, marks: [], ptrs: [], sortedTail: true, maxHeap: true, ...extra });
    t.stack = ['heapSort(a)'];
    t.snap('sig', m(`Start with ${show(a)}. Read it as a complete tree with the root at index 0.`, `${show(a)} ile başla. Bunu kökü index 0'da olan complete bir ağaç gibi oku.`), S(n - 1, { sortedTail: false }));

    const percDown = (i0: number, size: number, outer: Ptr[]) => {
      let i = i0;
      t.stack.push(`percDown(a, ${i0}, ${size})`);
      t.set({ i, n: size, child: undefined, tmp: undefined });
      const tmp = a[i]!;
      a[i] = null;
      t.count('moves');
      t.set({ tmp: tmp.v });
      const P = (extra: Ptr[] = []) => [...outer, ...extra];
      t.snap('ptmp', m(`tmp = ${tmp.v}. Index ${i} is now a hole.`, `tmp = ${tmp.v}. ${i}. index artık bir boşluk.`), S(size - 1, { float: { label: 'tmp', tok: tmp, at: i }, ptrs: P() }));
      for (;;) {
        t.set({ i });
        if (2 * i + 1 >= size) {
          t.snap('pfor', m(`leftChild(${i}) = ${2 * i + 1} ≥ n = ${size}: the hole is a leaf. Stop.`, `leftChild(${i}) = ${2 * i + 1} ≥ n = ${size}: boşluk bir yaprak. Dur.`), S(size - 1, { float: { label: 'tmp', tok: tmp, at: i }, ptrs: P() }));
          break;
        }
        t.snap('pfor', m(`leftChild(${i}) = ${2 * i + 1} < ${size}: the hole has a child.`, `leftChild(${i}) = ${2 * i + 1} < ${size}: boşluğun çocuğu var.`), S(size - 1, { float: { label: 'tmp', tok: tmp, at: i }, ptrs: P() }));
        let child = 2 * i + 1;
        t.set({ child });
        t.snap('pchild', m(`child = ${child}.`, `child = ${child}.`), S(size - 1, { float: { label: 'tmp', tok: tmp, at: i }, ptrs: P([{ name: 'child', idx: child }]), marks: [{ idx: child, role: 'cmp' }] }));
        const hasRight = child !== size - 1;
        if (hasRight) t.count('cmp');
        const takeRight = hasRight && a[child]!.v < a[child + 1]!.v;
        const marks: Mark[] = hasRight ? [{ idx: child, role: 'cmp' }, { idx: child + 1, role: 'cmp' }] : [{ idx: child, role: 'cmp' }];
        t.snap(
          'pifr',
          !hasRight
            ? m(`child = n−1: there is no right child.`, `child = n−1: sağ çocuk yok.`)
            : takeRight
              ? m(`Right child ${a[child + 1]!.v} > left child ${a[child]!.v}: use the right one.`, `Sağ çocuk ${a[child + 1]!.v} > sol çocuk ${a[child]!.v}: sağı seç.`)
              : m(`Left child ${a[child]!.v} ≥ right child ${a[child + 1]!.v}: keep the left one.`, `Sol çocuk ${a[child]!.v} ≥ sağ çocuk ${a[child + 1]!.v}: solda kal.`),
          S(size - 1, { float: { label: 'tmp', tok: tmp, at: i }, ptrs: P([{ name: 'child', idx: child }]), marks }),
        );
        if (takeRight) {
          child++;
          t.set({ child });
          t.snap('pinc', m(`child = ${child}.`, `child = ${child}.`), S(size - 1, { float: { label: 'tmp', tok: tmp, at: i }, ptrs: P([{ name: 'child', idx: child }]), marks: [{ idx: child, role: 'cmp' }] }));
        }
        t.count('cmp');
        const up = tmp.v < a[child]!.v;
        t.snap(
          'pcmp',
          up ? m(`tmp = ${tmp.v} < ${a[child]!.v}: the child must move up.`, `tmp = ${tmp.v} < ${a[child]!.v}: çocuk yukarı çıkmalı.`) : m(`tmp = ${tmp.v} ≥ ${a[child]!.v}: tmp fits here.`, `tmp = ${tmp.v} ≥ ${a[child]!.v}: tmp buraya sığar.`),
          S(size - 1, { float: { label: 'tmp', tok: tmp, at: i }, ptrs: P([{ name: 'child', idx: child }]), marks: [{ idx: child, role: 'cmp' }] }),
        );
        if (!up) {
          t.snap('pbreak', m('break.', 'break.'), S(size - 1, { float: { label: 'tmp', tok: tmp, at: i }, ptrs: P() }));
          break;
        }
        a[i] = a[child];
        a[child] = null;
        t.count('moves');
        t.snap('pmove', m(`a[${i}] = a[${child}]: ${a[i]!.v} moves up. The hole moves to ${child}.`, `a[${i}] = a[${child}]: ${a[i]!.v} yukarı çıkar. Boşluk ${child}'e iner.`), S(size - 1, { float: { label: 'tmp', tok: tmp, at: child }, ptrs: P([{ name: 'child', idx: child }]), marks: [{ idx: i, role: 'move' }] }));
        i = child;
      }
      a[i] = tmp;
      t.count('moves');
      t.snap('pplace', m(`a[${i}] = tmp = ${tmp.v}.`, `a[${i}] = tmp = ${tmp.v}.`), S(size - 1, { ptrs: P(), marks: [{ idx: i, role: 'write' }] }));
      t.stack.pop();
      t.set({ child: undefined, tmp: undefined, n: undefined });
    };

    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      t.set({ i, j: undefined });
      t.snap('build', m(`buildHeap: i = ${i}. Fix the subtree rooted at ${a[i]!.v}.`, `buildHeap: i = ${i}. ${a[i]!.v} köklü alt ağacı düzelt.`), S(n - 1, { sortedTail: false, ptrs: [{ name: 'i', idx: i }], marks: [{ idx: i, role: 'active' }] }));
      t.snap('buildcall', m(`percDown(a, ${i}, ${n})`, `percDown(a, ${i}, ${n})`), S(n - 1, { sortedTail: false, ptrs: [{ name: 'i', idx: i }] }));
      percDown(i, n, []);
    }
    for (let j = n - 1; j > 0; j--) {
      t.set({ j, i: undefined });
      t.snap('sortloop', m(`j = ${j}. The max-heap is a[0..${j}]. Its maximum is ${a[0]!.v}.`, `j = ${j}. Max-heap a[0..${j}]. Maksimumu ${a[0]!.v}.`), S(j, { ptrs: [{ name: 'j', idx: j }], marks: [{ idx: 0, role: 'active' }] }));
      [a[0], a[j]] = [a[j], a[0]];
      t.count('swaps');
      t.snap('swapmax', m(`swap(a, 0, ${j}): ${a[j]!.v} is now in its final place. ${a[0]!.v} sits at the root and is too small.`, `swap(a, 0, ${j}): ${a[j]!.v} artık son yerinde. ${a[0]!.v} kökte ve çok küçük.`), S(j - 1, { ptrs: [{ name: 'j', idx: j }], marks: [{ idx: j, role: 'write' }, { idx: 0, role: 'bad' }] }));
      t.snap('sortcall', m(`percDown(a, 0, ${j}): fix the heap a[0..${j - 1}].`, `percDown(a, 0, ${j}): a[0..${j - 1}] heap'ini düzelt.`), S(j - 1, { ptrs: [{ name: 'j', idx: j }] }));
      percDown(0, j, [{ name: 'j', idx: j }]);
    }
    t.set({ i: undefined, j: undefined });
    t.snap('end', m(`Sorted: ${show(a)}.`, `Sıralandı: ${show(a)}.`), S(-1));
    return t.steps;
  },
  concept: [
    m('Heapsort = buildHeap (O(N)) + N−1 deleteMax (O(log N) each).', 'Heapsort = buildHeap (O(N)) + N−1 deleteMax (her biri O(log N)).'),
    m('Each removed maximum goes into the cell the heap just freed, so no extra array is needed (in-place).', 'Çıkan her maksimum heap\'in yeni boşalttığı hücreye gider, ekstra dizi gerekmez (in-place).'),
    m('A max-heap gives ascending order. A min-heap would give descending order.', 'Max-heap artan sıra verir. Min-heap azalan sıra verirdi.'),
  ],
  complexity: [
    { op: m('Sort', 'Sıralama'), best: 'O(N log N)', avg: 'O(N log N)', worst: 'O(N log N)' },
    { op: 'buildHeap', worst: 'O(N)' },
    { op: m('Extra memory', 'Ekstra bellek'), worst: 'O(1)' },
  ],
  pitfalls: [
    m('Index formulas change when the root is at 0: left = 2i+1, right = 2i+2, parent = (i−1)/2. buildHeap starts at N/2 − 1.', 'Kök 0\'dayken formüller değişir: sol = 2i+1, sağ = 2i+2, ebeveyn = (i−1)/2. buildHeap N/2 − 1\'den başlar.'),
    m('In a max-heap the BIGGER child moves up during percolate down.', 'Max-heap\'te percolate down sırasında BÜYÜK çocuk yukarı çıkar.'),
    m('About 2× slower than quicksort in practice, but never O(N²): an "insurance policy".', 'Pratikte quicksort\'tan ~2 kat yavaş ama asla O(N²) değil: bir "sigorta poliçesi".'),
  ],
  blanks: [
    { label: 'build', text: 'a.length / 2 - 1', hint: m('The last node that has a child (root at index 0).', 'Çocuğu olan son düğüm (kök index 0\'da).') },
    { label: 'swapmax', text: 'swap(a, 0, j)', hint: m('Move the maximum to the end of the heap.', 'Maksimumu heap\'in sonuna taşı.') },
    { label: 'sortcall', text: 'percDown(a, 0, j)', hint: m('Fix the heap from the root; its size is now j.', 'Heap\'i kökten düzelt; boyutu artık j.') },
    { label: 'left', text: '2 * i + 1', accept: ['2*i+1', 'i*2+1'], hint: m('Left child when the root is at index 0.', 'Kök index 0\'dayken sol çocuk.') },
    { label: 'pifr', text: 'a[child] < a[child + 1]', accept: ['a[child+1] > a[child]', 'a[child + 1] > a[child]'], hint: m('Pick the bigger child.', 'Büyük çocuğu seç.') },
    { label: 'pcmp', text: 'tmp < a[child]', accept: ['a[child] > tmp'], hint: m('When must the child move up?', 'Çocuk ne zaman yukarı çıkmalı?') },
  ],
};
