import { m } from '../../i18n';
import { java, parseList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm, Range } from '../../types';
import { A, arrInput, randomArr, show, sortedR, toks } from './common';

const code = java(`
public static void bubbleSort(int[] a) {                         //@sig
    boolean swapped = true;                                       //@init
    for (int pass = 0; pass < a.length - 1 && swapped; pass++) {  //@outer
        swapped = false;                                          //@reset
        for (int j = 0; j < a.length - 1 - pass; j++) {           //@inner
            if (a[j] > a[j + 1]) {                                //@cmp
                swap(a, j, j + 1);                                //@swap
                swapped = true;                                   //@flag
            }
        }
    }
}                                                                 //@end
`);

export const bubbleSort: Algorithm = {
  id: 'bubble-sort',
  category: 'sorting',
  name: m('Bubble Sort', 'Bubble Sort'),
  summary: m('Compare neighbours and swap them if they are in the wrong order. The largest element bubbles to the end in every pass.', 'Yan yana elemanları karşılaştır, yanlış sıradaysa swap et. Her turda en büyük eleman sona kabarcık gibi çıkar.'),
  code,
  notes: {
    sig: m('Sorts in place using only neighbour swaps.', 'Sadece yan yana swap\'larla yerinde sıralar.'),
    init: m('true so that the first pass runs.', 'İlk tur çalışsın diye true.'),
    outer: m('One pass per iteration. Stops early if the previous pass made no swaps: that gives the O(N) best case.', 'Her iterasyon bir tur. Önceki turda hiç swap olmadıysa erken durur: O(N) en iyi durum buradan gelir.'),
    reset: m('No swaps yet in this pass.', 'Bu turda henüz swap yok.'),
    inner: m('The last `pass` elements are already in their final place, so we stop before them.', 'Son `pass` eleman zaten son yerinde, onlara gelmeden dururuz.'),
    cmp: m('Are the two neighbours in the wrong order?', 'İki komşu yanlış sırada mı?'),
    swap: m('Swap the neighbours. One neighbour swap removes exactly one inversion.', 'Komşuları swap et. Bir komşu swap\'ı tam olarak bir inversion siler.'),
    flag: m('Remember that this pass changed something.', 'Bu turun bir şey değiştirdiğini hatırla.'),
    end: m('Done.', 'Bitti.'),
  },
  inputs: [arrInput],
  defaults: { arr: '5 1 4 2 8' },
  presets: [
    { name: m('Slide 13 example', 'Slayt 13 örneği'), values: { arr: '5 1 4 2 8' } },
    { name: m('Already sorted (stops after 1 pass)', 'Zaten sıralı (1 turda durur)'), values: { arr: '1 2 3 4 5' } },
    { name: m('Reverse sorted', 'Ters sıralı'), values: { arr: '6 5 4 3 2 1' } },
  ],
  random: randomArr(7),
  run(input) {
    const t = new Tracer(code);
    const a = toks(parseList(input.arr, { min: 1, max: 12 }));
    const n = a.length;
    let swapped = true;
    t.set({ swapped: 'true' });
    t.snap('init', m(`Start with ${show(a)}.`, `${show(a)} ile başla.`), A(a));
    let pass = 0;
    const R = (p: number): Range[] => (p > 0 ? [sortedR(n - p, n - 1)] : []);
    for (; pass < n - 1 && swapped; pass++) {
      t.set({ pass, j: undefined });
      t.snap('outer', m(`Pass ${pass}. The last ${pass} element(s) are already in place.`, `${pass}. tur. Son ${pass} eleman zaten yerinde.`), A(a, { ranges: R(pass) }));
      swapped = false;
      t.set({ swapped: 'false' });
      t.snap('reset', m('New pass: no swaps yet.', 'Yeni tur: henüz swap yok.'), A(a, { ranges: R(pass) }));
      for (let j = 0; j < n - 1 - pass; j++) {
        t.set({ j });
        t.count('cmp');
        const bad = a[j].v > a[j + 1].v;
        t.snap(
          'cmp',
          bad ? m(`${a[j].v} > ${a[j + 1].v}: wrong order.`, `${a[j].v} > ${a[j + 1].v}: yanlış sıra.`) : m(`${a[j].v} ≤ ${a[j + 1].v}: fine.`, `${a[j].v} ≤ ${a[j + 1].v}: sorun yok.`),
          A(a, { ranges: R(pass), ptrs: [{ name: 'j', idx: j }], marks: [{ idx: j, role: 'cmp' }, { idx: j + 1, role: 'cmp' }] }),
        );
        if (bad) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          t.count('swaps');
          t.snap('swap', m(`swap → ${show(a)}`, `swap → ${show(a)}`), A(a, { ranges: R(pass), ptrs: [{ name: 'j', idx: j }], marks: [{ idx: j, role: 'swap' }, { idx: j + 1, role: 'swap' }] }));
          swapped = true;
          t.set({ swapped: 'true' });
          t.snap('flag', m('Remember: this pass changed something.', 'Not: bu turda bir şey değişti.'), A(a, { ranges: R(pass), ptrs: [{ name: 'j', idx: j }] }));
        }
      }
      t.set({ j: undefined });
      t.snap('outer', swapped ? m(`End of pass ${pass}: ${a[n - 1 - pass].v} reached its final place.`, `${pass}. tur bitti: ${a[n - 1 - pass].v} son yerine ulaştı.`) : m(`End of pass ${pass}: no swaps, so the array is sorted. Stop early.`, `${pass}. tur bitti: hiç swap yok, dizi sıralı. Erken dur.`), A(a, { ranges: swapped ? R(pass + 1) : [sortedR(0, n - 1)] }));
    }
    t.set({ j: undefined });
    t.snap('end', m(`Sorted: ${show(a)}.`, `Sıralandı: ${show(a)}.`), A(a, { ranges: [sortedR(0, n - 1)] }));
    return t.steps;
  },
  concept: [
    m('After pass k, the k largest elements are at the end, in order.', 'k. turdan sonra en büyük k eleman sonda ve sıralı.'),
    m('Only neighbours are swapped, so it needs as many swaps as there are inversions.', 'Sadece komşular swap edilir, bu yüzden inversion sayısı kadar swap gerekir.'),
    m('The swapped flag lets it stop after one pass on a sorted array.', 'swapped bayrağı sayesinde sıralı dizide tek turda durur.'),
  ],
  complexity: [{ op: m('Sort', 'Sıralama'), best: 'O(N)', avg: 'O(N²)', worst: 'O(N²)' }],
  pitfalls: [
    m('Without the swapped check, the best case is O(N²) too.', 'swapped kontrolü olmadan en iyi durum da O(N²) olur.'),
    m('The algorithm only knows the array is sorted after a full pass with no swaps.', 'Algoritma dizinin sıralı olduğunu ancak hiç swap olmayan tam bir turdan sonra anlar.'),
  ],
  blanks: [
    { label: 'outer', text: 'swapped', hint: m('Continue only if the last pass changed something.', 'Sadece son tur bir şey değiştirdiyse devam et.') },
    { label: 'inner', text: 'a.length - 1 - pass', hint: m('Skip the elements that already bubbled to the end.', 'Sona çıkmış elemanları atla.') },
    { label: 'cmp', text: 'a[j] > a[j + 1]', accept: ['a[j+1] < a[j]', 'a[j + 1] < a[j]'], hint: m('When are two neighbours in the wrong order?', 'İki komşu ne zaman yanlış sıradadır?') },
    { label: 'flag', text: 'swapped = true', hint: m('Record that a swap happened.', 'Bir swap olduğunu kaydet.') },
  ],
};
