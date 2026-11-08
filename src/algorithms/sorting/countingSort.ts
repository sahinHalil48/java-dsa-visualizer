import { m } from '../../i18n';
import { java, parseList, parseNum, randomList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm, ArrayState, Tok } from '../../types';
import { show, sortedR, toks } from './common';

const code = java(`
public static void countingSort(int[] a, int M) {     //@sig
    int[] count = new int[M];                          //@alloc
    for (int i = 0; i < a.length; i++)                 //@loop1
        count[a[i]]++;                                 //@inc
    int k = 0;                                         //@k
    for (int v = 0; v < M; v++)                        //@loop2
        for (int c = 0; c < count[v]; c++)             //@loop3
            a[k++] = v;                                //@write
}                                                      //@end
`);

export const countingSort: Algorithm = {
  id: 'counting-sort',
  category: 'sorting',
  name: m('Counting (Bucket) Sort', 'Counting (Bucket) Sort'),
  summary: m('For small non-negative integers: count how many times each value occurs, then write the values back in order. No comparisons at all.', 'Küçük, negatif olmayan tam sayılar için: her değerin kaç kez geçtiğini say, sonra değerleri sırayla geri yaz. Hiç karşılaştırma yok.'),
  code,
  notes: {
    sig: m('Assumes every element is an integer in 0..M−1.', 'Her elemanın 0..M−1 arasında bir tam sayı olduğunu varsayar.'),
    alloc: m('M empty buckets (counters), all 0.', 'M tane boş kova (sayaç), hepsi 0.'),
    loop1: m('Read the input once: O(N).', 'Girdiyi bir kez oku: O(N).'),
    inc: m('The VALUE is used as an INDEX. This is why the Ω(N log N) comparison lower bound does not apply.', 'DEĞER, INDEX olarak kullanılıyor. Ω(N log N) karşılaştırma alt sınırının burada geçerli olmamasının sebebi bu.'),
    k: m('k is the next position to write in a.', 'k, a\'da yazılacak sıradaki konum.'),
    loop2: m('Scan all M buckets in increasing order: O(M).', 'Bütün M kovayı artan sırada tara: O(M).'),
    loop3: m('Write value v count[v] times.', 'v değerini count[v] kez yaz.'),
    write: m('Output in sorted order.', 'Sıralı çıktı.'),
    end: m('Total O(M + N). Great when M = O(N), useless when M is huge.', 'Toplam O(M + N). M = O(N) ise harika, M çok büyükse işe yaramaz.'),
  },
  inputs: [
    { key: 'arr', label: m('Array (0 ≤ value < M)', 'Dizi (0 ≤ değer < M)'), type: 'list' },
    { key: 'M', label: m('M (number of buckets)', 'M (kova sayısı)'), type: 'number' },
  ],
  defaults: { arr: '5 2 8 2 0 6', M: '9' },
  presets: [
    { name: m('Exercise from the notes', 'Notlardaki alıştırma'), values: { arr: '5 2 8 2 0 6', M: '9' } },
    { name: m('Example from the notes', 'Notlardaki örnek'), values: { arr: '3 1 4 1 5 2', M: '6' } },
  ],
  random: () => ({ arr: randomList(8, 0, 9, false).join(' '), M: '10' }),
  run(input) {
    const M = parseNum(input.M, 1, 14, 'M');
    const vals = parseList(input.arr, { min: 1, max: 12, lo: 0, hi: M - 1 });
    const t = new Tracer(code);
    const a: (Tok | null)[] = toks(vals);
    let nextId = 1000;
    const count: Tok[] = Array.from({ length: M }, () => ({ id: nextId++, v: 0 }));
    const S = (extra: Partial<ArrayState> = {}): ArrayState => ({ kind: 'array', cells: a.slice(), aux: { label: 'count', cells: count.map((c) => ({ ...c })) }, ptrs: [], marks: [], ranges: [], ...extra });
    t.snap('sig', m(`Input ${show(a)}, values in 0..${M - 1}.`, `Girdi ${show(a)}, değerler 0..${M - 1} arasında.`), S());
    t.snap('alloc', m(`count = new int[${M}], all zeros.`, `count = new int[${M}], hepsi sıfır.`), S());
    for (let i = 0; i < a.length; i++) {
      const v = a[i]!.v;
      t.set({ i });
      t.snap('loop1', m(`i = ${i}: a[${i}] = ${v}.`, `i = ${i}: a[${i}] = ${v}.`), S({ ptrs: [{ name: 'i', idx: i }], marks: [{ idx: i, role: 'active' }] }));
      count[v] = { id: count[v].id, v: count[v].v + 1 };
      t.snap('inc', m(`count[${v}]++ → ${count[v].v}. No comparison, just indexing.`, `count[${v}]++ → ${count[v].v}. Karşılaştırma yok, sadece index.`), S({ ptrs: [{ name: 'i', idx: i }, { name: 'a[i]', idx: v, row: 'aux' }], marks: [{ idx: i, role: 'active' }, { idx: v, role: 'write', row: 'aux' }] }));
    }
    // a is overwritten from now on: show it empty so the writes are visible
    for (let i = 0; i < a.length; i++) a[i] = null;
    let k = 0;
    t.set({ i: undefined, k });
    t.snap('k', m('Counting is done. Now overwrite a from the left (k = 0).', 'Sayma bitti. Şimdi a\'yı soldan itibaren üzerine yaz (k = 0).'), S({ ptrs: [{ name: 'k', idx: 0 }] }));
    let id = 500;
    for (let v = 0; v < M; v++) {
      t.set({ v, c: undefined });
      t.snap('loop2', m(`v = ${v}: count[${v}] = ${count[v].v}.`, `v = ${v}: count[${v}] = ${count[v].v}.`), S({ ptrs: [{ name: 'k', idx: k }, { name: 'v', idx: v, row: 'aux' }], marks: [{ idx: v, role: 'cmp', row: 'aux' }] }));
      for (let c = 0; c < count[v].v; c++) {
        t.set({ c });
        a[k] = { id: id++, v };
        t.count('moves');
        k++;
        t.set({ k });
        t.snap('write', m(`a[${k - 1}] = ${v}.`, `a[${k - 1}] = ${v}.`), S({ ptrs: [{ name: 'k', idx: k }, { name: 'v', idx: v, row: 'aux' }], marks: [{ idx: k - 1, role: 'write' }, { idx: v, role: 'cmp', row: 'aux' }], ranges: [sortedR(0, k - 1)] }));
      }
    }
    t.set({ v: undefined, c: undefined, k: undefined });
    t.snap('end', m(`Sorted: ${show(a)}.`, `Sıralandı: ${show(a)}.`), S({ ranges: [sortedR(0, a.length - 1)] }));
    return t.steps;
  },
  concept: [
    m('Works only when keys are small integers (or can be mapped to them).', 'Sadece anahtarlar küçük tam sayılarsa (ya da onlara çevrilebiliyorsa) çalışır.'),
    m('No comparisons: values are used directly as array indexes.', 'Karşılaştırma yok: değerler doğrudan dizi index\'i olarak kullanılır.'),
    m('General bucket sort: split a range into buckets, sort each bucket, concatenate. Average O(N) for uniform data, worst O(N²).', 'Genel bucket sort: aralığı kovalara böl, her kovayı sırala, birleştir. Düzgün dağılımda ortalama O(N), en kötü O(N²).'),
  ],
  complexity: [
    { op: m('Sort', 'Sıralama'), best: 'O(M + N)', avg: 'O(M + N)', worst: 'O(M + N)' },
    { op: m('Extra memory', 'Ekstra bellek'), worst: 'O(M)' },
  ],
  pitfalls: [
    m('The Ω(N log N) bound is only for comparison sorts. Counting sort is not one.', 'Ω(N log N) sınırı sadece karşılaştırmalı sıralamalar için. Counting sort öyle değil.'),
    m('If M is much bigger than N (e.g. values up to 10⁹), scanning the count array dominates.', 'M, N\'den çok büyükse (örn. değerler 10⁹\'a kadar) count dizisini taramak baskın olur.'),
  ],
  blanks: [
    { label: 'alloc', text: 'new int[M]', hint: m('One counter per possible value.', 'Her olası değer için bir sayaç.') },
    { label: 'inc', text: 'count[a[i]]++', hint: m('Use the value as the index.', 'Değeri index olarak kullan.') },
    { label: 'loop3', text: 'c < count[v]', hint: m('How many times must v be written?', 'v kaç kez yazılmalı?') },
    { label: 'write', text: 'a[k++] = v', hint: m('Write v and move to the next position.', 'v\'yi yaz ve sonraki konuma geç.') },
  ],
};
