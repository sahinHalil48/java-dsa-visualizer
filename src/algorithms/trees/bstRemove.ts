import { m } from '../../i18n';
import { java, parseList } from '../../engine/code';
import { Tracer } from '../../engine/tracer';
import type { Algorithm } from '../../types';
import { TreeSim } from './common';

const code = java(`
private BinaryNode remove(int x, BinaryNode t) {     //@sig
    if (t == null)                                   //@null
        return t;       // not found                 //@nf
    if (x < t.element)                               //@cmpl
        t.left = remove(x, t.left);                  //@goleft
    else if (x > t.element)                          //@cmpr
        t.right = remove(x, t.right);                //@goright
    else if (t.left != null && t.right != null) {    //@two
        t.element = findMin(t.right).element;        //@copy
        t.right = remove(t.element, t.right);        //@delmin
    } else
        t = (t.left != null) ? t.left : t.right;     //@one
    return t;                                        //@ret
}
`);

export const bstRemove: Algorithm = {
  id: 'bst-remove',
  category: 'trees',
  name: m('BST: remove', 'BST: remove'),
  summary: m('Leaf: delete it. One child: let the child take its place. Two children: copy the smallest key of the right subtree into it, then remove that key from the right subtree.', 'Yaprak: sil. Tek çocuk: çocuk onun yerine geçer. İki çocuk: sağ alt ağacın en küçük anahtarını kopyala, sonra o anahtarı sağ alt ağaçtan sil.'),
  code,
  notes: {
    sig: m('Returns the new root of subtree t after removing x.', 'x silindikten sonra t alt ağacının yeni kökünü döndürür.'),
    null: m('Reached null: x was not in the tree.', 'null\'a ulaştık: x ağaçta yoktu.'),
    nf: m('Nothing to remove.', 'Silinecek bir şey yok.'),
    cmpl: m('x is smaller: remove it from the left subtree.', 'x küçük: sol alt ağaçtan sil.'),
    goleft: m('The left subtree may get a new root, so store the result in t.left.', 'Sol alt ağacın kökü değişebilir, sonucu t.left\'e yaz.'),
    cmpr: m('x is bigger: remove it from the right subtree.', 'x büyük: sağ alt ağaçtan sil.'),
    goright: m('Store the new right subtree.', 'Yeni sağ alt ağacı sakla.'),
    two: m('Found x, and it has two children: the hard case.', 'x bulundu ve iki çocuğu var: zor durum.'),
    copy: m('Replace the key by the smallest key in the right subtree (the in-order successor). BST order stays correct.', 'Anahtarı sağ alt ağacın en küçük anahtarıyla (in-order ardılı) değiştir. BST sırası bozulmaz.'),
    delmin: m('Now remove that successor from the right subtree. It has no left child, so this is an easy case.', 'Şimdi o ardılı sağ alt ağaçtan sil. Sol çocuğu yok, bu kolay bir durum.'),
    one: m('0 or 1 child: replace the node by its only child (or by null if it is a leaf).', '0 ya da 1 çocuk: düğümü tek çocuğuyla (yapraksa null ile) değiştir.'),
    ret: m('Return the (possibly new) subtree root to the caller.', '(Belki yeni) alt ağaç kökünü çağırana döndür.'),
  },
  inputs: [
    { key: 'init', label: m('Tree (inserted in this order)', 'Ağaç (bu sırayla eklenir)'), type: 'list' },
    { key: 'x', label: m('Keys to remove', 'Silinecek anahtarlar'), type: 'list' },
  ],
  defaults: { init: '6 2 8 1 5 3 4', x: '2' },
  presets: [
    { name: m('Two children (Weiss figure)', 'İki çocuklu (Weiss şekli)'), values: { init: '6 2 8 1 5 3 4', x: '2' } },
    { name: m('One child', 'Tek çocuklu'), values: { init: '6 2 8 1 4 3', x: '4' } },
    { name: m('Leaf, then the root', 'Önce yaprak, sonra kök'), values: { init: '50 30 70 20 40 60 80', x: '20 50' } },
  ],
  run(input) {
    const init = parseList(input.init, { min: 1, max: 15 });
    const xs = parseList(input.x, { min: 1, max: 4 });
    const t = new Tracer(code);
    const T = new TreeSim(t);
    init.forEach((k) => T.insertSilent(k));
    t.snap('sig', m(`Remove ${xs.join(', ')}.`, `Silinecek: ${xs.join(', ')}.`), T.S());

    const rem = (x: number, id: number | null): number | null => {
      t.count('calls');
      t.stack.push(`remove(${x}, ${T.key(id)})`);
      t.set({ x });
      if (id == null) {
        t.snap('null', m('t == null.', 't == null.'), T.S());
        t.snap('nf', m(`${x} is not in the tree.`, `${x} ağaçta yok.`), T.S());
        t.stack.pop();
        return null;
      }
      T.path.push(id);
      const n = T.nodes[id];
      let result: number | null = id;
      if (x < n.key) {
        t.snap('cmpl', m(`${x} < ${n.key}: go left.`, `${x} < ${n.key}: sola git.`), T.S({ ghost: { key: x, near: id }, marks: [{ id, role: 'cmp' }] }));
        const before = n.left;
        const r = rem(x, n.left);
        n.left = r;
        t.set({ x });
        t.snap('goleft', r !== before ? m(`t.left = ${T.key(r)}: ${n.key} gets a new left child.`, `t.left = ${T.key(r)}: ${n.key}'in yeni sol çocuğu.`) : m(`t.left = ${T.key(r)} (unchanged).`, `t.left = ${T.key(r)} (değişmedi).`), T.S({ marks: [{ id, role: r !== before ? 'move' : 'active' }] }));
      } else if (x > n.key) {
        t.snap('cmpr', m(`${x} > ${n.key}: go right.`, `${x} > ${n.key}: sağa git.`), T.S({ ghost: { key: x, near: id }, marks: [{ id, role: 'cmp' }] }));
        const before = n.right;
        const r = rem(x, n.right);
        n.right = r;
        t.set({ x });
        t.snap('goright', r !== before ? m(`t.right = ${T.key(r)}: ${n.key} gets a new right child.`, `t.right = ${T.key(r)}: ${n.key}'in yeni sağ çocuğu.`) : m(`t.right = ${T.key(r)} (unchanged).`, `t.right = ${T.key(r)} (değişmedi).`), T.S({ marks: [{ id, role: r !== before ? 'move' : 'active' }] }));
      } else if (n.left != null && n.right != null) {
        t.snap('two', m(`Found ${x}. It has two children.`, `${x} bulundu. İki çocuğu var.`), T.S({ marks: [{ id, role: 'found' }] }));
        let s = n.right;
        const minPath: number[] = [s];
        while (T.nodes[s].left != null) {
          s = T.nodes[s].left!;
          minPath.push(s);
        }
        const sk = T.nodes[s].key;
        t.snap('copy', m(`findMin(t.right) = ${sk} (go right once, then left as far as possible). Copy ${sk} into this node.`, `findMin(t.right) = ${sk} (bir kez sağa, sonra gidebildiğin kadar sola). ${sk}'i bu düğüme kopyala.`), T.S({ marks: [...minPath.map((p) => ({ id: p, role: 'path' as const })), { id: s, role: 'found' }, { id, role: 'cmp' }] }));
        n.key = sk;
        t.snap('copy', m(`t.element = ${sk}. Now ${sk} appears twice; remove the lower copy.`, `t.element = ${sk}. Şimdi ${sk} iki kez var; alttakini sil.`), T.S({ marks: [{ id, role: 'write' }, { id: s, role: 'bad' }] }));
        t.snap('delmin', m(`remove(${sk}, t.right)`, `remove(${sk}, t.right)`), T.S({ marks: [{ id, role: 'write' }] }));
        const before = n.right;
        const r = rem(sk, n.right);
        n.right = r;
        t.set({ x });
        t.snap('delmin', r !== before ? m(`t.right = ${T.key(r)}.`, `t.right = ${T.key(r)}.`) : m(`t.right = ${T.key(r)} (unchanged).`, `t.right = ${T.key(r)} (değişmedi).`), T.S({ marks: [{ id, role: 'active' }] }));
      } else {
        const child = n.left != null ? n.left : n.right;
        t.snap('two', m(`Found ${x}. It does not have two children.`, `${x} bulundu. İki çocuğu yok.`), T.S({ marks: [{ id, role: 'found' }] }));
        t.snap('one', child == null ? m(`${x} is a leaf: it is replaced by null.`, `${x} bir yaprak: yerine null gelir.`) : m(`${x} has one child (${T.key(child)}): the child takes its place.`, `${x}'in tek çocuğu var (${T.key(child)}): çocuk onun yerine geçer.`), T.S({ marks: [{ id, role: 'bad' }, ...(child != null ? [{ id: child, role: 'sub' as const }] : [])] }));
        T.path.pop();
        delete T.nodes[id];
        if (T.root === id) T.root = child;
        result = child;
        t.snap('ret', m(`return ${T.key(child)}. The node is gone; the caller relinks.`, `return ${T.key(child)}. Düğüm silindi; çağıran yeniden bağlar.`), T.S(child != null ? { marks: [{ id: child, role: 'move' }] } : {}));
        t.stack.pop();
        return result;
      }
      t.snap('ret', m(`return ${n.key}.`, `return ${n.key}.`), T.S({ marks: [{ id, role: 'active' }] }));
      T.path.pop();
      t.stack.pop();
      return result;
    };
    for (const x of xs) {
      T.path = [];
      T.root = rem(x, T.root);
    }
    t.set({ x: undefined });
    T.path = [];
    t.snap('ret', m(`Done. In-order: [${T.inorder().join(', ')}].`, `Bitti. In-order: [${T.inorder().join(', ')}].`), T.S());
    return t.steps;
  },
  concept: [
    m('Three cases: leaf (just delete), one child (bypass), two children (copy successor, then delete successor).', 'Üç durum: yaprak (direkt sil), tek çocuk (atla), iki çocuk (ardılı kopyala, sonra ardılı sil).'),
    m('The successor = findMin(right subtree). It never has a left child.', 'Ardıl = findMin(sağ alt ağaç). Asla sol çocuğu olmaz.'),
    m('Lazy deletion is an alternative: just mark the node as deleted.', 'Alternatif: lazy deletion, düğümü sadece silindi olarak işaretle.'),
  ],
  complexity: [{ op: 'remove', best: 'O(1)', avg: 'O(log N)', worst: 'O(N)' }],
  pitfalls: [
    m('For two children use the minimum of the RIGHT subtree (or, symmetrically, the maximum of the left one).', 'İki çocukta SAĞ alt ağacın minimumunu kullan (ya da simetrik olarak solun maksimumunu).'),
    m('Many removals with this rule make the tree left-heavy over time.', 'Bu kuralla çok sayıda silme zamanla ağacı sola yatık yapar.'),
  ],
  blanks: [
    { label: 'two', text: 't.left != null && t.right != null', hint: m('The two-children case.', 'İki çocuklu durum.') },
    { label: 'copy', text: 'findMin(t.right)', hint: m('Smallest key of the right subtree.', 'Sağ alt ağacın en küçük anahtarı.') },
    { label: 'delmin', text: 'remove(t.element, t.right)', hint: m('Delete the successor from the right subtree.', 'Ardılı sağ alt ağaçtan sil.') },
    { label: 'one', text: '(t.left != null) ? t.left : t.right', accept: ['t.left != null ? t.left : t.right', '(t.left!=null)?t.left:t.right'], hint: m('Replace t by its only child.', 't\'yi tek çocuğuyla değiştir.') },
  ],
};
