import { m } from '../../i18n';
import { java, parseList, randomList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm } from '../../types';
import { HeapSim, PERCOLATE_DOWN, percolateNotes } from './common';

const code = java(
  `
private void buildHeap() {                           //@sig
    for (int i = currentSize / 2; i > 0; i--)        //@loopb
        percolateDown(i);                            //@call
}                                                    //@end
` + PERCOLATE_DOWN,
);

export const buildHeap: Algorithm = {
  id: 'build-heap',
  category: 'heap',
  name: m('Heap: buildHeap in O(N)', 'Heap: buildHeap, O(N)'),
  summary: m('Put the N items into the array as they are, then call percolateDown on every parent, from the last one back to the root.', 'N elemanı diziye olduğu gibi koy, sonra son ebeveynden köke kadar her ebeveyn için percolateDown çağır.'),
  code,
  notes: {
    sig: m('The array already holds all N items in arbitrary order.', 'Dizi bütün N elemanı rastgele sırada tutuyor.'),
    loopb: m('Indexes after N/2 are leaves (they have no children), and a single node is already a heap. Go backwards so both subtrees of i are heaps before we fix i.', 'N/2\'den sonraki index\'ler yaprak (çocukları yok) ve tek düğüm zaten heap. Geriye doğru git ki i\'yi düzeltmeden önce iki alt ağacı da heap olsun.'),
    call: m('percolateDown assumes both subtrees are already heaps. Going bottom-up guarantees that.', 'percolateDown iki alt ağacın zaten heap olduğunu varsayar. Aşağıdan yukarı gitmek bunu garanti eder.'),
    end: m('Total work ≤ sum of node heights = N − H − 1 < N, so buildHeap is O(N).', 'Toplam iş ≤ düğüm yüksekliklerinin toplamı = N − H − 1 < N, yani buildHeap O(N).'),
    ...percolateNotes,
  },
  inputs: [{ key: 'arr', label: m('Items in any order', 'Herhangi bir sırada elemanlar'), type: 'list' }],
  defaults: { arr: '150 80 40 30 10 70 110 100 20 90 60 50 120 140 130' },
  presets: [
    { name: m('Slides 26–29 example', 'Slayt 26–29 örneği'), values: { arr: '150 80 40 30 10 70 110 100 20 90 60 50 120 140 130' } },
    { name: m('Exercise from the notes', 'Notlardaki alıştırma'), values: { arr: '9 5 7 2 8 1' } },
  ],
  random: () => ({ arr: randomList(10, 1, 99).join(' ') }),
  run(input) {
    const values = parseList(input.arr, { min: 1, max: 15 });
    const t = new Tracer(code);
    const h = new HeapSim(t, values, values.length);
    t.stack = ['buildHeap()'];
    t.set({ currentSize: h.size });
    t.snap('sig', m(`Array ${h.show()}. It is a complete tree, but heap order is broken.`, `Dizi ${h.show()}. Complete bir ağaç ama heap kuralı bozuk.`), h.S());
    for (let i = Math.floor(h.size / 2); i > 0; i--) {
      t.set({ i });
      t.snap('loopb', m(`i = ${i}${i === Math.floor(h.size / 2) ? ` = ${h.size}/2, the last parent. Indexes ${i + 1}..${h.size} are leaves` : ''}. Fix the subtree rooted at ${h.cells[i]!.v}.`, `i = ${i}${i === Math.floor(h.size / 2) ? ` = ${h.size}/2, son ebeveyn. ${i + 1}..${h.size} index'leri yaprak` : ''}. ${h.cells[i]!.v} köklü alt ağacı düzelt.`), h.S({ ptrs: [{ name: 'i', idx: i }], marks: [{ idx: i, role: 'active' }] }));
      t.snap('call', m(`percolateDown(${i})`, `percolateDown(${i})`), h.S({ ptrs: [{ name: 'i', idx: i }] }));
      h.percolateDown(i, [{ name: 'i', idx: i }]);
    }
    t.set({ i: undefined });
    t.snap('end', m(`Done: ${h.show()} is a min-heap.`, `Bitti: ${h.show()} bir min-heap.`), h.S());
    return t.steps;
  },
  concept: [
    m('Start at N/2 (last parent) and go down to 1.', 'N/2\'den (son ebeveyn) başla ve 1\'e kadar in.'),
    m('A node does at most "its height" steps of percolate down. Most nodes are near the bottom with height 0 or 1, so the total is small.', 'Bir düğüm en fazla "yüksekliği" kadar aşağı iner. Düğümlerin çoğu altta, yükseklikleri 0 ya da 1, bu yüzden toplam küçük.'),
    m('Σ 2^i (H − i) = N − H − 1 (trick: compute 2S − S).', 'Σ 2^i (H − i) = N − H − 1 (hile: 2S − S hesapla).'),
  ],
  complexity: [
    { op: 'buildHeap', best: 'O(N)', avg: 'O(N)', worst: 'O(N)' },
    { op: m('N inserts instead', 'Bunun yerine N insert'), avg: 'O(N)', worst: 'O(N log N)' },
  ],
  pitfalls: [
    m('insert cost = depth (most nodes are deep → expensive). percolateDown cost = height (most nodes are low → cheap).', 'insert maliyeti = derinlik (çoğu düğüm derin → pahalı). percolateDown maliyeti = yükseklik (çoğu düğüm alçak → ucuz).'),
    m('Going top-down would be wrong: the subtrees would not be heaps yet.', 'Yukarıdan aşağı gitmek yanlış olurdu: alt ağaçlar henüz heap olmazdı.'),
  ],
  blanks: [
    { label: 'loopb', text: 'currentSize / 2', hint: m('The last node that has a child.', 'Çocuğu olan son düğüm.') },
    { label: 'loopb', text: 'i > 0', accept: ['i >= 1', 'i>=1'], hint: m('Go all the way to the root (index 1).', 'Köke (index 1) kadar git.') },
    { label: 'call', text: 'percolateDown(i)', hint: m('Fix the subtree rooted at i.', 'i köklü alt ağacı düzelt.') },
  ],
};
