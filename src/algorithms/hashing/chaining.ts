import { m } from '../../i18n';
import { java, parseList, parseNum, randomList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm, HashState, Mark, Tok } from '../../types';

const code = java(`
public void insert(int x) {                          //@sig
    List<Integer> whichList = theLists[myhash(x)];   //@list
    if (!whichList.contains(x)) {                    //@contains
        whichList.add(x);                            //@add
        currentSize++;                               //@size
    }
}

private int myhash(int x) {                          //@hsig
    int hashVal = x % theLists.length;               //@mod
    if (hashVal < 0)
        hashVal += theLists.length;                  //@neg
    return hashVal;                                  //@hret
}
`);

export const chaining: Algorithm = {
  id: 'hash-chaining',
  category: 'hashing',
  name: m('Separate chaining', 'Separate chaining (zincirleme)'),
  summary: m('Each table slot holds a linked list. Keys that hash to the same slot simply join that list.', 'Tablonun her hücresi bir linked list tutar. Aynı hücreye düşen anahtarlar o listeye eklenir.'),
  code,
  notes: {
    sig: m('Insert key x (no duplicates).', 'x anahtarını ekle (tekrar yok).'),
    list: m('Compute the slot with the hash function and get the list stored there.', 'Hash fonksiyonuyla hücreyi hesapla ve oradaki listeyi al.'),
    contains: m('Walk the list to check for a duplicate. Cost = length of the list, on average λ.', 'Tekrar var mı diye listede yürü. Maliyet = liste uzunluğu, ortalama λ.'),
    add: m('Collision? No problem: just add x to the list.', 'Çakışma mı? Sorun değil: x\'i listeye ekle.'),
    size: m('One more key. Load factor λ = N / M. For chaining we keep λ ≈ 1 (rehash when it grows past that).', 'Bir anahtar daha. Doluluk oranı λ = N / M. Chaining\'de λ ≈ 1 tutulur (geçince rehash).'),
    hsig: m('Hash function: maps a key to a slot 0..M−1.', 'Hash fonksiyonu: bir anahtarı 0..M−1 arası bir hücreye eşler.'),
    mod: m('key mod table size. A prime table size spreads keys better.', 'anahtar mod tablo boyutu. Asal tablo boyutu anahtarları daha iyi dağıtır.'),
    neg: m('In Java, % can be negative for negative keys; fix it.', 'Java\'da negatif anahtarlar için % negatif olabilir; düzelt.'),
    hret: m('The slot index.', 'Hücre index\'i.'),
  },
  inputs: [
    { key: 'M', label: m('Table size M', 'Tablo boyutu M'), type: 'number' },
    { key: 'keys', label: m('Keys to insert', 'Eklenecek anahtarlar'), type: 'list' },
  ],
  defaults: { M: '10', keys: '0 81 64 49 9 36 25 16 4 1' },
  presets: [
    { name: m('Squares, M = 10 (Weiss)', 'Kareler, M = 10 (Weiss)'), values: { M: '10', keys: '0 81 64 49 9 36 25 16 4 1' } },
    { name: m('Probing example keys', 'Probing örneğinin anahtarları'), values: { M: '10', keys: '89 18 49 58 69' } },
    { name: m('Bad table size (all collide)', 'Kötü tablo boyutu (hepsi çakışır)'), values: { M: '5', keys: '10 20 30 40 15' } },
  ],
  random: () => ({ M: '7', keys: randomList(8, 0, 99).join(' ') }),
  run(input) {
    const M = parseNum(input.M, 2, 13, 'M');
    const keys = parseList(input.keys, { min: 1, max: 14, lo: -99, hi: 999 });
    const t = new Tracer(code);
    const chains: Tok[][] = Array.from({ length: M }, () => []);
    let size = 0;
    let id = 1;
    const S = (extra: Partial<HashState> = {}): HashState => ({ kind: 'hash', mode: 'chain', slots: [], chains: chains.map((c) => c.slice()), marks: [], size, ...extra });
    t.snap('sig', m(`Empty table with M = ${M} lists.`, `M = ${M} listeli boş tablo.`), S());
    for (const x of keys) {
      const tok = { id: id++, v: x };
      t.stack = [`insert(${x})`];
      t.set({ x, hashVal: undefined });
      t.stack.push(`myhash(${x})`);
      let h = x % M;
      const calc = `h(${x}) = ${x} % ${M} = ${h}`;
      t.set({ hashVal: h });
      t.snap('mod', m(`hashVal = ${x} % ${M} = ${h}.`, `hashVal = ${x} % ${M} = ${h}.`), S({ calc }));
      if (h < 0) {
        h += M;
        t.set({ hashVal: h });
        t.snap('neg', m(`Negative, add M: ${h}.`, `Negatif, M ekle: ${h}.`), S({ calc: calc + ` → ${h}` }));
      }
      t.snap('hret', m(`return ${h}.`, `return ${h}.`), S({ calc, marks: [{ idx: h, role: 'path' }] }));
      t.stack.pop();
      t.snap('list', m(`whichList = theLists[${h}] (${chains[h].length} element(s)).`, `whichList = theLists[${h}] (${chains[h].length} eleman).`), S({ calc, marks: [{ idx: h, role: 'path' }], incoming: { tok, at: h } }));
      let dup = false;
      for (let k = 0; k < chains[h].length; k++) {
        t.count('cmp');
        const same = chains[h][k].v === x;
        const mk: Mark[] = [{ idx: h, role: 'path' }, { idx: 1000 * (h + 1) + k, role: same ? 'found' : 'cmp' }];
        t.snap('contains', same ? m(`${chains[h][k].v} = ${x}: already in the list.`, `${chains[h][k].v} = ${x}: zaten listede.`) : m(`contains: ${chains[h][k].v} ≠ ${x}.`, `contains: ${chains[h][k].v} ≠ ${x}.`), S({ calc, marks: mk, incoming: { tok, at: h } }));
        if (same) {
          dup = true;
          break;
        }
      }
      if (dup) continue;
      if (!chains[h].length) t.snap('contains', m('The list is empty, so x is not there.', 'Liste boş, x orada değil.'), S({ calc, marks: [{ idx: h, role: 'path' }], incoming: { tok, at: h } }));
      chains[h].push(tok);
      t.snap('add', chains[h].length > 1 ? m(`Collision at ${h}: add ${x} to the list (now ${chains[h].length} long).`, `${h}'de çakışma: ${x} listeye eklenir (şimdi ${chains[h].length} uzunlukta).`) : m(`Add ${x} to list ${h}.`, `${x}, ${h}. listeye eklenir.`), S({ calc, marks: [{ idx: h, role: 'path' }, { idx: 1000 * (h + 1) + chains[h].length - 1, role: 'write' }] }));
      size++;
      t.set({ currentSize: size });
      t.snap('size', m(`currentSize = ${size}, λ = ${(size / M).toFixed(2)}.`, `currentSize = ${size}, λ = ${(size / M).toFixed(2)}.`), S({ calc }));
    }
    t.stack = [];
    t.set({ x: undefined, hashVal: undefined });
    const longest = Math.max(...chains.map((c) => c.length));
    t.snap('sig', m(`Done. λ = ${(size / M).toFixed(2)}, longest list = ${longest}.`, `Bitti. λ = ${(size / M).toFixed(2)}, en uzun liste = ${longest}.`), S());
    return t.steps;
  },
  concept: [
    m('Load factor λ = N / M = average list length.', 'Doluluk oranı λ = N / M = ortalama liste uzunluğu.'),
    m('Unsuccessful search ≈ λ nodes, successful search ≈ 1 + λ/2.', 'Başarısız arama ≈ λ düğüm, başarılı arama ≈ 1 + λ/2.'),
    m('Keep λ ≈ 1 and make the table size prime.', 'λ ≈ 1 tut ve tablo boyutunu asal yap.'),
  ],
  complexity: [
    { op: 'insert / find / remove', best: 'O(1)', avg: 'O(1 + λ)', worst: 'O(N)' },
  ],
  pitfalls: [
    m('Worst case: every key hashes to one slot → one long list, O(N).', 'En kötü durum: bütün anahtarlar tek hücreye düşer → tek uzun liste, O(N).'),
    m('A table size that shares factors with the keys (e.g. M = 10 for multiples of 10) causes many collisions.', 'Anahtarlarla ortak böleni olan tablo boyutu (örn. 10\'un katları için M = 10) çok çakışmaya yol açar.'),
  ],
  blanks: [
    { label: 'list', text: 'theLists[myhash(x)]', hint: m('Which list does x belong to?', 'x hangi listeye ait?') },
    { label: 'add', text: 'whichList.add(x)', hint: m('Collisions are fine: append to the list.', 'Çakışma sorun değil: listeye ekle.') },
    { label: 'mod', text: 'x % theLists.length', hint: m('Reduce the key to a slot index.', 'Anahtarı bir hücre index\'ine indir.') },
    { label: 'neg', text: 'hashVal += theLists.length', hint: m('Fix a negative remainder.', 'Negatif kalanı düzelt.') },
  ],
};
