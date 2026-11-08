import { m } from '../../i18n';
import { java, parseList } from '../../engine/code';
import { InputError, Tracer } from '../../engine/tracer';
import type { Algorithm } from '../../types';
import { HeapSim, heapPresetsPQ, parseHeap } from './common';

const code = java(`
public void insert(int x) {                          //@sig
    if (currentSize == array.length - 1)
        enlargeArray(array.length * 2 + 1);          //@grow
    int hole = ++currentSize;                        //@hole
    array[0] = x;                // sentinel        //@sentinel
    for (; x < array[hole / 2]; hole /= 2)           //@loop
        array[hole] = array[hole / 2];               //@move
    array[hole] = x;                                 //@place
}                                                    //@end
`);

export const heapInsert: Algorithm = {
  id: 'heap-insert',
  category: 'heap',
  name: m('Heap: insert (percolate up)', 'Heap: insert (percolate up)'),
  summary: m('Open a hole at the next free spot, then slide parents down until x fits. The hole bubbles up.', 'Sonraki boş yere bir boşluk aç, x sığana kadar ebeveynleri aşağı kaydır. Boşluk yukarı kabarcık gibi çıkar.'),
  code,
  notes: {
    sig: m('Insert x into the min-heap (root at index 1).', 'x\'i min-heap\'e ekle (kök index 1\'de).'),
    grow: m('If the array is full, double it. Rare, so the cost is spread out (amortized).', 'Dizi doluysa iki katına çıkar. Nadiren olur, maliyeti dağılır (amortized).'),
    hole: m('Structure property: the only legal new spot is the next free cell, currentSize+1. Open a hole there.', 'Yapı özelliği: tek geçerli yeni yer sonraki boş hücre, currentSize+1. Oraya bir boşluk aç.'),
    sentinel: m('Sentinel trick: when the hole reaches the root, hole/2 = 0 and x < x is false, so the loop stops without an extra "hole > 1" check.', 'Sentinel hilesi: boşluk köke ulaşınca hole/2 = 0 olur ve x < x yanlış olduğu için döngü ekstra "hole > 1" kontrolü olmadan durur.'),
    loop: m('Order property: while x is smaller than the parent of the hole, the hole must go up. Parent of i is i/2.', 'Sıra özelliği: x boşluğun ebeveyninden küçük olduğu sürece boşluk yukarı çıkmalı. i\'nin ebeveyni i/2.'),
    move: m('Slide the parent down into the hole (1 assignment, not a 3-assignment swap).', 'Ebeveyni boşluğa kaydır (3 atamalı swap değil, 1 atama).'),
    place: m('x fits: write it into the hole.', 'x sığıyor: boşluğa yaz.'),
    end: m('Worst case O(log N) (new minimum climbs to the root). Average O(1).', 'En kötü O(log N) (yeni minimum köke çıkar). Ortalama O(1).'),
  },
  inputs: [
    { key: 'heap', label: m('Existing min-heap (index 1, 2, 3, …)', 'Mevcut min-heap (index 1, 2, 3, …)'), type: 'list' },
    { key: 'x', label: m('Values to insert, in order', 'Sırayla eklenecek değerler'), type: 'list' },
  ],
  defaults: { heap: heapPresetsPQ, x: '14' },
  presets: [
    { name: m('Slides 13–14: insert 14', 'Slayt 13–14: 14 ekle'), values: { heap: heapPresetsPQ, x: '14' } },
    { name: m('Exercise: insert 15, then 10', 'Alıştırma: önce 15, sonra 10'), values: { heap: '13 14 16 24 21 19 68 65 26 32 31', x: '15 10' } },
    { name: m('Build by inserting one by one', 'Tek tek ekleyerek kur'), values: { heap: '', x: '5 3 8 1 4' } },
  ],
  random: () => ({ heap: heapPresetsPQ, x: String(1 + Math.floor(Math.random() * 70)) }),
  run(input) {
    const values = parseHeap(input.heap, 14, true);
    const xs = parseList(input.x, { min: 1, max: 6 });
    if (values.length + xs.length > 15) throw new InputError(m('Keep the heap at 15 elements or fewer.', 'Heap en fazla 15 eleman olsun.'));
    const t = new Tracer(code);
    const h = new HeapSim(t, values, values.length + xs.length);
    t.snap('sig', m(`Heap: ${h.show()}. Insert ${xs.join(', ')}.`, `Heap: ${h.show()}. Eklenecek: ${xs.join(', ')}.`), h.S());
    for (const xv of xs) {
      const x = { id: h.nextId++, v: xv };
      t.stack = [`insert(${xv})`];
      t.set({ x: xv, hole: undefined });
      let hole = ++h.size;
      t.set({ hole, currentSize: h.size });
      t.snap('hole', m(`hole = ++currentSize = ${hole}. That is the next free spot of the complete tree.`, `hole = ++currentSize = ${hole}. Complete ağacın sonraki boş yeri burası.`), h.S({ float: { label: 'x', tok: x, at: hole }, ptrs: [{ name: 'hole', idx: hole }] }));
      h.cells[0] = { ...x };
      t.snap('sentinel', m(`array[0] = ${xv} (sentinel).`, `array[0] = ${xv} (sentinel).`), h.S({ float: { label: 'x', tok: x, at: hole }, ptrs: [{ name: 'hole', idx: hole }], marks: [{ idx: 0, role: 'write' }] }));
      for (;;) {
        const p = Math.floor(hole / 2);
        const pv = h.cells[p]!.v;
        t.count('cmp');
        const up = xv < pv;
        const msg =
          p === 0
            ? m(`hole = 1, hole/2 = 0 → compare with the sentinel: ${xv} < ${xv} is false. Stop at the root.`, `hole = 1, hole/2 = 0 → sentinel ile karşılaştır: ${xv} < ${xv} yanlış. Kökte dur.`)
            : up
              ? m(`Parent of ${hole} is ${p} (value ${pv}). ${xv} < ${pv}: the hole must go up.`, `${hole}'in ebeveyni ${p} (değer ${pv}). ${xv} < ${pv}: boşluk yukarı çıkmalı.`)
              : m(`Parent of ${hole} is ${p} (value ${pv}). ${xv} ≥ ${pv}: x fits here.`, `${hole}'in ebeveyni ${p} (değer ${pv}). ${xv} ≥ ${pv}: x buraya sığar.`);
        t.snap('loop', msg, h.S({ float: { label: 'x', tok: x, at: hole }, ptrs: [{ name: 'hole', idx: hole }], marks: [{ idx: p, role: 'cmp' }] }));
        if (!up) break;
        h.cells[hole] = h.cells[p];
        h.cells[p] = null;
        t.count('moves');
        t.snap('move', m(`array[${hole}] = array[${p}]: ${pv} slides down. The hole moves up to ${p}.`, `array[${hole}] = array[${p}]: ${pv} aşağı kayar. Boşluk ${p}'ye çıkar.`), h.S({ float: { label: 'x', tok: x, at: p }, ptrs: [{ name: 'hole', idx: p }], marks: [{ idx: hole, role: 'move' }] }));
        hole = p;
        t.set({ hole });
      }
      h.cells[hole] = x;
      t.count('moves');
      t.snap('place', m(`array[${hole}] = ${xv}. Heap: ${h.show()}.`, `array[${hole}] = ${xv}. Heap: ${h.show()}.`), h.S({ marks: [{ idx: hole, role: 'write' }] }));
    }
    t.stack = [];
    t.set({ x: undefined, hole: undefined });
    t.snap('end', m(`Done. Heap: ${h.show()}.`, `Bitti. Heap: ${h.show()}.`), h.S());
    return t.steps;
  },
  concept: [
    m('Two properties must survive: complete tree (structure) and parent ≤ child (order).', 'İki özellik korunmalı: complete tree (yapı) ve ebeveyn ≤ çocuk (sıra).'),
    m('Only one root-to-leaf path is touched, so the work is at most the height ⌊log N⌋.', 'Sadece kökten yaprağa tek bir yol değişir, iş en fazla yükseklik ⌊log N⌋ kadar.'),
    m('Array formulas (root at 1): left = 2i, right = 2i+1, parent = ⌊i/2⌋.', 'Dizi formülleri (kök 1\'de): sol = 2i, sağ = 2i+1, ebeveyn = ⌊i/2⌋.'),
  ],
  complexity: [
    { op: 'insert', best: 'O(1)', avg: 'O(1)', worst: 'O(log N)' },
    { op: 'findMin', best: 'O(1)', avg: 'O(1)', worst: 'O(1)' },
    { op: m('N inserts', 'N insert'), avg: 'O(N)', worst: 'O(N log N)' },
  ],
  pitfalls: [
    m('array[0] = x is a sentinel: it stops the loop at the root.', 'array[0] = x bir sentinel: döngüyü kökte durdurur.'),
    m('Parents are shifted down, x is written once at the end (no swaps).', 'Ebeveynler aşağı kaydırılır, x en sonda bir kez yazılır (swap yok).'),
    m('Average insert is O(1) because most nodes are near the bottom.', 'Ortalama insert O(1), çünkü düğümlerin çoğu alt seviyelerde.'),
  ],
  blanks: [
    { label: 'hole', text: '++currentSize', hint: m('Grow the heap by one and use that index.', 'Heap\'i bir büyüt ve o index\'i kullan.') },
    { label: 'sentinel', text: 'array[0] = x', hint: m('The sentinel trick.', 'Sentinel hilesi.') },
    { label: 'loop', text: 'x < array[hole / 2]', accept: ['array[hole/2] > x', 'array[hole / 2] > x'], hint: m('Go up while x is smaller than the parent.', 'x ebeveynden küçük olduğu sürece yukarı çık.') },
    { label: 'loop', text: 'hole /= 2', accept: ['hole = hole / 2', 'hole=hole/2'], hint: m('Move the hole to its parent.', 'Boşluğu ebeveynine taşı.') },
    { label: 'move', text: 'array[hole] = array[hole / 2]', hint: m('Slide the parent down.', 'Ebeveyni aşağı kaydır.') },
  ],
};
