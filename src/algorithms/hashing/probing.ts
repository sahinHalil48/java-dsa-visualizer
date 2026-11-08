import { m } from '../../i18n';
import { java, parseList, parseNum } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm, HashState, T, Tok } from '../../types';

type Kind = 'linear' | 'quadratic' | 'double';

const F: Record<Kind, string> = {
  linear: `
private int f(int i, int x) {                        //@fsig
    return i;                    // linear probing   //@f
}`,
  quadratic: `
private int f(int i, int x) {                        //@fsig
    return i * i;                // quadratic probing //@f
}`,
  double: `
private int f(int i, int x) {                        //@fsig
    return i * hash2(x);         // double hashing   //@f
}

private int hash2(int x) {                           //@h2sig
    return R - (x % R);          // R: prime < M     //@h2
}`,
};

const base = `
public void insert(int x) {                          //@sig
    int currentPos = findPos(x);                     //@find
    if (array[currentPos] != null)                   //@active
        return;                  // already there
    array[currentPos] = x;                           //@put
    currentSize++;                                   //@size
}

private int findPos(int x) {                         //@psig
    int i = 0;
    int home = myhash(x);        // x % M            //@home
    int currentPos = home;
    while (array[currentPos] != null &&
           array[currentPos] != x) {                 //@probe
        i++;                                         //@inc
        currentPos = (home + f(i, x)) % array.length;  //@next
    }
    return currentPos;                               //@ret
}
`;

const commonNotes: Record<string, T> = {
  sig: m('Insert x into an open-addressing table: everything lives in the array itself, no lists.', 'x\'i açık adresleme tablosuna ekle: her şey dizinin içinde, liste yok.'),
  find: m('Find either x or the first empty slot on x\'s probe sequence.', 'x\'i ya da x\'in deneme dizisindeki ilk boş hücreyi bul.'),
  active: m('If the slot is not empty, it must already contain x: nothing to do.', 'Hücre boş değilse zaten x\'i içeriyor: yapılacak bir şey yok.'),
  put: m('Store x in the free slot.', 'x\'i boş hücreye koy.'),
  size: m('One more key. Probing works well only while λ is small (≤ 0.5).', 'Bir anahtar daha. Probing sadece λ küçükken (≤ 0.5) iyi çalışır.'),
  psig: m('Probe h(x)+f(0), h(x)+f(1), h(x)+f(2), … (mod M) until a free slot or x is found.', 'h(x)+f(0), h(x)+f(1), h(x)+f(2), … (mod M) hücrelerini boş hücre ya da x bulunana kadar dene.'),
  home: m('Probe 0 is the home slot h(x) = x mod M.', '0. deneme ev hücresi: h(x) = x mod M.'),
  probe: m('Slot taken by another key: a collision. Keep probing.', 'Hücre başka bir anahtarla dolu: çakışma. Denemeye devam et.'),
  inc: m('Next probe number.', 'Sonraki deneme numarası.'),
  next: m('i-th probe: (h(x) + f(i)) mod M.', 'i. deneme: (h(x) + f(i)) mod M.'),
  ret: m('Either an empty slot or the slot that holds x.', 'Ya boş bir hücre ya da x\'i tutan hücre.'),
  fsig: m('The collision resolution strategy: f(0) = 0.', 'Çakışma çözme stratejisi: f(0) = 0.'),
};

const notesFor: Record<Kind, Record<string, T>> = {
  linear: { f: m('Linear probing: f(i) = i. Try the next slot, then the next… Causes primary clustering: occupied runs grow and get hit more often.', 'Linear probing: f(i) = i. Bir sonraki hücreyi dene, sonra bir sonrakini… Primary clustering\'e yol açar: dolu bloklar büyür ve daha sık vurulur.') },
  quadratic: { f: m('Quadratic probing: f(i) = i². Jumps 1, 4, 9, … away. No primary clustering. If M is prime and λ ≤ 0.5, a free slot is always found.', 'Quadratic probing: f(i) = i². 1, 4, 9, … uzağa zıplar. Primary clustering yok. M asal ve λ ≤ 0.5 ise boş hücre her zaman bulunur.') },
  double: {
    f: m('Double hashing: f(i) = i · hash2(x). The step size depends on the key, so keys with the same home slot follow different paths.', 'Double hashing: f(i) = i · hash2(x). Adım boyu anahtara bağlı, aynı ev hücresine düşen anahtarlar farklı yollar izler.'),
    h2sig: m('Second hash function.', 'İkinci hash fonksiyonu.'),
    h2: m('hash2(x) = R − (x mod R) is never 0, so we always move.', 'hash2(x) = R − (x mod R) asla 0 olmaz, her zaman ilerleriz.'),
  },
};

function make(kind: Kind): Algorithm {
  const code = java(base + F[kind]);
  const name = { linear: m('Linear probing', 'Linear probing'), quadratic: m('Quadratic probing', 'Quadratic probing'), double: m('Double hashing', 'Double hashing') }[kind];
  const fStr = { linear: 'i', quadratic: 'i * i', double: 'i * hash2(x)' }[kind];
  return {
    id: 'hash-' + kind,
    category: 'hashing',
    name,
    summary: {
      linear: m('Open addressing: on a collision, try the next slot, then the next one, and so on.', 'Açık adresleme: çakışmada bir sonraki hücreyi dene, sonra bir sonrakini, böyle devam.'),
      quadratic: m('Open addressing: on a collision, try slots 1, 4, 9, 16, … away from the home slot.', 'Açık adresleme: çakışmada ev hücresinden 1, 4, 9, 16, … uzaktaki hücreleri dene.'),
      double: m('Open addressing: on a collision, step by hash2(x), a key-dependent distance.', 'Açık adresleme: çakışmada hash2(x) kadar, anahtara bağlı bir mesafe ilerle.'),
    }[kind],
    code,
    notes: { ...commonNotes, ...notesFor[kind] },
    inputs: [
      { key: 'M', label: m('Table size M', 'Tablo boyutu M'), type: 'number' },
      { key: 'keys', label: m('Keys to insert', 'Eklenecek anahtarlar'), type: 'list' },
      ...(kind === 'double' ? [{ key: 'R', label: m('R for hash2', 'hash2 için R'), type: 'number' as const }] : []),
    ],
    defaults: { M: '10', keys: '89 18 49 58 69', ...(kind === 'double' ? { R: '7' } : {}) },
    presets: [
      { name: m('Slide example (89 18 49 58 69)', 'Slayt örneği (89 18 49 58 69)'), values: { M: '10', keys: '89 18 49 58 69', R: '7' } },
      { name: m('Clustering', 'Kümelenme'), values: { M: '11', keys: '22 33 44 11 1 2 3', R: '7' } },
      ...(kind === 'quadratic' ? [{ name: m('Table too full (λ > 0.5)', 'Tablo çok dolu (λ > 0.5)'), values: { M: '8', keys: '0 8 16 24 32 40' } }] : []),
    ],
    run(input) {
      const M = parseNum(input.M, 2, 13, 'M');
      const keys = parseList(input.keys, { min: 1, max: 13, lo: 0, hi: 999 });
      const R = kind === 'double' ? parseNum(input.R ?? '7', 1, 97, 'R') : 0;
      const t = new Tracer(code);
      const slots: (Tok | null)[] = new Array(M).fill(null);
      let size = 0;
      let id = 1;
      const S = (extra: Partial<HashState> = {}): HashState => ({ kind: 'hash', mode: 'probe', slots: slots.slice(), chains: [], marks: [], size, ...extra });
      t.snap('sig', m(`Empty table, M = ${M}. f(i) = ${fStr}.`, `Boş tablo, M = ${M}. f(i) = ${fStr}.`), S());
      for (const x of keys) {
        const tok = { id: id++, v: x };
        t.stack = [`insert(${x})`, `findPos(${x})`];
        const home = x % M;
        const h2 = kind === 'double' ? R - (x % R) : 0;
        const probe = [home];
        let i = 0;
        let pos = home;
        t.set({ x, i, home, currentPos: pos, ...(kind === 'double' ? { 'hash2(x)': h2 } : {}) });
        const calc0 = `h(${x}) = ${x} % ${M} = ${home}` + (kind === 'double' ? `,  hash2 = ${R} − ${x} % ${R} = ${h2}` : '');
        t.snap('home', m(`home = ${x} % ${M} = ${home}.`, `home = ${x} % ${M} = ${home}.`), S({ calc: calc0, probe: probe.slice(), incoming: { tok, at: pos }, marks: [{ idx: pos, role: 'path' }] }));
        let failed = false;
        for (;;) {
          t.count('probes');
          const occ = slots[pos];
          if (occ == null) {
            t.snap('probe', m(`Slot ${pos} is empty.`, `${pos}. hücre boş.`), S({ calc: calc0, probe: probe.slice(), incoming: { tok, at: pos }, marks: [{ idx: pos, role: 'write' }] }));
            break;
          }
          if (occ.v === x) {
            t.snap('probe', m(`Slot ${pos} already holds ${x}.`, `${pos}. hücrede zaten ${x} var.`), S({ calc: calc0, probe: probe.slice(), incoming: { tok, at: pos }, marks: [{ idx: pos, role: 'found' }] }));
            break;
          }
          t.snap('probe', m(`Collision: slot ${pos} holds ${occ.v}.`, `Çakışma: ${pos}. hücrede ${occ.v} var.`), S({ calc: calc0, probe: probe.slice(), incoming: { tok, at: pos }, marks: [{ idx: pos, role: 'bad' }] }));
          if (i + 1 >= M) {
            failed = true;
            t.snap('probe', m(`Tried ${M} probes without finding a free slot. ${kind === 'quadratic' ? 'Quadratic probing can fail when the table is more than half full.' : 'The table is full.'} A real table would rehash (double M) before this.`, `${M} deneme yapıldı, boş hücre bulunamadı. ${kind === 'quadratic' ? 'Quadratic probing, tablo yarıdan fazla doluyken başarısız olabilir.' : 'Tablo dolu.'} Gerçek bir tablo bundan önce rehash yapardı (M'i ikiye katla).`), S({ calc: calc0, probe: probe.slice(), marks: probe.map((p) => ({ idx: p, role: 'bad' as const })) }));
            break;
          }
          i++;
          t.set({ i });
          t.snap('inc', m(`i = ${i}.`, `i = ${i}.`), S({ calc: calc0, probe: probe.slice(), incoming: { tok, at: pos } }));
          const fi = kind === 'linear' ? i : kind === 'quadratic' ? i * i : i * h2;
          pos = (home + fi) % M;
          probe.push(pos);
          t.set({ currentPos: pos });
          const calc = `probe ${i}: (${home} + f(${i})) % ${M} = (${home} + ${fi}) % ${M} = ${pos}`;
          t.snap('f', m(`f(${i}) = ${kind === 'linear' ? i : kind === 'quadratic' ? `${i}² = ${fi}` : `${i} · ${h2} = ${fi}`}.`, `f(${i}) = ${kind === 'linear' ? i : kind === 'quadratic' ? `${i}² = ${fi}` : `${i} · ${h2} = ${fi}`}.`), S({ calc, probe: probe.slice(0, -1), incoming: { tok, at: probe[probe.length - 2] } }));
          t.snap('next', m(`currentPos = (${home} + ${fi}) % ${M} = ${pos}.`, `currentPos = (${home} + ${fi}) % ${M} = ${pos}.`), S({ calc, probe: probe.slice(), incoming: { tok, at: pos }, marks: [{ idx: pos, role: 'path' }] }));
        }
        if (failed) continue;
        t.snap('ret', m(`return ${pos}.`, `return ${pos}.`), S({ calc: calc0, probe: probe.slice(), incoming: { tok, at: pos } }));
        t.stack.pop();
        if (slots[pos]) {
          t.snap('active', m(`${x} is already in the table.`, `${x} zaten tabloda.`), S({ marks: [{ idx: pos, role: 'found' }] }));
          continue;
        }
        t.snap('active', m(`Slot ${pos} is free.`, `${pos}. hücre boş.`), S({ probe: probe.slice(), incoming: { tok, at: pos } }));
        slots[pos] = tok;
        t.snap('put', m(`array[${pos}] = ${x}${probe.length > 1 ? ` after ${probe.length} probes` : ''}.`, `array[${pos}] = ${x}${probe.length > 1 ? ` (${probe.length} denemede)` : ''}.`), S({ probe: probe.slice(), marks: [{ idx: pos, role: 'write' }] }));
        size++;
        t.set({ currentSize: size });
        t.snap('size', m(`currentSize = ${size}, λ = ${(size / M).toFixed(2)}.`, `currentSize = ${size}, λ = ${(size / M).toFixed(2)}.`), S());
      }
      t.stack = [];
      t.set({ x: undefined, i: undefined, home: undefined, currentPos: undefined, 'hash2(x)': undefined });
      t.snap('sig', m(`Done. ${size} keys, λ = ${(size / M).toFixed(2)}.`, `Bitti. ${size} anahtar, λ = ${(size / M).toFixed(2)}.`), S());
      return t.steps;
    },
    concept: [
      m('Open addressing: one array, no lists. On a collision, try h(x)+f(1), h(x)+f(2), … mod M.', 'Açık adresleme: tek dizi, liste yok. Çakışmada h(x)+f(1), h(x)+f(2), … mod M dene.'),
      {
        linear: m('Linear: f(i) = i. Simple, but primary clustering makes long runs of full cells.', 'Linear: f(i) = i. Basit ama primary clustering uzun dolu bloklar oluşturur.'),
        quadratic: m('Quadratic: f(i) = i². Removes primary clustering. Needs M prime and λ ≤ 0.5 to guarantee success.', 'Quadratic: f(i) = i². Primary clustering\'i kaldırır. Başarı garantisi için M asal ve λ ≤ 0.5 olmalı.'),
        double: m('Double: f(i) = i·hash2(x), hash2(x) = R − (x mod R) with R prime < M. Different keys take different steps.', 'Double: f(i) = i·hash2(x), hash2(x) = R − (x mod R), R asal ve < M. Farklı anahtarlar farklı adımlar atar.'),
      }[kind],
      m('Removing needs lazy deletion (mark as deleted), otherwise later searches would stop too early.', 'Silme için lazy deletion gerekir (silindi diye işaretle), yoksa sonraki aramalar erken durur.'),
    ],
    complexity: [{ op: 'insert / find', best: 'O(1)', avg: 'O(1) (λ small)', worst: 'O(N)' }],
    pitfalls: [
      m('Keep λ ≤ 0.5 for probing; rehash (about double M, next prime) when it grows.', 'Probing\'de λ ≤ 0.5 tut; büyüyünce rehash yap (M\'i yaklaşık ikiye katla, sonraki asal).'),
      m('The probe position is (h(x) + f(i)) mod M, always measured from the HOME slot, not from the previous probe.', 'Deneme konumu (h(x) + f(i)) mod M, her zaman ÖNCEKİ denemeden değil, EV hücresinden ölçülür.'),
      ...(kind === 'quadratic' ? [m('Quadratic probing can fail to find a free slot when the table is more than half full.', 'Quadratic probing, tablo yarıdan fazla doluyken boş hücre bulamayabilir.')] : []),
    ],
    blanks: [
      { label: 'home', text: 'myhash(x)', hint: m('Probe 0: the home slot.', '0. deneme: ev hücresi.') },
      { label: 'probe', text: 'array[currentPos] != x', hint: m('Stop if we find x itself.', 'x\'in kendisini bulursak dur.') },
      { label: 'next', text: '(home + f(i, x)) % array.length', hint: m('The i-th probe, wrapped around the table.', 'i. deneme, tablo etrafında sarılarak.') },
      { label: 'f', text: fStr === 'i' ? 'return i' : fStr === 'i * i' ? 'return i * i' : 'return i * hash2(x)', accept: fStr === 'i * i' ? ['return i*i'] : fStr === 'i' ? [] : ['return i*hash2(x)', 'return hash2(x) * i'], hint: m(`f(i) for ${name.en.toLowerCase()}.`, `${name.tr} için f(i).`) },
      { label: 'put', text: 'array[currentPos] = x', hint: m('Store the key.', 'Anahtarı koy.') },
    ],
  };
}

export const linearProbing = make('linear');
export const quadraticProbing = make('quadratic');
export const doubleHashing = make('double');
