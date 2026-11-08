import { m } from '../../i18n';
import { java, parseList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm, Mark } from '../../types';
import { A, arrInput, randomArr, show, sortedR, toks } from './common';

const code = java(`
public static void selectionSort(int[] a) {           //@sig
    for (int i = 0; i < a.length - 1; i++) {          //@outer
        int min = i;                                   //@min
        for (int j = i + 1; j < a.length; j++) {       //@inner
            if (a[j] < a[min]) {                       //@cmp
                min = j;                               //@newmin
            }
        }
        swap(a, i, min);                               //@swap
    }
}                                                      //@end
`);

export const selectionSort: Algorithm = {
  id: 'selection-sort',
  category: 'sorting',
  name: m('Selection Sort', 'Selection Sort'),
  summary: m('Find the smallest remaining element and swap it to the front. Repeat.', 'Kalanlar arasından en küçüğü bul ve öne swap et. Tekrarla.'),
  code,
  notes: {
    sig: m('Sorts the array in place.', 'Diziyi yerinde sıralar.'),
    outer: m('Position i will receive the i-th smallest element. After this pass a[0..i] is final.', 'i. konuma i. en küçük eleman gelecek. Bu turdan sonra a[0..i] kesinleşir.'),
    min: m('Assume the first unsorted element is the minimum for now.', 'Şimdilik sıralanmamış kısmın ilk elemanını minimum kabul et.'),
    inner: m('Scan every remaining element. This happens even if the array is already sorted, so selection sort is always O(N²).', 'Kalan her elemana bak. Dizi zaten sıralı olsa bile bu tarama yapılır, bu yüzden selection sort hep O(N²).'),
    cmp: m('One comparison: is a[j] smaller than the best so far?', 'Bir karşılaştırma: a[j] şu ana kadarki en küçükten küçük mü?'),
    newmin: m('Remember the index of the new minimum.', 'Yeni minimumun index\'ini hatırla.'),
    swap: m('Swap the minimum into position i. At most N−1 swaps in total, which is why selection sort moves data very little.', 'Minimumu i. konuma swap et. Toplamda en fazla N−1 swap, bu yüzden selection sort çok az veri taşır.'),
    end: m('Done.', 'Bitti.'),
  },
  inputs: [arrInput],
  defaults: { arr: '64 25 12 22 11' },
  presets: [
    { name: m('Example from the notes', 'Notlardaki örnek'), values: { arr: '64 25 12 22 11' } },
    { name: m('Already sorted (still O(N²))', 'Zaten sıralı (yine O(N²))'), values: { arr: '1 2 3 4 5 6' } },
  ],
  random: randomArr(8),
  run(input) {
    const t = new Tracer(code);
    const a = toks(parseList(input.arr, { min: 1, max: 14 }));
    const n = a.length;
    t.snap('sig', m(`Start with ${show(a)}.`, `${show(a)} ile başla.`), A(a));
    for (let i = 0; i < n - 1; i++) {
      const R = i > 0 ? [sortedR(0, i - 1)] : [];
      t.set({ i, min: undefined, j: undefined });
      t.snap('outer', m(`Pass i = ${i}: find the smallest element in a[${i}..${n - 1}].`, `i = ${i}. tur: a[${i}..${n - 1}] içindeki en küçüğü bul.`), A(a, { ranges: R, ptrs: [{ name: 'i', idx: i }] }));
      let min = i;
      t.set({ min });
      t.snap('min', m(`min = ${i} (value ${a[i].v}).`, `min = ${i} (değer ${a[i].v}).`), A(a, { ranges: R, ptrs: [{ name: 'i', idx: i }, { name: 'min', idx: min }], marks: [{ idx: min, role: 'min' }] }));
      for (let j = i + 1; j < n; j++) {
        t.set({ j });
        t.count('cmp');
        const less = a[j].v < a[min].v;
        const marks: Mark[] = [{ idx: min, role: 'min' }, { idx: j, role: 'cmp' }];
        t.snap(
          'cmp',
          less ? m(`a[${j}] = ${a[j].v} < a[min] = ${a[min].v}? Yes.`, `a[${j}] = ${a[j].v} < a[min] = ${a[min].v} mi? Evet.`) : m(`a[${j}] = ${a[j].v} < a[min] = ${a[min].v}? No.`, `a[${j}] = ${a[j].v} < a[min] = ${a[min].v} mi? Hayır.`),
          A(a, { ranges: R, ptrs: [{ name: 'i', idx: i }, { name: 'min', idx: min }, { name: 'j', idx: j }], marks }),
        );
        if (less) {
          min = j;
          t.set({ min });
          t.snap('newmin', m(`New minimum: min = ${j} (value ${a[j].v}).`, `Yeni minimum: min = ${j} (değer ${a[j].v}).`), A(a, { ranges: R, ptrs: [{ name: 'i', idx: i }, { name: 'min', idx: min }, { name: 'j', idx: j }], marks: [{ idx: min, role: 'min' }] }));
        }
      }
      [a[i], a[min]] = [a[min], a[i]];
      if (i !== min) t.count('swaps');
      t.snap(
        'swap',
        i === min ? m(`min = i, so the swap does nothing: ${a[i].v} is already in place.`, `min = i, swap bir şey değiştirmez: ${a[i].v} zaten yerinde.`) : m(`swap(a, ${i}, ${min}): ${a[i].v} goes to position ${i}. a[0..${i}] is final.`, `swap(a, ${i}, ${min}): ${a[i].v} ${i}. konuma gider. a[0..${i}] kesinleşti.`),
        A(a, { ranges: [sortedR(0, i)], ptrs: [{ name: 'i', idx: i }], marks: [{ idx: i, role: 'swap' }, { idx: min, role: 'swap' }] }),
      );
    }
    t.set({ i: undefined, j: undefined, min: undefined });
    t.snap('end', m(`Sorted: ${show(a)}.`, `Sıralandı: ${show(a)}.`), A(a, { ranges: [sortedR(0, n - 1)] }));
    return t.steps;
  },
  concept: [
    m('After pass i, a[0..i] holds the i+1 smallest elements in their final places.', 'i. turdan sonra a[0..i] en küçük i+1 elemanı son yerlerinde tutar.'),
    m('Always N(N−1)/2 comparisons, whatever the input.', 'Girdi ne olursa olsun hep N(N−1)/2 karşılaştırma.'),
    m('At most N−1 swaps: useful when moving data is expensive.', 'En fazla N−1 swap: veri taşımak pahalıysa işe yarar.'),
  ],
  complexity: [
    { op: m('Sort', 'Sıralama'), best: 'O(N²)', avg: 'O(N²)', worst: 'O(N²)' },
    { op: m('Swaps', 'Swap sayısı'), worst: 'N − 1' },
  ],
  pitfalls: [
    m('Unlike insertion sort, selection sort is O(N²) even on a sorted array.', 'Insertion sort\'un aksine selection sort sıralı dizide bile O(N²).'),
    m('The swap happens once per pass, after the inner loop, not on every comparison.', 'Swap her karşılaştırmada değil, iç döngüden sonra turda bir kez yapılır.'),
  ],
  blanks: [
    { label: 'outer', text: 'a.length - 1', hint: m('The last element is automatically in place.', 'Son eleman otomatik olarak yerindedir.') },
    { label: 'inner', text: 'j = i + 1', hint: m('Start right after position i.', 'i\'nin hemen sonrasından başla.') },
    { label: 'cmp', text: 'a[j] < a[min]', hint: m('Is the current element smaller than the best so far?', 'Şu anki eleman şu ana kadarki en küçükten küçük mü?') },
    { label: 'swap', text: 'swap(a, i, min)', hint: m('Move the minimum to position i.', 'Minimumu i. konuma taşı.') },
  ],
};
