import { m } from '../../i18n';
import { java, parseList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm, ArrayState, Ptr, Range, Tok } from '../../types';
import { arrInput, randomArr, show, sortedR, toks } from './common';

const code = java(`
public static void mergeSort(int[] a) {                         //@sig
    int[] tmp = new int[a.length];                               //@alloc
    mergeSort(a, tmp, 0, a.length - 1);                          //@first
}

private static void mergeSort(int[] a, int[] tmp, int left, int right) {  //@rsig
    if (left < right) {                                          //@base
        int center = (left + right) / 2;                         //@center
        mergeSort(a, tmp, left, center);                         //@recl
        mergeSort(a, tmp, center + 1, right);                    //@recr
        merge(a, tmp, left, center + 1, right);                  //@callmerge
    }
}

private static void merge(int[] a, int[] tmp, int leftPos, int rightPos, int rightEnd) {  //@msig
    int leftEnd = rightPos - 1;                                  //@lend
    int tmpPos = leftPos;
    int numElements = rightEnd - leftPos + 1;
    while (leftPos <= leftEnd && rightPos <= rightEnd)           //@while
        if (a[leftPos] <= a[rightPos])                           //@mcmp
            tmp[tmpPos++] = a[leftPos++];                        //@takel
        else
            tmp[tmpPos++] = a[rightPos++];                       //@taker
    while (leftPos <= leftEnd)      // copy rest of first half  //@restl
        tmp[tmpPos++] = a[leftPos++];                            //@copyl
    while (rightPos <= rightEnd)    // copy rest of second half //@restr
        tmp[tmpPos++] = a[rightPos++];                           //@copyr
    for (int i = 0; i < numElements; i++, rightEnd--)            //@back
        a[rightEnd] = tmp[rightEnd];                             //@copyback
}
`);

export const mergeSort: Algorithm = {
  id: 'merge-sort',
  category: 'sorting',
  name: m('Mergesort', 'Mergesort'),
  summary: m('Divide and conquer: split in half, sort each half recursively, then merge the two sorted halves.', 'Böl ve fethet: ikiye böl, her yarıyı recursive sırala, sonra iki sıralı yarıyı birleştir (merge).'),
  code,
  notes: {
    sig: m('Public driver method.', 'Dışarıdan çağrılan sürücü metot.'),
    alloc: m('One temporary array of size N, shared by all merges. This is the O(N) extra memory of mergesort.', 'Bütün merge\'lerin paylaştığı N boyutlu tek bir geçici dizi. Mergesort\'un O(N) ekstra belleği bu.'),
    first: m('Sort the whole range 0..N−1.', 'Bütün aralığı (0..N−1) sırala.'),
    rsig: m('Sort a[left..right].', 'a[left..right] aralığını sırala.'),
    base: m('Base case: a range with 0 or 1 element is already sorted, so nothing happens.', 'Durma koşulu: 0 ya da 1 elemanlı aralık zaten sıralı, bir şey yapılmaz.'),
    center: m('Split point. Dividing is trivial; the real work is in merge.', 'Bölme noktası. Bölmek kolay; asıl iş merge\'de.'),
    recl: m('Sort the left half first. The recursion finishes the whole left side before it touches the right side.', 'Önce sol yarıyı sırala. Recursion sağ tarafa dokunmadan önce bütün sol tarafı bitirir.'),
    recr: m('Then sort the right half.', 'Sonra sağ yarıyı sırala.'),
    callmerge: m('Both halves are sorted now; merge them.', 'İki yarı da artık sıralı; onları birleştir.'),
    msig: m('Merge the sorted runs a[leftPos..rightPos−1] and a[rightPos..rightEnd].', 'Sıralı a[leftPos..rightPos−1] ve a[rightPos..rightEnd] parçalarını birleştir.'),
    lend: m('End of the left half. tmpPos is where the next element goes in tmp.', 'Sol yarının sonu. tmpPos, tmp\'de sıradaki elemanın gideceği yer.'),
    while: m('Two fingers: continue while both halves still have elements.', 'İki parmak: iki yarıda da eleman olduğu sürece devam et.'),
    mcmp: m('Compare the two fronts. Using <= keeps equal elements in order (stable).', 'İki baştakini karşılaştır. <= kullanmak eşit elemanların sırasını korur (stable).'),
    takel: m('Left front is smaller: copy it to tmp and advance both fingers.', 'Soldaki küçük: tmp\'ye kopyala, iki parmağı da ilerlet.'),
    taker: m('Right front is smaller: copy it to tmp.', 'Sağdaki küçük: tmp\'ye kopyala.'),
    restl: m('One half is empty. Copy what is left of the first half (already sorted).', 'Bir yarı bitti. İlk yarıdan kalanları kopyala (zaten sıralı).'),
    copyl: m('Copy without comparing.', 'Karşılaştırmadan kopyala.'),
    restr: m('Copy what is left of the second half.', 'İkinci yarıdan kalanları kopyala.'),
    copyr: m('Copy without comparing.', 'Karşılaştırmadan kopyala.'),
    back: m('Copy the merged run from tmp back into a.', 'Birleşmiş parçayı tmp\'den a\'ya geri kopyala.'),
    copyback: m('So a merge of 2k elements always does 4k moves: 2k into tmp, 2k back.', 'Yani 2k elemanlık bir merge hep 4k taşıma yapar: 2k tmp\'ye, 2k geri.'),
  },
  inputs: [arrInput],
  defaults: { arr: '38 27 43 3 9 82 10' },
  presets: [
    { name: m('Slide 28 example', 'Slayt 28 örneği'), values: { arr: '38 27 43 3 9 82 10' } },
    { name: m('Slide 26 example', 'Slayt 26 örneği'), values: { arr: '8 1 4 3 2' } },
    { name: m('Exercise from the notes', 'Notlardaki alıştırma'), values: { arr: '5 2 4 7 1 3 2 6' } },
  ],
  random: randomArr(8),
  run(input) {
    const t = new Tracer(code);
    const a: (Tok | null)[] = toks(parseList(input.arr, { min: 1, max: 12 }));
    const n = a.length;
    const tmp: (Tok | null)[] = new Array(n).fill(null);
    const done: Range[] = [];
    const S = (extra: Partial<ArrayState> = {}): ArrayState => ({ kind: 'array', cells: a.slice(), aux: { label: 'tmp', cells: tmp.slice() }, ptrs: [], marks: [], ranges: [], ...extra });
    t.stack = ['mergeSort(a)'];
    t.snap('sig', m(`Start with ${show(a)}.`, `${show(a)} ile başla.`), S());
    t.snap('alloc', m(`Allocate tmp of size ${n}.`, `${n} boyutlu tmp dizisini oluştur.`), S());
    t.snap('first', m(`mergeSort(a, tmp, 0, ${n - 1})`, `mergeSort(a, tmp, 0, ${n - 1})`), S({ ranges: [{ from: 0, to: n - 1, role: 'active' }] }));

    const merge = (lp0: number, rp0: number, re0: number) => {
      let leftPos = lp0,
        rightPos = rp0,
        rightEnd = re0;
      const leftEnd = rightPos - 1;
      let tmpPos = leftPos;
      const num = rightEnd - leftPos + 1;
      t.stack.push(`merge(a, tmp, ${lp0}, ${rp0}, ${re0})`);
      const R: Range[] = [{ from: lp0, to: leftEnd, role: 'left' }, { from: rp0, to: re0, role: 'right' }];
      const P = (): Ptr[] => [
        ...(leftPos <= leftEnd ? [{ name: 'leftPos', idx: leftPos }] : []),
        ...(rightPos <= rightEnd ? [{ name: 'rightPos', idx: rightPos }] : []),
        { name: 'tmpPos', idx: tmpPos, row: 'aux' as const },
      ];
      t.set({ leftPos, rightPos, rightEnd, leftEnd, tmpPos });
      t.snap('lend', m(`Merge ${show(a.slice(lp0, rp0))} and ${show(a.slice(rp0, re0 + 1))}.`, `${show(a.slice(lp0, rp0))} ile ${show(a.slice(rp0, re0 + 1))} birleştirilecek.`), S({ ranges: R, ptrs: P() }));
      while (leftPos <= leftEnd && rightPos <= rightEnd) {
        t.count('cmp');
        const L = a[leftPos]!,
          Rt = a[rightPos]!;
        const takeLeft = L.v <= Rt.v;
        t.snap(
          'mcmp',
          takeLeft ? m(`${L.v} ≤ ${Rt.v}: take ${L.v} from the left half.`, `${L.v} ≤ ${Rt.v}: sol yarıdan ${L.v} alınır.`) : m(`${L.v} > ${Rt.v}: take ${Rt.v} from the right half.`, `${L.v} > ${Rt.v}: sağ yarıdan ${Rt.v} alınır.`),
          S({ ranges: R, ptrs: P(), marks: [{ idx: leftPos, role: 'cmp' }, { idx: rightPos, role: 'cmp' }] }),
        );
        if (takeLeft) {
          tmp[tmpPos] = L;
          a[leftPos] = null;
          tmpPos++;
          leftPos++;
          t.count('moves');
          t.set({ leftPos, tmpPos });
          t.snap('takel', m(`tmp[${tmpPos - 1}] = ${L.v}.`, `tmp[${tmpPos - 1}] = ${L.v}.`), S({ ranges: R, ptrs: P(), marks: [{ idx: tmpPos - 1, role: 'write', row: 'aux' }] }));
        } else {
          tmp[tmpPos] = Rt;
          a[rightPos] = null;
          tmpPos++;
          rightPos++;
          t.count('moves');
          t.set({ rightPos, tmpPos });
          t.snap('taker', m(`tmp[${tmpPos - 1}] = ${Rt.v}.`, `tmp[${tmpPos - 1}] = ${Rt.v}.`), S({ ranges: R, ptrs: P(), marks: [{ idx: tmpPos - 1, role: 'write', row: 'aux' }] }));
        }
      }
      t.snap('while', leftPos > leftEnd ? m('The left half is used up.', 'Sol yarı bitti.') : m('The right half is used up.', 'Sağ yarı bitti.'), S({ ranges: R, ptrs: P() }));
      if (leftPos <= leftEnd) t.snap('restl', m('Copy the rest of the left half.', 'Sol yarının kalanını kopyala.'), S({ ranges: R, ptrs: P() }));
      while (leftPos <= leftEnd) {
        tmp[tmpPos] = a[leftPos];
        a[leftPos] = null;
        tmpPos++;
        leftPos++;
        t.count('moves');
        t.set({ leftPos, tmpPos });
        t.snap('copyl', m(`tmp[${tmpPos - 1}] = ${tmp[tmpPos - 1]!.v}.`, `tmp[${tmpPos - 1}] = ${tmp[tmpPos - 1]!.v}.`), S({ ranges: R, ptrs: P(), marks: [{ idx: tmpPos - 1, role: 'write', row: 'aux' }] }));
      }
      if (rightPos <= rightEnd) t.snap('restr', m('Copy the rest of the right half.', 'Sağ yarının kalanını kopyala.'), S({ ranges: R, ptrs: P() }));
      while (rightPos <= rightEnd) {
        tmp[tmpPos] = a[rightPos];
        a[rightPos] = null;
        tmpPos++;
        rightPos++;
        t.count('moves');
        t.set({ rightPos, tmpPos });
        t.snap('copyr', m(`tmp[${tmpPos - 1}] = ${tmp[tmpPos - 1]!.v}.`, `tmp[${tmpPos - 1}] = ${tmp[tmpPos - 1]!.v}.`), S({ ranges: R, ptrs: P(), marks: [{ idx: tmpPos - 1, role: 'write', row: 'aux' }] }));
      }
      t.set({ leftPos: undefined, rightPos: undefined, tmpPos: undefined, leftEnd: undefined });
      t.snap('back', m(`tmp[${lp0}..${re0}] = ${show(tmp.slice(lp0, re0 + 1))} is sorted. Copy it back.`, `tmp[${lp0}..${re0}] = ${show(tmp.slice(lp0, re0 + 1))} sıralı. Geri kopyala.`), S({ ranges: R }));
      for (let i = 0; i < num; i++, rightEnd--) {
        a[rightEnd] = tmp[rightEnd];
        tmp[rightEnd] = null;
        t.count('moves');
        t.set({ i, rightEnd });
        t.snap('copyback', m(`a[${rightEnd}] = tmp[${rightEnd}] = ${a[rightEnd]!.v}.`, `a[${rightEnd}] = tmp[${rightEnd}] = ${a[rightEnd]!.v}.`), S({ ranges: R, ptrs: [{ name: 'rightEnd', idx: rightEnd }], marks: [{ idx: rightEnd, role: 'write' }] }));
      }
      t.set({ i: undefined, rightEnd: undefined });
      t.stack.pop();
    };

    const sort = (left: number, right: number) => {
      t.count('calls');
      t.stack.push(`mergeSort(a, tmp, ${left}, ${right})`);
      t.set({ left, right, center: undefined });
      const act: Range[] = [{ from: left, to: right, role: 'active' }];
      t.snap('base', left < right ? m(`${left} < ${right}: the range ${show(a.slice(left, right + 1))} has 2+ elements, so split it.`, `${left} < ${right}: ${show(a.slice(left, right + 1))} aralığında 2+ eleman var, böl.`) : m(`${left} = ${right}: one element, already sorted. Return.`, `${left} = ${right}: tek eleman, zaten sıralı. Geri dön.`), S({ ranges: act }));
      if (left < right) {
        const center = Math.floor((left + right) / 2);
        t.set({ center });
        t.snap('center', m(`center = (${left} + ${right}) / 2 = ${center}.`, `center = (${left} + ${right}) / 2 = ${center}.`), S({ ranges: [{ from: left, to: center, role: 'left' }, { from: center + 1, to: right, role: 'right' }] }));
        t.snap('recl', m(`Sort the left half a[${left}..${center}].`, `Sol yarıyı sırala: a[${left}..${center}].`), S({ ranges: [{ from: left, to: center, role: 'active' }] }));
        sort(left, center);
        t.set({ left, right, center });
        t.snap('recr', m(`Back in [${left}..${right}]. Now sort the right half a[${center + 1}..${right}].`, `[${left}..${right}]'e geri döndük. Şimdi sağ yarıyı sırala: a[${center + 1}..${right}].`), S({ ranges: [{ from: center + 1, to: right, role: 'active' }] }));
        sort(center + 1, right);
        t.set({ left, right, center });
        t.snap('callmerge', m(`Both halves of [${left}..${right}] are sorted. Merge them.`, `[${left}..${right}]'in iki yarısı da sıralı. Birleştir.`), S({ ranges: [{ from: left, to: center, role: 'left' }, { from: center + 1, to: right, role: 'right' }] }));
        merge(left, center + 1, right);
      }
      t.stack.pop();
    };
    sort(0, n - 1);
    t.set({ left: undefined, right: undefined, center: undefined });
    t.snap('sig', m(`Sorted: ${show(a)}.`, `Sıralandı: ${show(a)}.`), S({ ranges: [sortedR(0, n - 1), ...done] }));
    return t.steps;
  },
  concept: [
    m('Recurrence: T(N) = 2T(N/2) + N, T(1) = 1 → T(N) = N log N + N.', 'Yineleme: T(N) = 2T(N/2) + N, T(1) = 1 → T(N) = N log N + N.'),
    m('Recursion tree: log N levels, N work per level → O(N log N).', 'Recursion ağacı: log N seviye, her seviyede N iş → O(N log N).'),
    m('Merging 2×k elements: 4k moves; comparisons k (best) to 2k−1 (worst).', '2×k elemanı merge etmek: 4k taşıma; karşılaştırma k (en iyi) ile 2k−1 (en kötü) arası.'),
    m('Best choice for linked lists: only sequential access is needed.', 'Linked list için en iyi seçim: sadece sıralı erişim gerekir.'),
  ],
  complexity: [
    { op: m('Sort', 'Sıralama'), best: 'O(N log N)', avg: 'O(N log N)', worst: 'O(N log N)' },
    { op: 'merge', worst: 'O(N)' },
    { op: m('Extra memory', 'Ekstra bellek'), worst: 'O(N)' },
  ],
  pitfalls: [
    m('Not "all splits first, then all merges": the left half is completely sorted (split + merge) before the right half starts.', '"Önce bütün bölmeler, sonra bütün merge\'ler" değil: sol yarı tamamen sıralanır (böl + merge), sonra sağ yarı başlar.'),
    m('Needs an extra array of size N; heapsort and quicksort do not.', 'N boyutlu ekstra dizi gerekir; heapsort ve quicksort\'ta gerekmez.'),
    m('Telescoping: divide by N, write the equations under each other, add them, multiply by N.', 'Telescoping: N\'ye böl, denklemleri alt alta yaz, topla, N ile çarp.'),
  ],
  blanks: [
    { label: 'base', text: 'left < right', hint: m('When does the range have at least two elements?', 'Aralıkta ne zaman en az iki eleman olur?') },
    { label: 'center', text: '(left + right) / 2', hint: m('Middle of the range.', 'Aralığın ortası.') },
    { label: 'recr', text: 'center + 1', hint: m('Where does the right half start?', 'Sağ yarı nereden başlar?') },
    { label: 'mcmp', text: 'a[leftPos] <= a[rightPos]', hint: m('Take from the left when its front is not bigger (keeps it stable).', 'Soldaki baştaki büyük değilse soldan al (stable kalır).') },
    { label: 'takel', text: 'tmp[tmpPos++] = a[leftPos++]', hint: m('Copy the left front into tmp and move both fingers.', 'Soldaki baştakini tmp\'ye kopyala ve iki parmağı ilerlet.') },
    { label: 'copyback', text: 'a[rightEnd] = tmp[rightEnd]', hint: m('Copy back from tmp to a.', 'tmp\'den a\'ya geri kopyala.') },
  ],
};
