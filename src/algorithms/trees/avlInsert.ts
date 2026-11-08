import { m } from '../../i18n';
import { java, parseList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm } from '../../types';
import { ROTATIONS, TreeSim, rotationNotes } from './common';

const code = java(
  `
private AvlNode insert(int x, AvlNode t) {                   //@sig
    if (t == null)                                           //@null
        return new AvlNode(x);                               //@create
    if (x < t.element)                                       //@cmpl
        t.left = insert(x, t.left);                          //@goleft
    else if (x > t.element)                                  //@cmpr
        t.right = insert(x, t.right);                        //@goright
    return balance(t);                                       //@callbal
}

private AvlNode balance(AvlNode t) {                         //@bsig
    if (height(t.left) - height(t.right) > 1) {              //@lheavy
        if (height(t.left.left) >= height(t.left.right))     //@case1
            t = rotateWithLeftChild(t);     // case 1        //@do1
        else
            t = doubleWithLeftChild(t);     // case 2        //@do2
    } else if (height(t.right) - height(t.left) > 1) {       //@rheavy
        if (height(t.right.right) >= height(t.right.left))   //@case4
            t = rotateWithRightChild(t);    // case 4        //@do4
        else
            t = doubleWithRightChild(t);    // case 3        //@do3
    }
    t.height = Math.max(height(t.left), height(t.right)) + 1;  //@height
    return t;                                                //@bret
}
` +
    ROTATIONS +
    `

private AvlNode doubleWithLeftChild(AvlNode k3) {           //@dlsig
    k3.left = rotateWithRightChild(k3.left);                 //@dl1
    return rotateWithLeftChild(k3);                          //@dl2
}

private AvlNode doubleWithRightChild(AvlNode k1) {          //@drsig
    k1.right = rotateWithLeftChild(k1.right);                //@dr1
    return rotateWithRightChild(k1);                         //@dr2
}`,
);

export const avlInsert: Algorithm = {
  id: 'avl-insert',
  category: 'trees',
  name: m('AVL tree: insert with rotations', 'AVL ağacı: rotasyonlu insert'),
  summary: m('Insert like a BST, then on the way back up check every node: if its two subtree heights differ by more than 1, fix it with a single or double rotation.', 'BST gibi ekle, sonra geri dönerken her düğümü kontrol et: iki alt ağacının yükseklik farkı 1\'den fazlaysa tek ya da çift rotasyonla düzelt.'),
  code,
  notes: {
    sig: m('Same as BST insert, except every return goes through balance(t).', 'BST insert ile aynı, tek fark her dönüşün balance(t)\'den geçmesi.'),
    null: m('Fell off the tree.', 'Ağaçtan düştük.'),
    create: m('New leaf, height 0.', 'Yeni yaprak, yükseklik 0.'),
    cmpl: m('Go left if smaller.', 'Küçükse sola git.'),
    goleft: m('Insert into the left subtree; it may come back rotated.', 'Sol alt ağaca ekle; rotasyonla değişmiş dönebilir.'),
    cmpr: m('Go right if bigger.', 'Büyükse sağa git.'),
    goright: m('Insert into the right subtree.', 'Sağ alt ağaca ekle.'),
    callbal: m('On the way back up (bottom-up), check balance at every node on the insertion path.', 'Geri dönerken (aşağıdan yukarı), ekleme yolundaki her düğümde dengeyi kontrol et.'),
    bsig: m('AVL property: for every node, |height(left) − height(right)| ≤ 1. height(null) = −1.', 'AVL özelliği: her düğüm için |yükseklik(sol) − yükseklik(sağ)| ≤ 1. height(null) = −1.'),
    lheavy: m('Left side is 2 taller: the new key went into the left subtree.', 'Sol taraf 2 daha uzun: yeni anahtar sol alt ağaca gitti.'),
    case1: m('Was it the outside (left-left) or the inside (left-right) of the left child?', 'Sol çocuğun dış tarafına mı (sol-sol), iç tarafına mı (sol-sağ) gitti?'),
    do1: m('Case 1, left-left: one right rotation fixes it.', 'Durum 1, sol-sol: tek bir sağ rotasyon düzeltir.'),
    do2: m('Case 2, left-right: a single rotation does not work here, so do a double rotation.', 'Durum 2, sol-sağ: tek rotasyon burada işe yaramaz, çift rotasyon yap.'),
    rheavy: m('Right side is 2 taller.', 'Sağ taraf 2 daha uzun.'),
    case4: m('Right-right (outside) or right-left (inside)?', 'Sağ-sağ (dış) mı, sağ-sol (iç) mi?'),
    do4: m('Case 4, right-right: one left rotation.', 'Durum 4, sağ-sağ: tek bir sol rotasyon.'),
    do3: m('Case 3, right-left: double rotation.', 'Durum 3, sağ-sol: çift rotasyon.'),
    height: m('Recompute the height of t from its children.', 't\'nin yüksekliğini çocuklarından yeniden hesapla.'),
    bret: m('Return the (possibly new) subtree root; the caller stores it.', '(Belki yeni) alt ağaç kökünü döndür; çağıran saklar.'),
    ...rotationNotes,
    dlsig: m('Double rotation for case 2 (left-right) = left rotation at the child, then right rotation at k3.', 'Durum 2 (sol-sağ) için çift rotasyon = çocukta sol rotasyon, sonra k3\'te sağ rotasyon.'),
    dl1: m('First turn the inside case into an outside case.', 'Önce iç durumu dış duruma çevir.'),
    dl2: m('Now it is case 1: one right rotation.', 'Artık durum 1: tek bir sağ rotasyon.'),
    drsig: m('Double rotation for case 3 (right-left) = right rotation at the child, then left rotation at k1.', 'Durum 3 (sağ-sol) için çift rotasyon = çocukta sağ rotasyon, sonra k1\'de sol rotasyon.'),
    dr1: m('First turn it into a right-right case.', 'Önce sağ-sağ durumuna çevir.'),
    dr2: m('Now one left rotation.', 'Şimdi tek bir sol rotasyon.'),
  },
  inputs: [
    { key: 'init', label: m('Starting AVL tree (inserted in this order)', 'Başlangıç AVL ağacı (bu sırayla eklenir)'), type: 'list' },
    { key: 'x', label: m('Keys to insert (animated)', 'Eklenecek anahtarlar (animasyonlu)'), type: 'list' },
  ],
  defaults: { init: '3 2 1 4 5', x: '6 7' },
  presets: [
    { name: m('Slides: continue with 6 and 7', 'Slayt: 6 ve 7 ile devam'), values: { init: '3 2 1 4 5', x: '6 7' } },
    { name: m('From empty: 3 2 1 (case 1)', 'Boştan: 3 2 1 (durum 1)'), values: { init: '', x: '3 2 1' } },
    { name: m('Case 2: left-right', 'Durum 2: sol-sağ'), values: { init: '30 10', x: '20' } },
    { name: m('Case 3: right-left (insert 16, 15)', 'Durum 3: sağ-sol (16, 15 ekle)'), values: { init: '4 2 6 1 3 5 7', x: '16 15' } },
  ],
  run(input) {
    const init = input.init.trim() ? parseList(input.init, { min: 1, max: 14 }) : [];
    const xs = parseList(input.x, { min: 1, max: 5 });
    const t = new Tracer(code);
    const T = new TreeSim(t, true);
    init.forEach((k) => T.insertSilent(k));
    t.snap('sig', m(`AVL tree ready. Small numbers show the height (h) and the balance factor (above). Insert ${xs.join(', ')}.`, `AVL ağacı hazır. Küçük sayılar yüksekliği (h) ve denge faktörünü (üstte) gösterir. Eklenecek: ${xs.join(', ')}.`), T.S());

    const balance = (id: number): number => {
      t.stack.push(`balance(${T.key(id)})`);
      const n = T.nodes[id];
      const hl = T.h(n.left),
        hr = T.h(n.right);
      const parent = T.findParent(id);
      t.set({ 'height(t.left)': hl, 'height(t.right)': hr });
      let top = id;
      if (hl - hr > 1) {
        t.snap('lheavy', m(`At ${n.key}: ${hl} − (${hr}) = ${hl - hr} > 1. Unbalanced, left side too tall.`, `${n.key}'de: ${hl} − (${hr}) = ${hl - hr} > 1. Dengesiz, sol taraf çok uzun.`), T.S({ marks: [{ id, role: 'bad' }] }));
        const l = T.nodes[n.left!];
        const outside = T.h(l.left) >= T.h(l.right);
        t.snap('case1', outside ? m(`height(t.left.left) = ${T.h(l.left)} ≥ height(t.left.right) = ${T.h(l.right)}: outside, case 1.`, `height(t.left.left) = ${T.h(l.left)} ≥ height(t.left.right) = ${T.h(l.right)}: dış taraf, durum 1.`) : m(`height(t.left.left) = ${T.h(l.left)} < height(t.left.right) = ${T.h(l.right)}: inside, case 2.`, `height(t.left.left) = ${T.h(l.left)} < height(t.left.right) = ${T.h(l.right)}: iç taraf, durum 2.`), T.S({ marks: [{ id, role: 'bad' }, { id: n.left!, role: 'cmp' }] }));
        if (outside) {
          t.snap('do1', m('Case 1: single right rotation.', 'Durum 1: tek sağ rotasyon.'), T.S({ marks: [{ id, role: 'bad' }] }));
          top = T.rotateRight(id);
          T.reattach(parent, top);
          t.snap('rret', m(`return k1 = ${T.key(top)}; it replaces ${n.key}.`, `return k1 = ${T.key(top)}; ${n.key}'in yerini alır.`), T.S({ marks: [{ id: top, role: 'write' }] }));
        } else {
          t.snap('do2', m('Case 2: double rotation.', 'Durum 2: çift rotasyon.'), T.S({ marks: [{ id, role: 'bad' }] }));
          t.stack.push(`doubleWithLeftChild(${n.key})`);
          t.snap('dlsig', m(`k3 = ${n.key}.`, `k3 = ${n.key}.`), T.S({ labels: [{ id, text: 'k3' }], marks: [{ id, role: 'bad' }] }));
          t.snap('dl1', m(`First: left rotation at k3.left = ${T.key(n.left)}.`, `Önce: k3.left = ${T.key(n.left)}'de sol rotasyon.`), T.S({ labels: [{ id, text: 'k3' }] }));
          const c = T.rotateLeft(n.left!);
          n.left = c;
          t.snap('lret', m(`k3.left = ${T.key(c)}. Now it is a left-left case.`, `k3.left = ${T.key(c)}. Artık sol-sol durumu.`), T.S({ labels: [{ id, text: 'k3' }], marks: [{ id: c, role: 'write' }] }));
          t.snap('dl2', m(`Then: right rotation at k3 = ${n.key}.`, `Sonra: k3 = ${n.key}'de sağ rotasyon.`), T.S({ labels: [{ id, text: 'k3' }] }));
          top = T.rotateRight(id);
          T.reattach(parent, top);
          t.snap('rret', m(`return ${T.key(top)}; it replaces ${n.key}.`, `return ${T.key(top)}; ${n.key}'in yerini alır.`), T.S({ marks: [{ id: top, role: 'write' }] }));
          t.stack.pop();
        }
      } else {
        t.snap('lheavy', m(`At ${n.key}: height(left) − height(right) = ${hl} − (${hr}) = ${hl - hr}, not > 1.`, `${n.key}'de: yükseklik(sol) − yükseklik(sağ) = ${hl} − (${hr}) = ${hl - hr}, > 1 değil.`), T.S({ marks: [{ id, role: 'cmp' }] }));
        if (hr - hl > 1) {
          t.snap('rheavy', m(`${hr} − (${hl}) = ${hr - hl} > 1. Unbalanced, right side too tall.`, `${hr} − (${hl}) = ${hr - hl} > 1. Dengesiz, sağ taraf çok uzun.`), T.S({ marks: [{ id, role: 'bad' }] }));
          const r = T.nodes[n.right!];
          const outside = T.h(r.right) >= T.h(r.left);
          t.snap('case4', outside ? m(`height(t.right.right) = ${T.h(r.right)} ≥ height(t.right.left) = ${T.h(r.left)}: outside, case 4.`, `height(t.right.right) = ${T.h(r.right)} ≥ height(t.right.left) = ${T.h(r.left)}: dış taraf, durum 4.`) : m(`height(t.right.right) = ${T.h(r.right)} < height(t.right.left) = ${T.h(r.left)}: inside, case 3.`, `height(t.right.right) = ${T.h(r.right)} < height(t.right.left) = ${T.h(r.left)}: iç taraf, durum 3.`), T.S({ marks: [{ id, role: 'bad' }, { id: n.right!, role: 'cmp' }] }));
          if (outside) {
            t.snap('do4', m('Case 4: single left rotation.', 'Durum 4: tek sol rotasyon.'), T.S({ marks: [{ id, role: 'bad' }] }));
            top = T.rotateLeft(id);
            T.reattach(parent, top);
            t.snap('lret', m(`return k2 = ${T.key(top)}; it replaces ${n.key}.`, `return k2 = ${T.key(top)}; ${n.key}'in yerini alır.`), T.S({ marks: [{ id: top, role: 'write' }] }));
          } else {
            t.snap('do3', m('Case 3: double rotation.', 'Durum 3: çift rotasyon.'), T.S({ marks: [{ id, role: 'bad' }] }));
            t.stack.push(`doubleWithRightChild(${n.key})`);
            t.snap('drsig', m(`k1 = ${n.key}.`, `k1 = ${n.key}.`), T.S({ labels: [{ id, text: 'k1' }], marks: [{ id, role: 'bad' }] }));
            t.snap('dr1', m(`First: right rotation at k1.right = ${T.key(n.right)}.`, `Önce: k1.right = ${T.key(n.right)}'de sağ rotasyon.`), T.S({ labels: [{ id, text: 'k1' }] }));
            const c = T.rotateRight(n.right!);
            n.right = c;
            t.snap('rret', m(`k1.right = ${T.key(c)}. Now it is a right-right case.`, `k1.right = ${T.key(c)}. Artık sağ-sağ durumu.`), T.S({ labels: [{ id, text: 'k1' }], marks: [{ id: c, role: 'write' }] }));
            t.snap('dr2', m(`Then: left rotation at k1 = ${n.key}.`, `Sonra: k1 = ${n.key}'de sol rotasyon.`), T.S({ labels: [{ id, text: 'k1' }] }));
            top = T.rotateLeft(id);
            T.reattach(parent, top);
            t.snap('lret', m(`return ${T.key(top)}; it replaces ${n.key}.`, `return ${T.key(top)}; ${n.key}'in yerini alır.`), T.S({ marks: [{ id: top, role: 'write' }] }));
            t.stack.pop();
          }
        } else {
          t.snap('rheavy', m(`${hr} − (${hl}) = ${hr - hl}, not > 1. ${n.key} is balanced.`, `${hr} − (${hl}) = ${hr - hl}, > 1 değil. ${n.key} dengeli.`), T.S({ marks: [{ id, role: 'cmp' }] }));
        }
      }
      T.fix(top);
      t.set({ 'height(t.left)': undefined, 'height(t.right)': undefined });
      t.snap('height', m(`${T.key(top)}.height = ${T.nodes[top].h}.`, `${T.key(top)}.height = ${T.nodes[top].h}.`), T.S({ marks: [{ id: top, role: 'write' }] }));
      t.snap('bret', m(`return ${T.key(top)}.`, `return ${T.key(top)}.`), T.S({ marks: [{ id: top, role: 'active' }] }));
      t.stack.pop();
      return top;
    };

    for (const x of xs) {
      T.path = [];
      t.set({ x });
      const ins = (id: number | null, parent: number | null, side?: 'left' | 'right'): number => {
        t.count('calls');
        t.stack.push(`insert(${x}, ${T.key(id)})`);
        if (id == null) {
          t.snap('null', m(`t == null: ${x} goes here.`, `t == null: ${x} buraya.`), T.S({ ghost: { key: x, near: parent, side } }));
          const nid = T.make(x);
          if (parent == null) T.root = nid;
          else T.nodes[parent][side!] = nid;
          t.snap('create', m(`new AvlNode(${x}), height 0.`, `new AvlNode(${x}), yükseklik 0.`), T.S({ marks: [{ id: nid, role: 'new' }] }));
          t.stack.pop();
          return nid;
        }
        T.path.push(id);
        const n = T.nodes[id];
        if (x < n.key) {
          t.snap('cmpl', m(`${x} < ${n.key}: go left.`, `${x} < ${n.key}: sola git.`), T.S({ ghost: { key: x, near: id }, marks: [{ id, role: 'cmp' }] }));
          t.snap('goleft', m(`insert(${x}, ${T.key(n.left)})`, `insert(${x}, ${T.key(n.left)})`), T.S({ ghost: { key: x, near: id, side: 'left' } }));
          ins(n.left, id, 'left');
        } else if (x > n.key) {
          t.snap('cmpr', m(`${x} > ${n.key}: go right.`, `${x} > ${n.key}: sağa git.`), T.S({ ghost: { key: x, near: id }, marks: [{ id, role: 'cmp' }] }));
          t.snap('goright', m(`insert(${x}, ${T.key(n.right)})`, `insert(${x}, ${T.key(n.right)})`), T.S({ ghost: { key: x, near: id, side: 'right' } }));
          ins(n.right, id, 'right');
        } else {
          t.snap('cmpr', m(`${x} is already in the tree.`, `${x} zaten ağaçta.`), T.S({ marks: [{ id, role: 'found' }] }));
        }
        T.path.pop();
        t.snap('callbal', m(`Back at ${n.key}: call balance(${n.key}).`, `${n.key}'e geri döndük: balance(${n.key}) çağır.`), T.S({ marks: [{ id, role: 'active' }] }));
        const top = balance(id);
        t.stack.pop();
        return top;
      };
      T.root = ins(T.root, null);
    }
    t.set({ x: undefined });
    T.path = [];
    t.snap('sig', m(`Done. In-order: [${T.inorder().join(', ')}]. Height = ${T.h(T.root)}.`, `Bitti. In-order: [${T.inorder().join(', ')}]. Yükseklik = ${T.h(T.root)}.`), T.S());
    return t.steps;
  },
  concept: [
    m('AVL = BST + for every node |h(left) − h(right)| ≤ 1. Height is always O(log N).', 'AVL = BST + her düğüm için |h(sol) − h(sağ)| ≤ 1. Yükseklik hep O(log N).'),
    m('Let α be the deepest unbalanced node. 4 cases: LL (1) and RR (4) → single rotation; LR (2) and RL (3) → double rotation.', 'α en derin dengesiz düğüm olsun. 4 durum: LL (1) ve RR (4) → tek rotasyon; LR (2) ve RL (3) → çift rotasyon.'),
    m('After an insertion, one (single or double) rotation is enough to restore the whole tree.', 'Bir eklemeden sonra tek bir (tek ya da çift) rotasyon bütün ağacı düzeltmeye yeter.'),
  ],
  complexity: [
    { op: 'insert / find / remove', best: 'O(log N)', avg: 'O(log N)', worst: 'O(log N)' },
    { op: m('Rotation', 'Rotasyon'), worst: 'O(1)' },
  ],
  pitfalls: [
    m('height(null) = −1, a leaf has height 0.', 'height(null) = −1, yaprağın yüksekliği 0.'),
    m('A single rotation does not fix the inside cases (2 and 3); you need a double rotation.', 'Tek rotasyon iç durumları (2 ve 3) düzeltmez; çift rotasyon gerekir.'),
    m('Balance is checked bottom-up on the insertion path only.', 'Denge sadece ekleme yolunda, aşağıdan yukarı kontrol edilir.'),
  ],
  blanks: [
    { label: 'callbal', text: 'balance(t)', hint: m('What happens on the way back up?', 'Geri dönerken ne olur?') },
    { label: 'lheavy', text: 'height(t.left) - height(t.right) > 1', hint: m('Is the left side more than 1 taller?', 'Sol taraf 1\'den fazla mı uzun?') },
    { label: 'do1', text: 'rotateWithLeftChild(t)', hint: m('Case 1 (left-left): single rotation.', 'Durum 1 (sol-sol): tek rotasyon.') },
    { label: 'do3', text: 'doubleWithRightChild(t)', hint: m('Case 3 (right-left): double rotation.', 'Durum 3 (sağ-sol): çift rotasyon.') },
    { label: 'height', text: 'Math.max(height(t.left), height(t.right)) + 1', hint: m('Height from the children.', 'Çocuklardan yükseklik.') },
    { label: 'dl1', text: 'rotateWithRightChild(k3.left)', hint: m('First rotation of the double rotation (case 2).', 'Çift rotasyonun ilk adımı (durum 2).') },
  ],
};
