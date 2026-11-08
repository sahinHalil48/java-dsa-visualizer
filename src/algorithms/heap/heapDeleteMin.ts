import { m } from '../../i18n';
import { java, parseNum } from '../../engine/code';
import { InputError, Tracer } from '../../engine/tracer';
import type { Algorithm } from '../../types';
import { HeapSim, PERCOLATE_DOWN, heapPresetsPQ, parseHeap, percolateNotes } from './common';

const code = java(
  `
public int deleteMin() {                             //@sig
    if (isEmpty())
        throw new UnderflowException();
    int minItem = array[1];                          //@min
    array[1] = array[currentSize--];                 //@last
    percolateDown(1);                                //@call
    return minItem;                                  //@ret
}
` + PERCOLATE_DOWN,
);

export const heapDeleteMin: Algorithm = {
  id: 'heap-deletemin',
  category: 'heap',
  name: m('Heap: deleteMin (percolate down)', 'Heap: deleteMin (percolate down)'),
  summary: m('Remove the root, move the last element into the root position, then let the hole sink: the smaller child always moves up.', 'Kökü çıkar, son elemanı köke taşı, sonra boşluğu aşağı indir: her seferinde küçük çocuk yukarı çıkar.'),
  code,
  notes: {
    sig: m('Remove and return the smallest element.', 'En küçük elemanı çıkar ve döndür.'),
    min: m('The minimum is always at the root, array[1] (findMin is O(1)).', 'Minimum her zaman kökte, array[1] (findMin O(1)).'),
    last: m('Structure: the heap loses one cell, and it must be the LAST one. Move the last element to the root and shrink currentSize.', 'Yapı: heap bir hücre kaybeder ve bu SON hücre olmalı. Son elemanı köke taşı ve currentSize\'ı küçült.'),
    call: m('The root is probably too big now: percolate it down.', 'Kök büyük ihtimalle artık çok büyük: aşağı indir.'),
    ret: m('Return the old minimum. O(log N) worst AND average: the element from the bottom is large and sinks back down.', 'Eski minimumu döndür. En kötü VE ortalama O(log N): alttan gelen eleman büyüktür, geri aşağı batar.'),
    ...percolateNotes,
  },
  inputs: [
    { key: 'heap', label: m('Min-heap (index 1, 2, 3, …)', 'Min-heap (index 1, 2, 3, …)'), type: 'list' },
    { key: 'times', label: m('How many deleteMin calls', 'Kaç kez deleteMin'), type: 'number' },
  ],
  defaults: { heap: '13 14 16 19 21 19 68 65 26 32 31', times: '1' },
  presets: [
    { name: m('Slides 18–20 example', 'Slayt 18–20 örneği'), values: { heap: '13 14 16 19 21 19 68 65 26 32 31', times: '1' } },
    { name: m('Exercise: one more deleteMin', 'Alıştırma: bir deleteMin daha'), values: { heap: '14 19 16 26 21 19 68 65 31 32', times: '1' } },
    { name: m('Three deleteMins in a row', 'Arka arkaya üç deleteMin'), values: { heap: heapPresetsPQ, times: '3' } },
  ],
  run(input) {
    const values = parseHeap(input.heap, 15);
    const times = parseNum(input.times, 1, 5, 'times');
    if (times > values.length) throw new InputError(m('The heap does not have that many elements.', 'Heap\'te o kadar eleman yok.'));
    const t = new Tracer(code);
    const h = new HeapSim(t, values, values.length);
    const out: number[] = [];
    for (let r = 0; r < times; r++) {
      t.stack = ['deleteMin()'];
      t.set({ currentSize: h.size, minItem: undefined });
      t.snap('sig', m(`Heap: ${h.show()}. deleteMin().`, `Heap: ${h.show()}. deleteMin().`), h.S());
      const min = h.cells[1]!;
      t.set({ minItem: min.v });
      t.snap('min', m(`minItem = array[1] = ${min.v}.`, `minItem = array[1] = ${min.v}.`), h.S({ marks: [{ idx: 1, role: 'found' }] }));
      const last = h.cells[h.size]!;
      h.cells[1] = last;
      h.cells[h.size] = null;
      h.size--;
      t.count('moves');
      t.set({ currentSize: h.size });
      t.snap('last', m(`array[1] = array[${h.size + 1}] = ${last.v}, currentSize = ${h.size}. ${min.v} is gone. ${last.v} breaks heap order at the root.`, `array[1] = array[${h.size + 1}] = ${last.v}, currentSize = ${h.size}. ${min.v} çıktı. ${last.v} kökte heap kuralını bozuyor.`), h.S({ marks: h.size >= 2 ? [{ idx: 1, role: 'bad' }] : [] }));
      if (h.size >= 1) {
        t.snap('call', m('percolateDown(1)', 'percolateDown(1)'), h.S());
        h.percolateDown(1);
      }
      out.push(min.v);
      t.snap('ret', m(`return ${min.v}. Heap: ${h.show()}.`, `return ${min.v}. Heap: ${h.show()}.`), h.S());
    }
    t.stack = [];
    t.set({ minItem: undefined });
    t.snap('ret', m(`Removed in order: ${out.join(', ')}. Removing all N elements this way would give a sorted list (heapsort).`, `Çıkış sırası: ${out.join(', ')}. N elemanın hepsini böyle çıkarmak sıralı bir liste verirdi (heapsort).`), h.S());
    return t.steps;
  },
  concept: [
    m('The removed cell must be the last one (to keep a complete tree), so the last element moves to the root.', 'Silinen hücre son hücre olmalı (complete tree kalsın diye), bu yüzden son eleman köke gelir.'),
    m('Percolate down: the hole sinks; the SMALLER child moves up each time.', 'Percolate down: boşluk aşağı iner; her seferinde KÜÇÜK çocuk yukarı çıkar.'),
    m('k deleteMins after buildHeap: O(N + k log N) (selection problem).', 'buildHeap\'ten sonra k deleteMin: O(N + k log N) (selection problemi).'),
  ],
  complexity: [
    { op: 'deleteMin', best: 'O(1)', avg: 'O(log N)', worst: 'O(log N)' },
    { op: 'findMin', worst: 'O(1)' },
  ],
  pitfalls: [
    m('Insert is O(1) on average but deleteMin is O(log N) on average.', 'insert ortalama O(1), deleteMin ise ortalama O(log N).'),
    m('Moving the bigger child up would put it above its smaller sibling and break heap order.', 'Büyük çocuğu yukarı çıkarmak onu küçük kardeşinin üstüne koyar ve heap kuralını bozar.'),
    m('A node can have only one child (the last parent). Check child != currentSize before looking right.', 'Bir düğümün tek çocuğu olabilir (son ebeveyn). Sağa bakmadan önce child != currentSize kontrol et.'),
  ],
  blanks: [
    { label: 'min', text: 'array[1]', hint: m('Where is the minimum?', 'Minimum nerede?') },
    { label: 'last', text: 'array[currentSize--]', hint: m('Take the last element and shrink the heap.', 'Son elemanı al ve heap\'i küçült.') },
    { label: 'loop', text: 'hole * 2 <= currentSize', accept: ['2*hole<=currentSize', '2 * hole <= currentSize'], hint: m('Does the hole have a left child?', 'Boşluğun sol çocuğu var mı?') },
    { label: 'ifr', text: 'array[child + 1] < array[child]', accept: ['array[child] > array[child + 1]', 'array[child]>array[child+1]'], hint: m('Pick the smaller child.', 'Küçük çocuğu seç.') },
    { label: 'cmp', text: 'array[child] < tmp', accept: ['tmp > array[child]'], hint: m('When must the child move up?', 'Çocuk ne zaman yukarı çıkmalı?') },
    { label: 'move', text: 'array[hole] = array[child]', hint: m('Slide the child up into the hole.', 'Çocuğu boşluğa çıkar.') },
  ],
};
