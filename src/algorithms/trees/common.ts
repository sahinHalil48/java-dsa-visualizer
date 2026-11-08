import { m } from '../../i18n';
import { Tracer } from '../../engine/tracer';
import type { Role, T, TNode, TreeState } from '../../types';

/** Java for the two single rotations (Weiss), shared by the rotation demo and AVL insert. */
export const ROTATIONS = `
private AvlNode rotateWithLeftChild(AvlNode k2) {      //@rsig
    AvlNode k1 = k2.left;                               //@rk1
    k2.left = k1.right;                                 //@rmoveB
    k1.right = k2;                                      //@rlink
    k2.height = Math.max(height(k2.left), height(k2.right)) + 1;  //@rh2
    k1.height = Math.max(height(k1.left), k2.height) + 1;         //@rh1
    return k1;                                          //@rret
}

private AvlNode rotateWithRightChild(AvlNode k1) {     //@lsig
    AvlNode k2 = k1.right;                              //@lk2
    k1.right = k2.left;                                 //@lmoveB
    k2.left = k1;                                       //@llink
    k1.height = Math.max(height(k1.left), height(k1.right)) + 1;  //@lh1
    k2.height = Math.max(height(k2.right), k1.height) + 1;        //@lh2
    return k2;                                          //@lret
}`;

export const rotationNotes: Record<string, T> = {
  rsig: m('Right rotation (single rotation for case 1, left-left). k2 is the unbalanced node, k1 its left child.', 'Sağ rotasyon (durum 1, sol-sol için tek rotasyon). k2 dengesiz düğüm, k1 onun sol çocuğu.'),
  rk1: m('k1 = left child of k2. It will become the new root of this subtree.', 'k1 = k2\'nin sol çocuğu. Bu alt ağacın yeni kökü olacak.'),
  rmoveB: m('The middle subtree B (k1.right) changes parents: it becomes k2.left. Its keys are between k1 and k2, so the BST order stays correct.', 'Ortadaki B alt ağacı (k1.right) ebeveyn değiştirir: k2.left olur. Anahtarları k1 ile k2 arasında, BST sırası bozulmaz.'),
  rlink: m('k2 goes under k1 as its right child.', 'k2, k1\'in altına sağ çocuk olarak girer.'),
  rh2: m('Update k2 first: it is now lower in the tree.', 'Önce k2\'yi güncelle: artık ağaçta daha aşağıda.'),
  rh1: m('Then k1, which depends on k2.', 'Sonra k2\'ye bağlı olan k1.'),
  rret: m('The caller stores k1 in place of k2 (parent.left/right = k1, or root = k1). Only a constant number of pointers change: O(1).', 'Çağıran, k2\'nin yerine k1\'i koyar (parent.left/right = k1 ya da root = k1). Sabit sayıda pointer değişir: O(1).'),
  lsig: m('Left rotation (single rotation for case 4, right-right). k1 is the unbalanced node, k2 its right child.', 'Sol rotasyon (durum 4, sağ-sağ için tek rotasyon). k1 dengesiz düğüm, k2 onun sağ çocuğu.'),
  lk2: m('k2 = right child of k1. It will become the new root of this subtree.', 'k2 = k1\'in sağ çocuğu. Bu alt ağacın yeni kökü olacak.'),
  lmoveB: m('The middle subtree B (k2.left) moves to k1.right. Its keys are between k1 and k2.', 'Ortadaki B alt ağacı (k2.left) k1.right\'a taşınır. Anahtarları k1 ile k2 arasında.'),
  llink: m('k1 goes under k2 as its left child.', 'k1, k2\'nin altına sol çocuk olarak girer.'),
  lh1: m('Update k1 first: it is now lower.', 'Önce k1\'i güncelle: artık daha aşağıda.'),
  lh2: m('Then k2.', 'Sonra k2.'),
  lret: m('The caller stores k2 in place of k1. O(1) work.', 'Çağıran, k1\'in yerine k2\'yi koyar. O(1) iş.'),
};

export class TreeSim {
  nodes: Record<number, TNode> = {};
  root: number | null = null;
  nextId = 1;
  path: number[] = [];
  constructor(
    public t: Tracer,
    public avl = false,
  ) {}

  key(id: number | null) {
    return id == null ? 'null' : String(this.nodes[id].key);
  }
  h(id: number | null): number {
    return id == null || !this.nodes[id] ? -1 : this.nodes[id].h ?? 0;
  }
  fix(id: number) {
    const n = this.nodes[id];
    n.h = Math.max(this.h(n.left), this.h(n.right)) + 1;
  }
  make(key: number): number {
    const id = this.nextId++;
    this.nodes[id] = { id, key, left: null, right: null, h: 0 };
    return id;
  }
  S(extra: Partial<TreeState> = {}): TreeState {
    const marks: { id: number; role: Role }[] = [...this.path.map((id) => ({ id, role: 'path' as Role })), ...(extra.marks ?? [])];
    return { kind: 'tree', nodes: this.nodes, root: this.root, avl: this.avl, ...extra, marks };
  }

  // ----- silent helpers (used to build the starting tree) -----
  insertSilent(key: number) {
    const ins = (t: number | null): number => {
      if (t == null) return this.make(key);
      const n = this.nodes[t];
      if (key < n.key) n.left = ins(n.left);
      else if (key > n.key) n.right = ins(n.right);
      if (!this.avl) return t;
      return this.balanceSilent(t);
    };
    this.root = ins(this.root);
  }
  private rr(k2: number) {
    const k1 = this.nodes[k2].left!;
    this.nodes[k2].left = this.nodes[k1].right;
    this.nodes[k1].right = k2;
    this.fix(k2);
    this.fix(k1);
    return k1;
  }
  private rl(k1: number) {
    const k2 = this.nodes[k1].right!;
    this.nodes[k1].right = this.nodes[k2].left;
    this.nodes[k2].left = k1;
    this.fix(k1);
    this.fix(k2);
    return k2;
  }
  balanceSilent(t: number): number {
    const n = this.nodes[t];
    if (this.h(n.left) - this.h(n.right) > 1) {
      const l = this.nodes[n.left!];
      if (this.h(l.left) >= this.h(l.right)) t = this.rr(t);
      else {
        n.left = this.rl(n.left!);
        t = this.rr(t);
      }
    } else if (this.h(n.right) - this.h(n.left) > 1) {
      const r = this.nodes[n.right!];
      if (this.h(r.right) >= this.h(r.left)) t = this.rl(t);
      else {
        n.right = this.rr(n.right!);
        t = this.rl(t);
      }
    }
    this.fix(t);
    return t;
  }
  computeHeights() {
    const go = (id: number | null): number => {
      if (id == null) return -1;
      const n = this.nodes[id];
      n.h = Math.max(go(n.left), go(n.right)) + 1;
      return n.h;
    };
    go(this.root);
  }
  findParent(id: number): { parent: number | null; side: 'left' | 'right' | null } {
    for (const n of Object.values(this.nodes)) {
      if (n.left === id) return { parent: n.id, side: 'left' };
      if (n.right === id) return { parent: n.id, side: 'right' };
    }
    return { parent: null, side: null };
  }
  /** store `newRoot` where `oldRoot` used to hang (what the caller of a rotation does) */
  reattach(oldParent: { parent: number | null; side: 'left' | 'right' | null }, newRoot: number) {
    if (oldParent.parent == null) this.root = newRoot;
    else this.nodes[oldParent.parent][oldParent.side!] = newRoot;
  }

  // ----- animated rotations: snap on the shared Java labels -----
  /** right rotation at k2 (rotateWithLeftChild). Returns k1. Does NOT reattach. */
  rotateRight(k2: number, extraMarks: { id: number; role: Role }[] = []): number {
    const t = this.t;
    t.count('rotations');
    t.stack.push(`rotateWithLeftChild(${this.key(k2)})`);
    t.snap('rsig', m(`Right rotation at k2 = ${this.key(k2)}.`, `k2 = ${this.key(k2)} üzerinde sağ rotasyon.`), this.S({ labels: [{ id: k2, text: 'k2' }], marks: [{ id: k2, role: 'bad' }, ...extraMarks] }));
    const k1 = this.nodes[k2].left!;
    const B = this.nodes[k1].right;
    const L = () => [{ id: k2, text: 'k2' }, { id: k1, text: 'k1' }];
    const BM = (): { id: number; role: Role }[] => (B != null ? [{ id: B, role: 'sub' }] : []);
    t.snap('rk1', m(`k1 = k2.left = ${this.key(k1)}. Middle subtree B = k1.right = ${this.key(B)}.`, `k1 = k2.left = ${this.key(k1)}. Ortadaki B alt ağacı = k1.right = ${this.key(B)}.`), this.S({ labels: L(), marks: [...BM(), { id: k1, role: 'active' }] }));
    this.nodes[k2].left = B;
    t.snap('rmoveB', m(`k2.left = k1.right: B (${this.key(B)}) is now under ${this.key(k2)}. k1 is cut off for a moment (dashed).`, `k2.left = k1.right: B (${this.key(B)}) artık ${this.key(k2)}'nin altında. k1 bir an kopuk kalır (kesikli).`), this.S({ labels: L(), marks: [...BM(), { id: k2, role: 'move' }] }));
    this.nodes[k1].right = k2;
    t.snap('rlink', m(`k1.right = k2: ${this.key(k2)} hangs under ${this.key(k1)}.`, `k1.right = k2: ${this.key(k2)}, ${this.key(k1)}'in altına asılır.`), this.S({ labels: L(), marks: [...BM(), { id: k1, role: 'move' }] }));
    this.fix(k2);
    t.snap('rh2', m(`k2.height = ${this.nodes[k2].h}.`, `k2.height = ${this.nodes[k2].h}.`), this.S({ labels: L(), marks: [{ id: k2, role: 'write' }] }));
    this.fix(k1);
    t.snap('rh1', m(`k1.height = ${this.nodes[k1].h}.`, `k1.height = ${this.nodes[k1].h}.`), this.S({ labels: L(), marks: [{ id: k1, role: 'write' }] }));
    t.stack.pop();
    return k1;
  }
  /** left rotation at k1 (rotateWithRightChild). Returns k2. Does NOT reattach. */
  rotateLeft(k1: number, extraMarks: { id: number; role: Role }[] = []): number {
    const t = this.t;
    t.count('rotations');
    t.stack.push(`rotateWithRightChild(${this.key(k1)})`);
    t.snap('lsig', m(`Left rotation at k1 = ${this.key(k1)}.`, `k1 = ${this.key(k1)} üzerinde sol rotasyon.`), this.S({ labels: [{ id: k1, text: 'k1' }], marks: [{ id: k1, role: 'bad' }, ...extraMarks] }));
    const k2 = this.nodes[k1].right!;
    const B = this.nodes[k2].left;
    const L = () => [{ id: k1, text: 'k1' }, { id: k2, text: 'k2' }];
    const BM = (): { id: number; role: Role }[] => (B != null ? [{ id: B, role: 'sub' }] : []);
    t.snap('lk2', m(`k2 = k1.right = ${this.key(k2)}. Middle subtree B = k2.left = ${this.key(B)}.`, `k2 = k1.right = ${this.key(k2)}. Ortadaki B alt ağacı = k2.left = ${this.key(B)}.`), this.S({ labels: L(), marks: [...BM(), { id: k2, role: 'active' }] }));
    this.nodes[k1].right = B;
    t.snap('lmoveB', m(`k1.right = k2.left: B (${this.key(B)}) is now under ${this.key(k1)}. k2 is cut off for a moment (dashed).`, `k1.right = k2.left: B (${this.key(B)}) artık ${this.key(k1)}'in altında. k2 bir an kopuk kalır (kesikli).`), this.S({ labels: L(), marks: [...BM(), { id: k1, role: 'move' }] }));
    this.nodes[k2].left = k1;
    t.snap('llink', m(`k2.left = k1: ${this.key(k1)} hangs under ${this.key(k2)}.`, `k2.left = k1: ${this.key(k1)}, ${this.key(k2)}'nin altına asılır.`), this.S({ labels: L(), marks: [...BM(), { id: k2, role: 'move' }] }));
    this.fix(k1);
    t.snap('lh1', m(`k1.height = ${this.nodes[k1].h}.`, `k1.height = ${this.nodes[k1].h}.`), this.S({ labels: L(), marks: [{ id: k1, role: 'write' }] }));
    this.fix(k2);
    t.snap('lh2', m(`k2.height = ${this.nodes[k2].h}.`, `k2.height = ${this.nodes[k2].h}.`), this.S({ labels: L(), marks: [{ id: k2, role: 'write' }] }));
    t.stack.pop();
    return k2;
  }

  inorder(): number[] {
    const out: number[] = [];
    const go = (id: number | null) => {
      if (id == null) return;
      go(this.nodes[id].left);
      out.push(this.nodes[id].key);
      go(this.nodes[id].right);
    };
    go(this.root);
    return out;
  }
}
