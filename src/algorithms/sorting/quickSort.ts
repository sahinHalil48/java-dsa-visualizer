import { m } from '../../i18n';
import { java, parseList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm, ArrayState, Mark, Ptr, Range, Tok } from '../../types';
import { arrInput, randomArr, show, sortedR, toks } from './common';

const code = java(`
public static void quickSort(int[] a) {                          //@sig
    quickSort(a, 0, a.length - 1);                                //@first
}

private static void quickSort(int[] a, int left, int right) {     //@rsig
    if (left >= right) return;                                    //@base
    int mid = (left + right) / 2;   // pivot = middle element     //@mid
    swap(a, mid, right);            // move pivot out of the way  //@hide
    int pivot = a[right];                                         //@pivot
    int i = left, j = right - 1;                                  //@ij
    while (true) {
        while (i < right && a[i] < pivot) i++;                    //@scani
        while (j > left && a[j] > pivot) j--;                     //@scanj
        if (i < j) {                                              //@cross
            swap(a, i, j);                                        //@swap
            i++; j--;                                             //@adv
        } else break;                                             //@brk
    }
    swap(a, i, right);              // put pivot in its place     //@restore
    quickSort(a, left, i - 1);                                    //@recl
    quickSort(a, i + 1, right);                                   //@recr
}
`);

export const quickSort: Algorithm = {
  id: 'quick-sort',
  category: 'sorting',
  name: m('Quicksort', 'Quicksort'),
  summary: m('Pick a pivot, partition the array into "smaller" and "bigger" parts, then sort both parts recursively. Fastest in practice.', 'Bir pivot seç, diziyi "küçükler" ve "büyükler" diye böl, sonra iki parçayı recursive sırala. Pratikte en hızlısı.'),
  code,
  notes: {
    sig: m('Public driver method.', 'Dışarıdan çağrılan sürücü metot.'),
    first: m('Sort the whole array.', 'Bütün diziyi sırala.'),
    rsig: m('Sort a[left..right].', 'a[left..right] aralığını sırala.'),
    base: m('0 or 1 element: nothing to do.', '0 ya da 1 eleman: yapılacak bir şey yok.'),
    mid: m('Pivot choice. The middle element is safe on sorted input. Picking the first element would give O(N²) on sorted data. Median-of-three is the common practical choice.', 'Pivot seçimi. Ortadaki eleman sıralı girdide güvenli. İlk elemanı seçmek sıralı veride O(N²) yapar. Pratikte genelde median-of-three kullanılır.'),
    hide: m('Step 1: move the pivot to the end so it is not in the way during partitioning.', '1. adım: pivot\'u sona taşı, partition sırasında ayağa dolanmasın.'),
    pivot: m('Remember the pivot value.', 'Pivot değerini hatırla.'),
    ij: m('Step 2: two fingers. i starts at the left, j just left of the pivot.', '2. adım: iki parmak. i soldan, j pivot\'un hemen solundan başlar.'),
    scani: m('i skips elements smaller than the pivot and stops at one that is ≥ pivot (a big element on the wrong side).', 'i pivot\'tan küçükleri atlar, ≥ pivot olan bir elemanda durur (yanlış tarafta duran büyük eleman).'),
    scanj: m('j skips elements bigger than the pivot and stops at one that is ≤ pivot. Stopping on equal keys keeps splits balanced when many keys are equal.', 'j pivot\'tan büyükleri atlar, ≤ pivot olan bir elemanda durur. Eşitlerde durmak, çok sayıda eşit eleman varken bölmeyi dengeli tutar.'),
    cross: m('Have the fingers crossed? If not, both found an element on the wrong side.', 'Parmaklar çaprazlandı mı? Çaprazlanmadıysa ikisi de yanlış tarafta bir eleman buldu.'),
    swap: m('Swap them: the big one goes right, the small one goes left. This is a long-distance swap, which is why quicksort beats O(N²).', 'Swap et: büyük sağa, küçük sola. Bu uzak mesafeli bir swap; quicksort\'un O(N²)\'yi geçmesinin sebebi bu.'),
    adv: m('Move both fingers past the swapped elements.', 'İki parmağı da swap edilen elemanların ötesine geçir.'),
    brk: m('i ≥ j: partitioning is finished.', 'i ≥ j: partition bitti.'),
    restore: m('Step 3: swap the pivot into position i. Everything left of it is ≤ pivot, everything right of it is ≥ pivot. The pivot is in its FINAL place.', '3. adım: pivot\'u i. konuma swap et. Solundaki her şey ≤ pivot, sağındaki her şey ≥ pivot. Pivot SON yerinde.'),
    recl: m('Sort the "small" part. No merge step is needed afterwards.', '"Küçükler" kısmını sırala. Sonrasında merge adımı gerekmez.'),
    recr: m('Sort the "big" part.', '"Büyükler" kısmını sırala.'),
  },
  inputs: [arrInput],
  defaults: { arr: '5 7 4 6 3 12 19' },
  presets: [
    { name: m('Partition example from the notes', 'Notlardaki partition örneği'), values: { arr: '5 7 4 6 3 12 19' } },
    { name: m('Slide 38 example', 'Slayt 38 örneği'), values: { arr: '10 40 12 6 37 18 2 32 17 35' } },
    { name: m('Exercise from the notes', 'Notlardaki alıştırma'), values: { arr: '9 3 7 5 1 8 2' } },
    { name: m('All equal keys', 'Bütün elemanlar eşit'), values: { arr: '5 5 5 5 5 5' } },
  ],
  random: randomArr(9),
  run(input) {
    const t = new Tracer(code);
    const a: Tok[] = toks(parseList(input.arr, { min: 1, max: 14 }));
    const n = a.length;
    const fin: Range[] = [];
    const S = (extra: Partial<ArrayState> = {}): ArrayState => ({ kind: 'array', cells: a.slice(), ptrs: [], marks: [], ...extra, ranges: [...fin, ...(extra.ranges ?? [])] });
    const swap = (x: number, y: number) => {
      [a[x], a[y]] = [a[y], a[x]];
      if (x !== y) t.count('swaps');
    };
    t.stack = ['quickSort(a)'];
    t.snap('sig', m(`Start with ${show(a)}.`, `${show(a)} ile başla.`), S());
    t.snap('first', m(`quickSort(a, 0, ${n - 1})`, `quickSort(a, 0, ${n - 1})`), S({ ranges: [{ from: 0, to: n - 1, role: 'active' }] }));

    const qs = (left: number, right: number) => {
      t.count('calls');
      t.stack.push(`quickSort(a, ${left}, ${right})`);
      t.set({ left, right, mid: undefined, pivot: undefined, i: undefined, j: undefined });
      const act: Range = { from: left, to: right, role: 'active' };
      if (left >= right) {
        if (left === right) fin.push(sortedR(left, left));
        t.snap('base', left === right ? m(`Range [${left}..${right}] has one element: it is in its final place.`, `[${left}..${right}] aralığında tek eleman: son yerinde.`) : m(`Range [${left}..${right}] is empty. Return.`, `[${left}..${right}] aralığı boş. Geri dön.`), S({ ranges: left <= right ? [act] : [] }));
        t.stack.pop();
        return;
      }
      t.snap('base', m(`Sort ${show(a.slice(left, right + 1))} (indexes ${left}..${right}).`, `${show(a.slice(left, right + 1))} sıralanacak (index ${left}..${right}).`), S({ ranges: [act] }));
      const mid = Math.floor((left + right) / 2);
      t.set({ mid });
      t.snap('mid', m(`mid = ${mid}, pivot value = ${a[mid].v}.`, `mid = ${mid}, pivot değeri = ${a[mid].v}.`), S({ ranges: [act], marks: [{ idx: mid, role: 'pivot' }], ptrs: [{ name: 'mid', idx: mid }] }));
      swap(mid, right);
      t.snap('hide', m(`swap(a, ${mid}, ${right}): the pivot ${a[right].v} moves to the end.`, `swap(a, ${mid}, ${right}): pivot ${a[right].v} sona gider.`), S({ ranges: [act], marks: [{ idx: right, role: 'pivot' }, { idx: mid, role: 'swap' }] }));
      const pivot = a[right].v;
      t.set({ mid: undefined, pivot });
      t.snap('pivot', m(`pivot = ${pivot}.`, `pivot = ${pivot}.`), S({ ranges: [act], marks: [{ idx: right, role: 'pivot' }] }));
      let i = left,
        j = right - 1;
      const P = (): Ptr[] => [{ name: 'i', idx: i }, { name: 'j', idx: j }];
      const PM = (extra: Mark[] = []): Mark[] => [{ idx: right, role: 'pivot' }, ...extra];
      t.set({ i, j });
      t.snap('ij', m(`i = ${i}, j = ${j}.`, `i = ${i}, j = ${j}.`), S({ ranges: [act], marks: PM(), ptrs: P() }));
      for (;;) {
        for (;;) {
          const go = i < right && a[i].v < pivot;
          t.count('cmp');
          t.snap('scani', go ? m(`a[${i}] = ${a[i].v} < ${pivot}: correct side, i++.`, `a[${i}] = ${a[i].v} < ${pivot}: doğru tarafta, i++.`) : m(`a[${i}] = ${a[i].v} ≥ ${pivot}: i stops here.`, `a[${i}] = ${a[i].v} ≥ ${pivot}: i burada durur.`), S({ ranges: [act], marks: PM([{ idx: i, role: 'cmp' }]), ptrs: P() }));
          if (!go) break;
          i++;
          t.set({ i });
        }
        for (;;) {
          const go = j > left && a[j].v > pivot;
          t.count('cmp');
          t.snap('scanj', go ? m(`a[${j}] = ${a[j].v} > ${pivot}: correct side, j--.`, `a[${j}] = ${a[j].v} > ${pivot}: doğru tarafta, j--.`) : m(`a[${j}] = ${a[j].v} ≤ ${pivot}${j === left ? ' (or j reached left)' : ''}: j stops here.`, `a[${j}] = ${a[j].v} ≤ ${pivot}${j === left ? ' (ya da j başa geldi)' : ''}: j burada durur.`), S({ ranges: [act], marks: PM([{ idx: i, role: 'cmp' }, { idx: j, role: 'cmp' }]), ptrs: P() }));
          if (!go) break;
          j--;
          t.set({ j });
        }
        if (i < j) {
          t.snap('cross', m(`i = ${i} < j = ${j}: not crossed. Both elements are on the wrong side.`, `i = ${i} < j = ${j}: çaprazlanmadı. İki eleman da yanlış tarafta.`), S({ ranges: [act], marks: PM([{ idx: i, role: 'cmp' }, { idx: j, role: 'cmp' }]), ptrs: P() }));
          swap(i, j);
          t.snap('swap', m(`swap(a, ${i}, ${j}) → ${show(a.slice(left, right + 1))}`, `swap(a, ${i}, ${j}) → ${show(a.slice(left, right + 1))}`), S({ ranges: [act], marks: PM([{ idx: i, role: 'swap' }, { idx: j, role: 'swap' }]), ptrs: P() }));
          i++;
          j--;
          t.set({ i, j });
          t.snap('adv', m(`i = ${i}, j = ${j}.`, `i = ${i}, j = ${j}.`), S({ ranges: [act], marks: PM(), ptrs: P() }));
        } else {
          t.snap('cross', m(`i = ${i} ≥ j = ${j}: the fingers crossed.`, `i = ${i} ≥ j = ${j}: parmaklar çaprazlandı.`), S({ ranges: [act], marks: PM(), ptrs: P() }));
          t.snap('brk', m('Partitioning is done.', 'Partition bitti.'), S({ ranges: [act], marks: PM(), ptrs: P() }));
          break;
        }
      }
      swap(i, right);
      fin.push(sortedR(i, i));
      t.snap(
        'restore',
        m(`swap(a, ${i}, ${right}): pivot ${pivot} is in its final place. Left: ${show(a.slice(left, i))} (≤ ${pivot}), right: ${show(a.slice(i + 1, right + 1))} (≥ ${pivot}).`, `swap(a, ${i}, ${right}): pivot ${pivot} son yerinde. Sol: ${show(a.slice(left, i))} (≤ ${pivot}), sağ: ${show(a.slice(i + 1, right + 1))} (≥ ${pivot}).`),
        S({ ranges: [...(i > left ? [{ from: left, to: i - 1, role: 'left' as const }] : []), ...(i < right ? [{ from: i + 1, to: right, role: 'right' as const }] : [])], marks: [{ idx: i, role: 'pivot' }], ptrs: [{ name: 'i', idx: i }] }),
      );
      t.snap('recl', m(`Sort the left part [${left}..${i - 1}].`, `Sol kısmı sırala: [${left}..${i - 1}].`), S({ ranges: i - 1 >= left ? [{ from: left, to: i - 1, role: 'active' }] : [] }));
      const pi = i;
      qs(left, pi - 1);
      t.set({ left, right, pivot, i: pi, j: undefined });
      t.snap('recr', m(`Back in [${left}..${right}]. Sort the right part [${pi + 1}..${right}].`, `[${left}..${right}]'e döndük. Sağ kısmı sırala: [${pi + 1}..${right}].`), S({ ranges: pi + 1 <= right ? [{ from: pi + 1, to: right, role: 'active' }] : [] }));
      qs(pi + 1, right);
      t.stack.pop();
    };
    qs(0, n - 1);
    t.set({ left: undefined, right: undefined, pivot: undefined, i: undefined, j: undefined });
    fin.length = 0;
    t.snap('sig', m(`Sorted: ${show(a)}.`, `Sıralandı: ${show(a)}.`), S({ ranges: [sortedR(0, n - 1)] }));
    return t.steps;
  },
  concept: [
    m('Partition: pivot out of the way → i stops on ≥ pivot, j stops on ≤ pivot → swap while i < j → put the pivot at i.', 'Partition: pivot\'u kenara al → i ≥ pivot\'ta, j ≤ pivot\'ta durur → i < j iken swap → pivot\'u i\'ye koy.'),
    m('Mergesort does its work after the recursive calls (merge). Quicksort does it before them (partition).', 'Mergesort işini recursive çağrılardan sonra yapar (merge). Quicksort önce yapar (partition).'),
    m('Best: T(N) = 2T(N/2) + cN. Worst: T(N) = T(N−1) + cN. Average uses N·T(N) = (N+1)·T(N−1) + 2cN and a harmonic series.', 'En iyi: T(N) = 2T(N/2) + cN. En kötü: T(N) = T(N−1) + cN. Ortalama: N·T(N) = (N+1)·T(N−1) + 2cN ve harmonik seri.'),
  ],
  complexity: [
    { op: m('Sort', 'Sıralama'), best: 'O(N log N)', avg: 'O(N log N)', worst: 'O(N²)' },
    { op: 'partition', worst: 'O(N)' },
    { op: m('Extra memory', 'Ekstra bellek'), avg: 'O(log N)', worst: 'O(N)' },
  ],
  pitfalls: [
    m('Worst case O(N²) happens when the pivot is always the smallest or largest, e.g. first element as pivot on a sorted array.', 'En kötü durum O(N²): pivot hep en küçük ya da en büyük olduğunda, örn. sıralı dizide ilk elemanı pivot almak.'),
    m('Stop on keys equal to the pivot. Skipping them makes an all-equal array O(N²).', 'Pivot\'a eşit elemanlarda dur. Atlarsan bütün elemanları eşit bir dizi O(N²) olur.'),
    m('Bad on linked lists (needs random access).', 'Linked list\'te kötü (rastgele erişim gerekir).'),
  ],
  blanks: [
    { label: 'hide', text: 'swap(a, mid, right)', hint: m('Move the pivot out of the way, to the end.', 'Pivot\'u sona, yoldan çek.') },
    { label: 'ij', text: 'j = right - 1', hint: m('j starts just left of the pivot.', 'j pivot\'un hemen solundan başlar.') },
    { label: 'scani', text: 'a[i] < pivot', hint: m('i skips elements that are already on the correct (small) side.', 'i zaten doğru (küçük) tarafta olanları atlar.') },
    { label: 'scanj', text: 'a[j] > pivot', hint: m('j skips elements that are already on the correct (big) side.', 'j zaten doğru (büyük) tarafta olanları atlar.') },
    { label: 'cross', text: 'i < j', hint: m('Swap only if the fingers have not crossed.', 'Sadece parmaklar çaprazlanmadıysa swap et.') },
    { label: 'restore', text: 'swap(a, i, right)', hint: m('Put the pivot into its final position.', 'Pivot\'u son yerine koy.') },
    { label: 'recl', text: 'i - 1', hint: m('The left part ends just before the pivot.', 'Sol kısım pivot\'un hemen önünde biter.') },
  ],
};
