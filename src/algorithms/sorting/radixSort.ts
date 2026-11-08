import { m } from '../../i18n';
import { java, parseList, randomList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm, BucketState, Tok } from '../../types';
import { show, toks } from './common';

const code = java(`
public static void radixSort(int[] a, int digits) {               //@sig
    List<List<Integer>> buckets = new ArrayList<>();
    for (int b = 0; b < 10; b++) buckets.add(new ArrayList<>());   //@alloc
    int place = 1;
    for (int d = 0; d < digits; d++, place *= 10) {                //@pass
        for (int x : a)                                            //@scan
            buckets.get((x / place) % 10).add(x);                  //@drop
        int k = 0;                                                 //@k
        for (List<Integer> bucket : buckets) {                     //@collect
            for (int x : bucket)
                a[k++] = x;                                        //@take
            bucket.clear();
        }
    }
}                                                                  //@end
`);

export const radixSort: Algorithm = {
  id: 'radix-sort',
  category: 'sorting',
  name: m('Radix Sort', 'Radix Sort'),
  summary: m('Sort digit by digit, starting from the least significant digit, with a stable bucket sort in each pass.', 'Basamak basamak sırala: en sağdaki (en az anlamlı) basamaktan başla, her turda stable bir bucket sort kullan.'),
  code,
  notes: {
    sig: m('digits = number of decimal digits of the largest key.', 'digits = en büyük anahtarın basamak sayısı.'),
    alloc: m('10 buckets, one per digit 0..9 (k = 10).', '10 kova, her basamak değeri (0..9) için bir tane (k = 10).'),
    pass: m('One pass per digit, from the right (ones) to the left. place = 1, 10, 100, …', 'Her basamak için bir tur, sağdan (birler) sola. place = 1, 10, 100, …'),
    scan: m('Visit the elements in their CURRENT order.', 'Elemanları ŞU ANKİ sıralarıyla gez.'),
    drop: m('Put x at the END of the bucket of its current digit. Appending at the end keeps equal digits in their previous order: this is what makes it stable.', 'x\'i şu anki basamağının kovasının SONUNA koy. Sona eklemek eşit basamaklıların önceki sırasını korur: stable olmasını sağlayan bu.'),
    k: m('Write back into a from the left.', 'a\'ya soldan itibaren geri yaz.'),
    collect: m('Empty the buckets in order 0, 1, …, 9.', 'Kovaları 0, 1, …, 9 sırasıyla boşalt.'),
    take: m('Each bucket is emptied front to back.', 'Her kova baştan sona boşaltılır.'),
    end: m('After the last digit the array is sorted. Θ(d(N + k)).', 'Son basamaktan sonra dizi sıralı. Θ(d(N + k)).'),
  },
  inputs: [{ key: 'arr', label: m('Array (0..999)', 'Dizi (0..999)'), type: 'list' }],
  defaults: { arr: '64 8 216 512 27 729 0 1 343 125' },
  presets: [
    { name: m('Slide 63 example', 'Slayt 63 örneği'), values: { arr: '64 8 216 512 27 729 0 1 343 125' } },
    { name: m('Exercise from the notes', 'Notlardaki alıştırma'), values: { arr: '170 45 75 90 802 24 2 66' } },
  ],
  random: () => ({ arr: randomList(9, 0, 999).join(' ') }),
  run(input) {
    const vals = parseList(input.arr, { min: 1, max: 12, lo: 0, hi: 999 });
    const digits = Math.max(1, ...vals.map((v) => String(v).length));
    const t = new Tracer(code);
    const a: (Tok | null)[] = toks(vals);
    const buckets: Tok[][] = Array.from({ length: 10 }, () => []);
    let place = 1;
    const S = (extra: Partial<BucketState> = {}): BucketState => ({ kind: 'buckets', cells: a.slice(), buckets: buckets.map((b) => b.slice()), place, digits, marks: [], ...extra });
    t.set({ digits });
    t.snap('sig', m(`Input ${show(a)}. The largest key has ${digits} digit(s).`, `Girdi ${show(a)}. En büyük anahtar ${digits} basamaklı.`), S());
    t.snap('alloc', m('Create 10 empty buckets.', '10 boş kova oluştur.'), S());
    for (let d = 0; d < digits; d++, place *= 10) {
      const name = [m('ones', 'birler'), m('tens', 'onlar'), m('hundreds', 'yüzler')][d] ?? m(`10^${d}`, `10^${d}`);
      t.set({ d, place, k: undefined });
      t.snap('pass', m(`Pass ${d + 1}: sort by the ${name.en} digit (place = ${place}).`, `${d + 1}. tur: ${name.tr} basamağına göre sırala (place = ${place}).`), S());
      for (let i = 0; i < a.length; i++) {
        const x = a[i]!;
        const dig = Math.floor(x.v / place) % 10;
        t.set({ x: x.v });
        t.snap('scan', m(`x = ${x.v}: digit = (${x.v} / ${place}) % 10 = ${dig}.`, `x = ${x.v}: basamak = (${x.v} / ${place}) % 10 = ${dig}.`), S({ marks: [{ idx: i, role: 'active' }], activeBucket: dig }));
        buckets[dig].push(x);
        a[i] = null;
        t.count('moves');
        t.snap('drop', m(`${x.v} goes to the end of bucket ${dig}.`, `${x.v}, ${dig}. kovanın sonuna gider.`), S({ activeBucket: dig }));
      }
      let k = 0;
      t.set({ x: undefined, k });
      t.snap('k', m('All elements are in buckets. Collect them in bucket order.', 'Bütün elemanlar kovalarda. Kova sırasıyla topla.'), S());
      for (let b = 0; b < 10; b++) {
        if (!buckets[b].length) continue;
        t.snap('collect', m(`Bucket ${b}: ${show(buckets[b])}.`, `${b}. kova: ${show(buckets[b])}.`), S({ activeBucket: b }));
        while (buckets[b].length) {
          a[k] = buckets[b].shift()!;
          k++;
          t.count('moves');
          t.set({ k });
          t.snap('take', m(`a[${k - 1}] = ${a[k - 1]!.v}.`, `a[${k - 1}] = ${a[k - 1]!.v}.`), S({ activeBucket: b, marks: [{ idx: k - 1, role: 'write' }] }));
        }
      }
      t.snap('pass', m(`After the ${name.en} pass: ${show(a)}.`, `${name.tr} turundan sonra: ${show(a)}.`), S());
    }
    place /= 10;
    t.set({ d: undefined, k: undefined });
    t.snap('end', m(`Sorted: ${show(a)}.`, `Sıralandı: ${show(a)}.`), S());
    return t.steps;
  },
  concept: [
    m('LSD radix sort: least significant digit first, a stable bucket sort per digit.', 'LSD radix sort: önce en az anlamlı basamak, her basamakta stable bucket sort.'),
    m('Stable sort: equal keys keep their relative order. Without it, earlier passes would be lost.', 'Stable sıralama: eşit anahtarlar göreli sıralarını korur. O olmazsa önceki turların bilgisi kaybolur.'),
    m('Θ(d(N + k)): d digits, k possible digit values. Θ(N) when d is constant and k = O(N).', 'Θ(d(N + k)): d basamak, k olası basamak değeri. d sabit ve k = O(N) ise Θ(N).'),
  ],
  complexity: [{ op: m('Sort', 'Sıralama'), best: 'Θ(d(N+k))', avg: 'Θ(d(N+k))', worst: 'Θ(d(N+k))' }],
  pitfalls: [
    m('Start from the RIGHTMOST digit. Starting from the left (Hollerith) needs many sub-piles.', 'EN SAĞDAKİ basamaktan başla. Soldan başlamak (Hollerith) çok sayıda alt yığın gerektirir.'),
    m('In the last pass many keys share the same digit; only stability keeps them in the right order.', 'Son turda birçok anahtarın basamağı aynı; onları doğru sırada tutan tek şey stable olması.'),
  ],
  blanks: [
    { label: 'drop', text: '(x / place) % 10', hint: m('Extract the current digit of x.', 'x\'in şu anki basamağını çıkar.') },
    { label: 'pass', text: 'place *= 10', hint: m('Move to the next digit to the left.', 'Soldaki bir sonraki basamağa geç.') },
    { label: 'take', text: 'a[k++] = x', hint: m('Write the element back and advance.', 'Elemanı geri yaz ve ilerle.') },
  ],
};
