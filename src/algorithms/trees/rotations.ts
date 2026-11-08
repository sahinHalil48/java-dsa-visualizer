import { m } from '../../i18n';
import { java, parseList, parseNum } from '../../engine/code';
import { InputError, Tracer } from '../../engine/tracer';
import type { Algorithm } from '../../types';
import { ROTATIONS, TreeSim, rotationNotes } from './common';

const code = java(
  '\n// Right rotation: used for case 1 (left-left)\n' +
    ROTATIONS.replace(/^\n/, '').replace('\n\nprivate AvlNode rotateWithRightChild', '\n\n// Left rotation: used for case 4 (right-right)\nprivate AvlNode rotateWithRightChild'),
);

export const rotations: Algorithm = {
  id: 'rotations',
  category: 'trees',
  name: m('Rotations (left / right)', 'Rotasyonlar (sol / sağ)'),
  summary: m('A rotation lifts a child above its parent while keeping BST order. Only 3 pointers change. Watch the middle subtree B change parents.', 'Rotasyon, BST sırasını koruyarak bir çocuğu ebeveyninin üstüne çıkarır. Sadece 3 pointer değişir. Ortadaki B alt ağacının ebeveyn değiştirmesini izle.'),
  code,
  notes: rotationNotes,
  inputs: [
    { key: 'init', label: m('BST (inserted in this order)', 'BST (bu sırayla eklenir)'), type: 'list' },
    { key: 'at', label: m('Rotate at node', 'Rotasyon yapılacak düğüm'), type: 'number' },
    {
      key: 'dir',
      label: m('Direction', 'Yön'),
      type: 'select',
      options: [
        { value: 'left', label: m('Left (rotateWithRightChild)', 'Sol (rotateWithRightChild)') },
        { value: 'right', label: m('Right (rotateWithLeftChild)', 'Sağ (rotateWithLeftChild)') },
      ],
    },
  ],
  defaults: { init: '2 1 4 3 6 5 7', at: '2', dir: 'left' },
  presets: [
    { name: m('Left rotation at the root', 'Kökte sol rotasyon'), values: { init: '2 1 4 3 6 5 7', at: '2', dir: 'left' } },
    { name: m('Right rotation at the root', 'Kökte sağ rotasyon'), values: { init: '6 4 7 2 5 1 3', at: '6', dir: 'right' } },
    { name: m('Rotation inside the tree', 'Ağacın içinde rotasyon'), values: { init: '8 4 12 2 6 10 14 5 7', at: '4', dir: 'left' } },
  ],
  run(input) {
    const init = parseList(input.init, { min: 2, max: 15 });
    const at = parseNum(input.at, -999, 999, 'node');
    const dir = input.dir === 'right' ? 'right' : 'left';
    const t = new Tracer(code);
    const T = new TreeSim(t); // plain BST: the tree is built exactly in the given order
    init.forEach((k) => T.insertSilent(k));
    T.avl = true; // show heights and balance factors
    T.computeHeights();
    const id = Object.values(T.nodes).find((n) => n.key === at)?.id;
    if (id == null) throw new InputError(m(`${at} is not in the tree.`, `${at} ağaçta yok.`));
    if (dir === 'left' && T.nodes[id].right == null) throw new InputError(m(`${at} has no right child, so it cannot rotate left.`, `${at}'in sağ çocuğu yok, sola rotasyon yapılamaz.`));
    if (dir === 'right' && T.nodes[id].left == null) throw new InputError(m(`${at} has no left child, so it cannot rotate right.`, `${at}'in sol çocuğu yok, sağa rotasyon yapılamaz.`));
    const parent = T.findParent(id);
    const before = T.inorder().join(', ');
    let top: number;
    if (dir === 'left') {
      top = T.rotateLeft(id);
      T.reattach(parent, top);
      t.snap('lret', m(`return k2 = ${T.key(top)}: ${parent.parent == null ? 'root' : `${T.key(parent.parent)}.${parent.side}`} = ${T.key(top)}. In-order is still [${T.inorder().join(', ')}].`, `return k2 = ${T.key(top)}: ${parent.parent == null ? 'root' : `${T.key(parent.parent)}.${parent.side}`} = ${T.key(top)}. In-order hâlâ [${T.inorder().join(', ')}].`), T.S({ labels: [{ id, text: 'k1' }, { id: top, text: 'k2' }], marks: [{ id: top, role: 'write' }] }));
    } else {
      top = T.rotateRight(id);
      T.reattach(parent, top);
      t.snap('rret', m(`return k1 = ${T.key(top)}: ${parent.parent == null ? 'root' : `${T.key(parent.parent)}.${parent.side}`} = ${T.key(top)}. In-order is still [${T.inorder().join(', ')}].`, `return k1 = ${T.key(top)}: ${parent.parent == null ? 'root' : `${T.key(parent.parent)}.${parent.side}`} = ${T.key(top)}. In-order hâlâ [${T.inorder().join(', ')}].`), T.S({ labels: [{ id, text: 'k2' }, { id: top, text: 'k1' }], marks: [{ id: top, role: 'write' }] }));
    }
    if (before !== T.inorder().join(', ')) throw new Error('rotation broke BST order');
    return t.steps;
  },
  concept: [
    m('Left rotation at k1: its right child k2 moves up, k1 becomes k2\'s left child, k2\'s old left subtree B becomes k1\'s right subtree.', 'k1\'de sol rotasyon: sağ çocuğu k2 yukarı çıkar, k1 k2\'nin sol çocuğu olur, k2\'nin eski sol alt ağacı B k1\'in sağ alt ağacı olur.'),
    m('In-order stays the same: A < k1 < B < k2 < C before and after.', 'In-order aynı kalır: öncesinde de sonrasında da A < k1 < B < k2 < C.'),
    m('Constant work, O(1): only pointers and two heights change.', 'Sabit iş, O(1): sadece pointer\'lar ve iki yükseklik değişir.'),
  ],
  complexity: [{ op: m('Single rotation', 'Tek rotasyon'), worst: 'O(1)' }, { op: m('Double rotation', 'Çift rotasyon'), worst: 'O(1)' }],
  pitfalls: [
    m('Update the height of the node that went DOWN first, then the new subtree root.', 'Önce AŞAĞI inen düğümün yüksekliğini, sonra yeni alt ağaç kökünü güncelle.'),
    m('Do not forget to store the returned node in the parent (or root).', 'Döndürülen düğümü ebeveyne (ya da root\'a) yazmayı unutma.'),
    m('Naming: rotateWithRightChild = left rotation (case 4), rotateWithLeftChild = right rotation (case 1).', 'İsimlendirme: rotateWithRightChild = sol rotasyon (durum 4), rotateWithLeftChild = sağ rotasyon (durum 1).'),
  ],
  blanks: [
    { label: 'rk1', text: 'k2.left', hint: m('k1 is the left child of k2.', 'k1, k2\'nin sol çocuğu.') },
    { label: 'rmoveB', text: 'k2.left = k1.right', hint: m('The middle subtree B changes parents.', 'Ortadaki B alt ağacı ebeveyn değiştirir.') },
    { label: 'rlink', text: 'k1.right = k2', hint: m('k2 goes under k1.', 'k2, k1\'in altına girer.') },
    { label: 'lmoveB', text: 'k1.right = k2.left', hint: m('Mirror image of the right rotation.', 'Sağ rotasyonun ayna görüntüsü.') },
    { label: 'llink', text: 'k2.left = k1', hint: m('k1 goes under k2.', 'k1, k2\'nin altına girer.') },
    { label: 'lret', text: 'return k2', hint: m('Which node is the new subtree root?', 'Yeni alt ağaç kökü hangisi?') },
  ],
};
