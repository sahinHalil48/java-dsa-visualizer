import { m } from '../../i18n';
import { java, parseList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm } from '../../types';
import { TreeSim } from './common';

const code = java(`
private BinaryNode insert(int x, BinaryNode t) {     //@sig
    if (t == null)                                   //@null
        return new BinaryNode(x);                    //@create
    if (x < t.element)                               //@cmpl
        t.left = insert(x, t.left);                  //@goleft
    else if (x > t.element)                          //@cmpr
        t.right = insert(x, t.right);                //@goright
    // else: duplicate, do nothing                   //@dup
    return t;                                        //@ret
}
`);

export const bstInsert: Algorithm = {
  id: 'bst-insert',
  category: 'trees',
  name: m('BST: insert', 'BST: insert'),
  summary: m('Walk down from the root: go left if x is smaller, right if bigger. The new node is created where you fall off the tree (at a null).', 'Kökten aşağı yürü: x küçükse sola, büyükse sağa git. Yeni düğüm ağaçtan düştüğün yerde (bir null\'da) oluşturulur.'),
  code,
  notes: {
    sig: m('Returns the (possibly new) root of the subtree t. The caller stores it: t.left = insert(...).', 'Alt ağaç t\'nin (belki yeni) kökünü döndürür. Çağıran bunu saklar: t.left = insert(...).'),
    null: m('Fell off the tree: this is where x belongs.', 'Ağaçtan düştük: x\'in yeri burası.'),
    create: m('Create a leaf. The caller links it to its parent.', 'Bir yaprak oluştur. Çağıran onu ebeveynine bağlar.'),
    cmpl: m('BST property: everything in the left subtree is smaller than t.element.', 'BST özelliği: sol alt ağaçtaki her şey t.element\'ten küçük.'),
    goleft: m('Recurse into the left subtree and store the result in t.left.', 'Sol alt ağaçta recursive devam et, sonucu t.left\'e yaz.'),
    cmpr: m('Everything in the right subtree is bigger.', 'Sağ alt ağaçtaki her şey büyük.'),
    goright: m('Recurse into the right subtree.', 'Sağ alt ağaçta recursive devam et.'),
    dup: m('x is already in the tree: no duplicates.', 'x zaten ağaçta: tekrar eklenmez.'),
    ret: m('Return t unchanged to the caller (the recursion unwinds).', 't\'yi değiştirmeden çağırana döndür (recursion geri sarılır).'),
  },
  inputs: [
    { key: 'init', label: m('Starting tree (inserted in this order)', 'Başlangıç ağacı (bu sırayla eklenir)'), type: 'list' },
    { key: 'x', label: m('Keys to insert (animated)', 'Eklenecek anahtarlar (animasyonlu)'), type: 'list' },
  ],
  defaults: { init: '6 2 8 1 4 3', x: '5' },
  presets: [
    { name: m('Insert 5 (Weiss figure)', '5 ekle (Weiss şekli)'), values: { init: '6 2 8 1 4 3', x: '5' } },
    { name: m('Build from empty', 'Boştan kur'), values: { init: '', x: '50 30 70 20 40 60' } },
    { name: m('Sorted input → a "linked list"', 'Sıralı girdi → "linked list"'), values: { init: '', x: '1 2 3 4 5' } },
  ],
  run(input) {
    const init = input.init.trim() ? parseList(input.init, { min: 1, max: 15 }) : [];
    const xs = parseList(input.x, { min: 1, max: 8 });
    const t = new Tracer(code);
    const T = new TreeSim(t);
    init.forEach((k) => T.insertSilent(k));
    t.snap('sig', m(`Tree in-order: [${T.inorder().join(', ')}]. Insert ${xs.join(', ')}.`, `Ağaç (in-order): [${T.inorder().join(', ')}]. Eklenecek: ${xs.join(', ')}.`), T.S());
    for (const x of xs) {
      T.path = [];
      t.set({ x });
      const ins = (id: number | null, parent: number | null, side?: 'left' | 'right'): number => {
        t.count('calls');
        t.stack.push(`insert(${x}, ${T.key(id)})`);
        if (id == null) {
          t.snap('null', m(`t == null: ${x} belongs here.`, `t == null: ${x}'in yeri burası.`), T.S({ ghost: { key: x, near: parent, side } }));
          const nid = T.make(x);
          if (parent == null) T.root = nid;
          else T.nodes[parent][side!] = nid;
          t.snap('create', m(`new BinaryNode(${x}), returned and linked as ${parent == null ? 'the root' : `the ${side} child of ${T.key(parent)}`}.`, `new BinaryNode(${x}) oluşturuldu, ${parent == null ? 'kök oldu' : `${T.key(parent)}'in ${side === 'left' ? 'sol' : 'sağ'} çocuğu olarak bağlandı`}.`), T.S({ marks: [{ id: nid, role: 'new' }] }));
          t.stack.pop();
          return nid;
        }
        T.path.push(id);
        const n = T.nodes[id];
        t.count('cmp');
        if (x < n.key) {
          t.snap('cmpl', m(`${x} < ${n.key}: go left.`, `${x} < ${n.key}: sola git.`), T.S({ ghost: { key: x, near: id }, marks: [{ id, role: 'cmp' }] }));
          t.snap('goleft', m(`insert(${x}, ${T.key(n.left)})`, `insert(${x}, ${T.key(n.left)})`), T.S({ ghost: { key: x, near: id, side: 'left' } }));
          ins(n.left, id, 'left');
        } else if (x > n.key) {
          t.snap('cmpl', m(`${x} < ${n.key}? No.`, `${x} < ${n.key} mi? Hayır.`), T.S({ ghost: { key: x, near: id }, marks: [{ id, role: 'cmp' }] }));
          t.count('cmp');
          t.snap('cmpr', m(`${x} > ${n.key}: go right.`, `${x} > ${n.key}: sağa git.`), T.S({ ghost: { key: x, near: id }, marks: [{ id, role: 'cmp' }] }));
          t.snap('goright', m(`insert(${x}, ${T.key(n.right)})`, `insert(${x}, ${T.key(n.right)})`), T.S({ ghost: { key: x, near: id, side: 'right' } }));
          ins(n.right, id, 'right');
        } else {
          t.snap('dup', m(`${x} = ${n.key}: already in the tree. Do nothing.`, `${x} = ${n.key}: zaten ağaçta. Bir şey yapma.`), T.S({ marks: [{ id, role: 'found' }] }));
        }
        t.snap('ret', m(`return ${n.key} to the caller.`, `${n.key} çağırana döndürülür.`), T.S({ marks: [{ id, role: 'active' }] }));
        T.path.pop();
        t.stack.pop();
        return id;
      };
      ins(T.root, null);
    }
    t.set({ x: undefined });
    T.path = [];
    t.snap('ret', m(`Done. In-order traversal gives sorted keys: [${T.inorder().join(', ')}].`, `Bitti. In-order gezinti sıralı anahtarları verir: [${T.inorder().join(', ')}].`), T.S());
    return t.steps;
  },
  concept: [
    m('BST property: for every node, left subtree < node < right subtree.', 'BST özelliği: her düğüm için sol alt ağaç < düğüm < sağ alt ağaç.'),
    m('Insert follows one root-to-leaf path: O(depth).', 'Insert kökten yaprağa tek bir yol izler: O(derinlik).'),
    m('The recursive version returns the subtree root; that is how the new node gets linked to its parent.', 'Recursive versiyon alt ağacın kökünü döndürür; yeni düğüm ebeveynine böyle bağlanır.'),
  ],
  complexity: [{ op: 'insert / find', best: 'O(1)', avg: 'O(log N)', worst: 'O(N)' }],
  pitfalls: [
    m('Inserting sorted keys gives a degenerate tree (a linked list) of height N−1: O(N) per operation. AVL trees fix this.', 'Sıralı anahtar eklemek yozlaşmış bir ağaç (linked list) verir, yükseklik N−1: işlem başına O(N). AVL ağaçları bunu çözer.'),
    m('Heap ≠ BST: in a heap siblings have no order.', 'Heap ≠ BST: heap\'te kardeşler arasında sıra yoktur.'),
  ],
  blanks: [
    { label: 'null', text: 't == null', hint: m('When have we fallen off the tree?', 'Ne zaman ağaçtan düşmüş oluruz?') },
    { label: 'create', text: 'new BinaryNode(x)', hint: m('Create the leaf.', 'Yaprağı oluştur.') },
    { label: 'goleft', text: 't.left = insert(x, t.left)', hint: m('Recurse left and store the result.', 'Sola recursive git ve sonucu sakla.') },
    { label: 'cmpr', text: 'x > t.element', accept: ['t.element < x'], hint: m('When do we go right?', 'Ne zaman sağa gideriz?') },
    { label: 'ret', text: 'return t', hint: m('Give the subtree root back to the caller.', 'Alt ağacın kökünü çağırana geri ver.') },
  ],
};
