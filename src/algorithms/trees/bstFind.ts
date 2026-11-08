import { m } from '../../i18n';
import { java, parseList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm } from '../../types';
import { TreeSim } from './common';

const code = java(`
private boolean contains(int x, BinaryNode t) {      //@sig
    if (t == null)                                   //@null
        return false;                                //@nf
    if (x < t.element)                               //@cmpl
        return contains(x, t.left);                  //@goleft
    else if (x > t.element)                          //@cmpr
        return contains(x, t.right);                 //@goright
    else
        return true;    // match                     //@found
}

private BinaryNode findMin(BinaryNode t) {           //@minsig
    if (t != null)
        while (t.left != null)                       //@minloop
            t = t.left;                              //@minstep
    return t;                                        //@minret
}
`);

export const bstFind: Algorithm = {
  id: 'bst-find',
  category: 'trees',
  name: m('BST: contains & findMin', 'BST: contains ve findMin'),
  summary: m('Search: compare with the root and continue in one subtree only. findMin: keep going left.', 'Arama: kökle karşılaştır ve sadece bir alt ağaçta devam et. findMin: hep sola git.'),
  code,
  notes: {
    sig: m('Is x somewhere in the subtree t?', 'x, t alt ağacında bir yerde mi?'),
    null: m('Reached an empty subtree.', 'Boş bir alt ağaca ulaştık.'),
    nf: m('x is not in the tree.', 'x ağaçta yok.'),
    cmpl: m('x is smaller: it can only be in the left subtree. Half of the remaining tree is skipped (if balanced).', 'x küçük: sadece sol alt ağaçta olabilir. Kalan ağacın yarısı atlanır (dengeliyse).'),
    goleft: m('Tail recursion: could be written as a loop.', 'Kuyruk recursion\'ı: döngü olarak da yazılabilir.'),
    cmpr: m('x is bigger: search the right subtree.', 'x büyük: sağ alt ağaçta ara.'),
    goright: m('Search the right subtree.', 'Sağ alt ağaçta ara.'),
    found: m('Neither smaller nor bigger: found.', 'Ne küçük ne büyük: bulundu.'),
    minsig: m('The minimum of a BST is the leftmost node.', 'BST\'nin minimumu en soldaki düğümdür.'),
    minloop: m('Keep going left while possible.', 'Gidebildiğin kadar sola git.'),
    minstep: m('Move to the left child.', 'Sol çocuğa geç.'),
    minret: m('No left child: this is the minimum. (findMax goes right.)', 'Sol çocuk yok: minimum bu. (findMax sağa gider.)'),
  },
  inputs: [
    { key: 'init', label: m('Tree (inserted in this order)', 'Ağaç (bu sırayla eklenir)'), type: 'list' },
    { key: 'x', label: m('Keys to search', 'Aranacak anahtarlar'), type: 'list' },
  ],
  defaults: { init: '8 4 12 2 6 10 14 1 3 5 7', x: '5 11' },
  presets: [
    { name: m('Found and not found', 'Bulunan ve bulunamayan'), values: { init: '8 4 12 2 6 10 14 1 3 5 7', x: '5 11' } },
    { name: m('Unbalanced tree', 'Dengesiz ağaç'), values: { init: '1 2 3 4 5 6', x: '6' } },
  ],
  run(input) {
    const init = parseList(input.init, { min: 1, max: 15 });
    const xs = parseList(input.x, { min: 1, max: 6 });
    const t = new Tracer(code);
    const T = new TreeSim(t);
    init.forEach((k) => T.insertSilent(k));
    t.snap('sig', m(`Search for ${xs.join(', ')}, then find the minimum.`, `${xs.join(', ')} aranacak, sonra minimum bulunacak.`), T.S());
    for (const x of xs) {
      T.path = [];
      t.set({ x });
      let id = T.root;
      let depth = 0;
      for (;;) {
        t.count('calls');
        t.stack.push(`contains(${x}, ${T.key(id)})`);
        if (id == null) {
          t.snap('null', m('t == null.', 't == null.'), T.S());
          t.snap('nf', m(`${x} is not in the tree (${depth} nodes visited).`, `${x} ağaçta yok (${depth} düğüm ziyaret edildi).`), T.S());
          break;
        }
        T.path.push(id);
        depth++;
        t.count('visits');
        const n = T.nodes[id];
        if (x < n.key) {
          t.snap('cmpl', m(`${x} < ${n.key}: only the left subtree can contain it.`, `${x} < ${n.key}: sadece sol alt ağaçta olabilir.`), T.S({ ghost: { key: x, near: id }, marks: [{ id, role: 'cmp' }] }));
          t.snap('goleft', m(`contains(${x}, ${T.key(n.left)})`, `contains(${x}, ${T.key(n.left)})`), T.S({ ghost: { key: x, near: id, side: 'left' } }));
          id = n.left;
        } else if (x > n.key) {
          t.snap('cmpr', m(`${x} > ${n.key}: search right.`, `${x} > ${n.key}: sağda ara.`), T.S({ ghost: { key: x, near: id }, marks: [{ id, role: 'cmp' }] }));
          t.snap('goright', m(`contains(${x}, ${T.key(n.right)})`, `contains(${x}, ${T.key(n.right)})`), T.S({ ghost: { key: x, near: id, side: 'right' } }));
          id = n.right;
        } else {
          t.snap('found', m(`${x} = ${n.key}: found after visiting ${depth} node(s).`, `${x} = ${n.key}: ${depth} düğüm ziyaret edildikten sonra bulundu.`), T.S({ marks: [{ id, role: 'found' }] }));
          break;
        }
      }
      t.stack = [];
    }
    // findMin
    T.path = [];
    t.set({ x: undefined });
    t.stack = [`findMin(${T.key(T.root)})`];
    let id = T.root!;
    t.snap('minsig', m(`findMin(root): start at ${T.key(id)}.`, `findMin(root): ${T.key(id)}'den başla.`), T.S({ marks: [{ id, role: 'active' }] }));
    for (;;) {
      T.path.push(id);
      const l = T.nodes[id].left;
      t.snap('minloop', l != null ? m(`${T.key(id)} has a left child.`, `${T.key(id)}'in sol çocuğu var.`) : m(`${T.key(id)} has no left child.`, `${T.key(id)}'in sol çocuğu yok.`), T.S({ marks: [{ id, role: 'active' }] }));
      if (l == null) break;
      id = l;
      t.snap('minstep', m(`t = t.left = ${T.key(id)}.`, `t = t.left = ${T.key(id)}.`), T.S({ marks: [{ id, role: 'active' }] }));
    }
    t.snap('minret', m(`The minimum is ${T.key(id)}.`, `Minimum ${T.key(id)}.`), T.S({ marks: [{ id, role: 'found' }] }));
    return t.steps;
  },
  concept: [
    m('Each comparison discards one whole subtree.', 'Her karşılaştırma bir alt ağacın tamamını eler.'),
    m('Cost = depth of the node: O(log N) if balanced, O(N) if degenerate.', 'Maliyet = düğümün derinliği: dengeliyse O(log N), yozlaşmışsa O(N).'),
    m('findMin = leftmost node, findMax = rightmost node.', 'findMin = en soldaki düğüm, findMax = en sağdaki düğüm.'),
  ],
  complexity: [
    { op: 'contains', best: 'O(1)', avg: 'O(log N)', worst: 'O(N)' },
    { op: 'findMin / findMax', avg: 'O(log N)', worst: 'O(N)' },
  ],
  pitfalls: [m('The minimum is not necessarily a leaf: it may have a right child.', 'Minimum mutlaka yaprak değildir: sağ çocuğu olabilir.')],
  blanks: [
    { label: 'nf', text: 'return false', hint: m('Empty subtree: what do we answer?', 'Boş alt ağaç: ne cevap veririz?') },
    { label: 'goleft', text: 'contains(x, t.left)', hint: m('Continue in the left subtree.', 'Sol alt ağaçta devam et.') },
    { label: 'found', text: 'return true', hint: m('Neither smaller nor bigger.', 'Ne küçük ne büyük.') },
    { label: 'minloop', text: 't.left != null', hint: m('Can we still go left?', 'Hâlâ sola gidebilir miyiz?') },
  ],
};
