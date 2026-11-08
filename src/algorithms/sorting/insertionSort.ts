import { m } from '../../i18n';
import { java, parseList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm, Tok } from '../../types';
import { A, arrInput, randomArr, show, sortedR, toks } from './common';

const code = java(`
public static void insertionSort(int[] a) {         //@sig
    for (int p = 1; p < a.length; p++) {            //@outer
        int tmp = a[p];                              //@tmp
        int j;
        for (j = p; j > 0 && tmp < a[j - 1]; j--) {  //@inner
            a[j] = a[j - 1];                         //@shift
        }
        a[j] = tmp;                                  //@place
    }
}                                                    //@end
`);

export const insertionSort: Algorithm = {
  id: 'insertion-sort',
  category: 'sorting',
  name: m('Insertion Sort', 'Insertion Sort'),
  summary: m(
    'Like sorting playing cards in your hand: take the next card and slide it left into its place.',
    'Eldeki iskambil kartlarını sıralamak gibi: sıradaki kartı al, sola kaydırarak yerine sok.',
  ),
  code,
  notes: {
    sig: m('The method gets the array and sorts it in place (no extra array).', 'Metot diziyi alır ve yerinde sıralar (ekstra dizi yok).'),
    outer: m(
      'Pass p. Before this pass a[0..p-1] is already sorted. We start at p = 1 because one element alone is sorted. N−1 passes in total.',
      'p. tur. Bu turdan önce a[0..p-1] zaten sıralı. p = 1\'den başlarız çünkü tek eleman zaten sıralıdır. Toplam N−1 tur.',
    ),
    tmp: m(
      'Save a[p] in tmp. Its slot now acts like a "hole": larger elements can shift into it.',
      'a[p]\'yi tmp\'ye kaydet. Onun yeri artık bir "boşluk" (hole) gibi: büyük elemanlar buraya kayabilir.',
    ),
    inner: m(
      'Walk left while the element on the left is bigger than tmp. Stop at the front (j > 0) or when a[j-1] ≤ tmp.',
      'Soldaki eleman tmp\'den büyük olduğu sürece sola yürü. Başa gelince (j > 0) ya da a[j-1] ≤ tmp olunca dur.',
    ),
    shift: m(
      'Shift the bigger element one step right. This is a move, not a swap: 1 assignment instead of 3. Each shift removes exactly one inversion.',
      'Büyük elemanı bir sağa kaydır. Bu swap değil, kaydırma: 3 yerine 1 atama. Her kaydırma tam olarak bir inversion siler.',
    ),
    place: m('Drop tmp into the hole. Now a[0..p] is sorted.', 'tmp\'yi boşluğa bırak. Artık a[0..p] sıralı.'),
    end: m('Done: the whole array is sorted.', 'Bitti: bütün dizi sıralı.'),
  },
  inputs: [arrInput],
  defaults: { arr: '34 8 64 51 32 21' },
  presets: [
    { name: m('Slide 8 example', 'Slayt 8 örneği'), values: { arr: '34 8 64 51 32 21' } },
    { name: m('Already sorted (best case)', 'Zaten sıralı (en iyi durum)'), values: { arr: '1 2 3 4 5 6 7' } },
    { name: m('Reverse sorted (worst case)', 'Ters sıralı (en kötü durum)'), values: { arr: '7 6 5 4 3 2 1' } },
    { name: m('Almost sorted', 'Neredeyse sıralı'), values: { arr: '2 1 4 3 6 5' } },
  ],
  random: randomArr(8),
  run(input) {
    const t = new Tracer(code);
    const a: (Tok | null)[] = toks(parseList(input.arr, { min: 1, max: 14 }));
    const n = a.length;
    const F = (at: number, tok: Tok | null) => ({ label: 'tmp', tok, at });
    t.snap('sig', m(`Start with ${show(a)}. a[0] alone is a sorted part.`, `${show(a)} ile başla. a[0] tek başına sıralı bir parça.`), A(a, { float: F(0, null), ranges: [sortedR(0, 0)] }));
    for (let p = 1; p < n; p++) {
      t.set({ p, tmp: undefined, j: undefined });
      t.snap(
        'outer',
        m(`Pass p = ${p}: a[0..${p - 1}] is sorted. Now insert a[${p}] = ${a[p]!.v}.`, `p = ${p}. tur: a[0..${p - 1}] sıralı. Şimdi a[${p}] = ${a[p]!.v} yerleştirilecek.`),
        A(a, { float: F(p, null), ranges: [sortedR(0, p - 1)], ptrs: [{ name: 'p', idx: p }], marks: [{ idx: p, role: 'active' }] }),
      );
      const tmp = a[p]!;
      a[p] = null;
      t.count('moves');
      t.set({ tmp: tmp.v });
      t.snap('tmp', m(`tmp = ${tmp.v}. Position ${p} is now a hole.`, `tmp = ${tmp.v}. ${p}. konum artık bir boşluk (hole).`), A(a, { float: F(p, tmp), ranges: [sortedR(0, p - 1)], ptrs: [{ name: 'p', idx: p }] }));
      let j = p;
      for (;;) {
        t.set({ j });
        const go = j > 0 && tmp.v < a[j - 1]!.v;
        if (j > 0) t.count('cmp');
        const msg =
          j === 0
            ? m('j = 0: we reached the front. Stop.', 'j = 0: başa geldik. Dur.')
            : go
              ? m(`j = ${j}: is ${tmp.v} < a[${j - 1}] = ${a[j - 1]!.v}? Yes → shift it right.`, `j = ${j}: ${tmp.v} < a[${j - 1}] = ${a[j - 1]!.v} mi? Evet → onu sağa kaydır.`)
              : m(`j = ${j}: is ${tmp.v} < a[${j - 1}] = ${a[j - 1]!.v}? No → the hole is the right place. Stop.`, `j = ${j}: ${tmp.v} < a[${j - 1}] = ${a[j - 1]!.v} mi? Hayır → boşluk doğru yer. Dur.`);
        t.snap('inner', msg, A(a, { float: F(j, tmp), ranges: [sortedR(0, p - 1)], ptrs: [{ name: 'j', idx: j }, { name: 'p', idx: p }], marks: j > 0 ? [{ idx: j - 1, role: 'cmp' }] : [] }));
        if (!go) break;
        a[j] = a[j - 1];
        a[j - 1] = null;
        t.count('moves');
        t.snap(
          'shift',
          m(`a[${j}] = a[${j - 1}]: ${a[j]!.v} moves right, the hole moves to ${j - 1}.`, `a[${j}] = a[${j - 1}]: ${a[j]!.v} sağa kayar, boşluk ${j - 1}'e geçer.`),
          A(a, { float: F(j - 1, tmp), ranges: [sortedR(0, p - 1)], ptrs: [{ name: 'j', idx: j }, { name: 'p', idx: p }], marks: [{ idx: j, role: 'move' }] }),
        );
        j--;
      }
      a[j] = tmp;
      t.count('moves');
      t.snap('place', m(`a[${j}] = tmp = ${tmp.v}. Now a[0..${p}] is sorted: ${show(a.slice(0, p + 1))}.`, `a[${j}] = tmp = ${tmp.v}. Artık a[0..${p}] sıralı: ${show(a.slice(0, p + 1))}.`), A(a, { float: F(j, null), ranges: [sortedR(0, p)], ptrs: [{ name: 'j', idx: j }], marks: [{ idx: j, role: 'write' }] }));
    }
    t.set({ p: undefined, j: undefined, tmp: undefined });
    t.snap('end', m(`Sorted: ${show(a)}. Number of shifts = number of inversions.`, `Sıralandı: ${show(a)}. Kaydırma sayısı = inversion sayısı.`), A(a, { float: F(0, null), ranges: [sortedR(0, n - 1)] }));
    return t.steps;
  },
  concept: [
    m('The left part a[0..p-1] is always sorted. Each pass inserts one more element into it.', 'Sol kısım a[0..p-1] hep sıralıdır. Her tur ona bir eleman daha ekler.'),
    m('Elements are shifted, not swapped: tmp waits in a variable, bigger elements slide right, then tmp drops into the hole.', 'Elemanlar swap edilmez, kaydırılır: tmp bir değişkende bekler, büyükler sağa kayar, sonra tmp boşluğa düşer.'),
    m('Running time is O(N + I), where I is the number of inversions. Few inversions → fast.', 'Çalışma süresi O(N + I), I = inversion sayısı. Az inversion → hızlı.'),
  ],
  complexity: [
    { op: m('Sort', 'Sıralama'), best: 'O(N)', avg: 'O(N²)', worst: 'O(N²)' },
    { op: m('Comparisons (worst)', 'Karşılaştırma (en kötü)'), worst: 'N(N−1)/2' },
    { op: m('Extra memory', 'Ekstra bellek'), best: 'O(1)', avg: 'O(1)', worst: 'O(1)' },
  ],
  pitfalls: [
    m('"Insertion sort is always slow" is wrong: on almost sorted input it is close to O(N).', '"Insertion sort hep yavaştır" yanlış: neredeyse sıralı dizide O(N)\'e yakındır.'),
    m('Best case = already sorted (N−1 comparisons). Worst case = reverse sorted.', 'En iyi durum = zaten sıralı (N−1 karşılaştırma). En kötü durum = ters sıralı.'),
    m('The loop starts at p = 1, not 0.', 'Döngü p = 0\'dan değil p = 1\'den başlar.'),
  ],
  blanks: [
    { label: 'outer', text: 'p = 1', hint: m('Where does the first pass start? One element alone is already sorted.', 'İlk tur nereden başlar? Tek eleman zaten sıralı.') },
    { label: 'tmp', text: 'a[p]', hint: m('Which element are we inserting in this pass?', 'Bu turda hangi elemanı yerleştiriyoruz?') },
    { label: 'inner', text: 'tmp < a[j - 1]', accept: ['a[j-1] > tmp', 'a[j - 1] > tmp'], hint: m('Keep walking left while the left neighbour is bigger than tmp.', 'Soldaki komşu tmp\'den büyük olduğu sürece sola yürü.') },
    { label: 'shift', text: 'a[j] = a[j - 1]', hint: m('Shift the left neighbour one step right.', 'Soldaki komşuyu bir sağa kaydır.') },
    { label: 'place', text: 'a[j] = tmp', hint: m('Put the saved value into the hole.', 'Kaydedilen değeri boşluğa koy.') },
  ],
};
