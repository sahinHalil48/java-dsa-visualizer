import { m } from '../../i18n';
import { java, parseList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm } from '../../types';
import { TreeSim } from './common';

const code = java(`
void preorder(BinaryNode t) {        //@pre
    if (t == null) return;           //@pnull
    visit(t);                        //@pvisit
    preorder(t.left);                //@pl
    preorder(t.right);               //@pr
}

void inorder(BinaryNode t) {         //@in
    if (t == null) return;           //@inull
    inorder(t.left);                 //@il
    visit(t);                        //@ivisit
    inorder(t.right);                //@ir
}

void postorder(BinaryNode t) {       //@post
    if (t == null) return;           //@onull
    postorder(t.left);               //@ol
    postorder(t.right);              //@or
    visit(t);                        //@ovisit
}
`);

type Order = 'pre' | 'in' | 'post';

export const traversals: Algorithm = {
  id: 'tree-traversals',
  category: 'trees',
  name: m('Tree traversals', 'Ağaç gezintileri (traversal)'),
  summary: m('Preorder: node, left, right. Inorder: left, node, right (sorted for a BST). Postorder: left, right, node.', 'Preorder: düğüm, sol, sağ. Inorder: sol, düğüm, sağ (BST\'de sıralı). Postorder: sol, sağ, düğüm.'),
  code,
  notes: {
    pre: m('Preorder: the parent is visited BEFORE its children. Used e.g. to print a directory tree.', 'Preorder: ebeveyn çocuklarından ÖNCE ziyaret edilir. Örn. klasör ağacı yazdırmak.'),
    pnull: m('Empty subtree: nothing to do (base case).', 'Boş alt ağaç: yapılacak bir şey yok (durma koşulu).'),
    pvisit: m('Visit first.', 'Önce ziyaret et.'),
    pl: m('Then the whole left subtree.', 'Sonra bütün sol alt ağaç.'),
    pr: m('Then the whole right subtree.', 'Sonra bütün sağ alt ağaç.'),
    in: m('Inorder: left subtree, node, right subtree. On a BST this visits the keys in sorted order.', 'Inorder: sol alt ağaç, düğüm, sağ alt ağaç. BST\'de anahtarları sıralı ziyaret eder.'),
    inull: m('Base case.', 'Durma koşulu.'),
    il: m('Everything smaller first.', 'Önce bütün küçükler.'),
    ivisit: m('Then the node itself.', 'Sonra düğümün kendisi.'),
    ir: m('Then everything bigger.', 'Sonra bütün büyükler.'),
    post: m('Postorder: the parent is visited AFTER its children. Used e.g. to compute folder sizes or the height of every node.', 'Postorder: ebeveyn çocuklarından SONRA ziyaret edilir. Örn. klasör boyutu ya da her düğümün yüksekliğini hesaplamak.'),
    onull: m('Base case.', 'Durma koşulu.'),
    ol: m('Left subtree first.', 'Önce sol alt ağaç.'),
    or: m('Then the right subtree.', 'Sonra sağ alt ağaç.'),
    ovisit: m('The node is visited last.', 'Düğüm en son ziyaret edilir.'),
  },
  inputs: [
    { key: 'init', label: m('Tree (inserted in this order)', 'Ağaç (bu sırayla eklenir)'), type: 'list' },
    {
      key: 'order',
      label: m('Traversal', 'Gezinti'),
      type: 'select',
      options: [
        { value: 'pre', label: m('Preorder', 'Preorder') },
        { value: 'in', label: m('Inorder', 'Inorder') },
        { value: 'post', label: m('Postorder', 'Postorder') },
      ],
    },
  ],
  defaults: { init: '6 2 8 1 4 3 9', order: 'in' },
  presets: [
    { name: m('Inorder', 'Inorder'), values: { init: '6 2 8 1 4 3 9', order: 'in' } },
    { name: m('Preorder', 'Preorder'), values: { init: '6 2 8 1 4 3 9', order: 'pre' } },
    { name: m('Postorder', 'Postorder'), values: { init: '6 2 8 1 4 3 9', order: 'post' } },
  ],
  run(input) {
    const init = parseList(input.init, { min: 1, max: 15 });
    const order = (['pre', 'in', 'post'].includes(input.order) ? input.order : 'in') as Order;
    const L = {
      pre: { sig: 'pre', nul: 'pnull', visit: 'pvisit', l: 'pl', r: 'pr', name: 'preorder' },
      in: { sig: 'in', nul: 'inull', visit: 'ivisit', l: 'il', r: 'ir', name: 'inorder' },
      post: { sig: 'post', nul: 'onull', visit: 'ovisit', l: 'ol', r: 'or', name: 'postorder' },
    }[order];
    const t = new Tracer(code);
    const T = new TreeSim(t);
    init.forEach((k) => T.insertSilent(k));
    const out: number[] = [];
    const visited = new Set<number>();
    const S = (cur?: number) => T.S({ output: { label: L.name, values: out.slice() }, marks: [...[...visited].map((id) => ({ id, role: 'write' as const })), ...(cur != null ? [{ id: cur, role: 'active' as const }] : [])] });
    t.snap(L.sig, m(`${L.name}(root)`, `${L.name}(root)`), S());
    const go = (id: number | null) => {
      t.count('calls');
      t.stack.push(`${L.name}(${T.key(id)})`);
      if (id == null) {
        t.snap(L.nul, m('t == null: return.', 't == null: geri dön.'), S());
        t.stack.pop();
        return;
      }
      T.path.push(id);
      t.snap(L.nul, m(`t = ${T.key(id)}, not null.`, `t = ${T.key(id)}, null değil.`), S(id));
      const n = T.nodes[id];
      const visit = () => {
        out.push(n.key);
        visited.add(id);
        t.count('visits');
        t.snap(L.visit, m(`visit(${n.key}) → output: ${out.join(' ')}`, `visit(${n.key}) → çıktı: ${out.join(' ')}`), S(id));
      };
      if (order === 'pre') visit();
      t.snap(L.l, m(`Go to the left subtree of ${n.key}.`, `${n.key}'in sol alt ağacına git.`), S(id));
      go(n.left);
      if (order === 'in') visit();
      t.snap(L.r, m(`Go to the right subtree of ${n.key}.`, `${n.key}'in sağ alt ağacına git.`), S(id));
      go(n.right);
      if (order === 'post') visit();
      T.path.pop();
      t.stack.pop();
    };
    go(T.root);
    t.snap(L.sig, m(`${L.name}: ${out.join(' ')}`, `${L.name}: ${out.join(' ')}`), S());
    return t.steps;
  },
  concept: [
    m('All three visit every node once: O(N).', 'Üçü de her düğümü bir kez ziyaret eder: O(N).'),
    m('The only difference is WHEN visit(t) happens relative to the two recursive calls.', 'Tek fark visit(t)\'nin iki recursive çağrıya göre NE ZAMAN yapıldığı.'),
    m('Inorder on a BST = sorted order.', 'BST\'de inorder = sıralı düzen.'),
  ],
  complexity: [{ op: m('Traversal', 'Gezinti'), best: 'O(N)', avg: 'O(N)', worst: 'O(N)' }],
  pitfalls: [m('Postorder is the one used to compute heights: a node needs its children\'s heights first.', 'Yükseklik hesaplamak için postorder kullanılır: düğüm önce çocuklarının yüksekliğine ihtiyaç duyar.')],
  blanks: [
    { label: 'pvisit', text: 'visit(t)', hint: m('Preorder: what happens first?', 'Preorder: önce ne olur?') },
    { label: 'il', text: 'inorder(t.left)', hint: m('Inorder starts with the smaller keys.', 'Inorder küçük anahtarlarla başlar.') },
    { label: 'ovisit', text: 'visit(t)', hint: m('Postorder: the node comes last.', 'Postorder: düğüm en sonda.') },
    { label: 'onull', text: 't == null', hint: m('Base case of the recursion.', 'Recursion\'ın durma koşulu.') },
  ],
};
