import { m } from '../../i18n';
import { java, parseNum } from '../../engine/code';
import { InputError, Tracer } from '../../engine/tracer';
import type { Algorithm, QueueState, StackState, Tok } from '../../types';

/** "3 5 - 7 -" → push/enqueue 3, push 5, pop, push 7, pop */
function parseOps(s: string): (number | null)[] {
  const parts = s.split(/[\s,;]+/).filter(Boolean);
  if (!parts.length) throw new InputError(m('Enter some operations, e.g. "3 5 - 7".', 'Birkaç işlem gir, örn. "3 5 - 7".'));
  if (parts.length > 16) throw new InputError(m('Use at most 16 operations.', 'En fazla 16 işlem gir.'));
  return parts.map((p) => {
    if (p === '-' || p.toLowerCase() === 'pop' || p.toLowerCase() === 'deq') return null;
    if (!/^-?\d+$/.test(p)) throw new InputError(m(`"${p}" is neither a number nor "-".`, `"${p}" ne bir sayı ne de "-".`));
    return parseInt(p, 10);
  });
}

const opsLabel = m('Operations: a number = push/enqueue, "-" = pop/dequeue', 'İşlemler: sayı = push/enqueue, "-" = pop/dequeue');

// ---------------- Stack ----------------
const stackCode = java(`
public void push(int x) {                            //@psig
    if (topOfStack == theArray.length - 1)           //@full
        throw new OverflowException();
    theArray[++topOfStack] = x;                      //@push
}

public int pop() {                                   //@osig
    if (isEmpty())                                   //@empty
        throw new UnderflowException();
    return theArray[topOfStack--];                   //@pop
}

public boolean isEmpty() {
    return topOfStack == -1;                         //@isempty
}
`);

export const stackAlg: Algorithm = {
  id: 'stack',
  category: 'basic',
  name: m('Stack (array)', 'Stack (dizi ile)'),
  summary: m('Last In, First Out. Push and pop happen at the same end, the top. Both are O(1).', 'Son giren ilk çıkar (LIFO). Push ve pop aynı uçta, tepede olur. İkisi de O(1).'),
  code: stackCode,
  notes: {
    psig: m('Put x on top.', 'x\'i tepeye koy.'),
    full: m('No room left in the array.', 'Dizide yer kalmadı.'),
    push: m('Pre-increment: first move topOfStack up, then write x there.', 'Ön artırma: önce topOfStack\'i yukarı al, sonra x\'i oraya yaz.'),
    osig: m('Remove and return the top element.', 'Tepedeki elemanı çıkar ve döndür.'),
    empty: m('Popping an empty stack is an error.', 'Boş stack\'ten pop yapmak hatadır.'),
    pop: m('Post-decrement: return theArray[topOfStack], then move topOfStack down. The value stays in memory but is no longer part of the stack.', 'Son azaltma: theArray[topOfStack]\'i döndür, sonra topOfStack\'i aşağı al. Değer bellekte kalır ama artık stack\'in parçası değildir.'),
    isempty: m('Empty stack: topOfStack = −1.', 'Boş stack: topOfStack = −1.'),
  },
  inputs: [
    { key: 'ops', label: opsLabel, type: 'list' },
    { key: 'cap', label: m('Capacity', 'Kapasite'), type: 'number' },
  ],
  defaults: { ops: '3 5 - 7 9 - -', cap: '5' },
  presets: [
    { name: m('Push and pop', 'Push ve pop'), values: { ops: '3 5 - 7 9 - -', cap: '5' } },
    { name: m('Overflow', 'Taşma (overflow)'), values: { ops: '1 2 3 4', cap: '3' } },
  ],
  run(input) {
    const ops = parseOps(input.ops);
    const cap = parseNum(input.cap, 1, 8, 'capacity');
    const t = new Tracer(stackCode);
    const cells: (Tok | null)[] = new Array(cap).fill(null);
    let top = -1;
    let id = 1;
    const S = (extra: Partial<StackState> = {}): StackState => ({ kind: 'stack', cells: cells.slice(), top, marks: [], ...extra });
    t.set({ topOfStack: top });
    t.snap('isempty', m(`Empty stack, capacity ${cap}. topOfStack = −1.`, `Boş stack, kapasite ${cap}. topOfStack = −1.`), S());
    for (const op of ops) {
      if (op !== null) {
        const tok = { id: id++, v: op };
        t.stack = [`push(${op})`];
        t.snap('psig', m(`push(${op})`, `push(${op})`), S({ incoming: tok }));
        if (top === cap - 1) {
          t.snap('full', m(`topOfStack = ${top} = length − 1: the stack is full → OverflowException.`, `topOfStack = ${top} = length − 1: stack dolu → OverflowException.`), S({ incoming: tok, marks: cells.map((_, i) => ({ idx: i, role: 'bad' as const })) }));
          continue;
        }
        t.snap('full', m(`topOfStack = ${top} < ${cap - 1}: there is room.`, `topOfStack = ${top} < ${cap - 1}: yer var.`), S({ incoming: tok }));
        top++;
        cells[top] = tok;
        t.count('moves');
        t.set({ topOfStack: top });
        t.snap('push', m(`topOfStack = ${top}, theArray[${top}] = ${op}.`, `topOfStack = ${top}, theArray[${top}] = ${op}.`), S({ marks: [{ idx: top, role: 'write' }] }));
      } else {
        t.stack = ['pop()'];
        t.snap('osig', m('pop()', 'pop()'), S());
        if (top === -1) {
          t.snap('empty', m('topOfStack = −1: empty → UnderflowException.', 'topOfStack = −1: boş → UnderflowException.'), S());
          continue;
        }
        t.snap('empty', m('Not empty.', 'Boş değil.'), S({ marks: [{ idx: top, role: 'active' }] }));
        const out = cells[top]!;
        cells[top] = null;
        top--;
        t.count('moves');
        t.set({ topOfStack: top });
        t.snap('pop', m(`return ${out.v}; topOfStack = ${top}.`, `return ${out.v}; topOfStack = ${top}.`), S({ out }));
      }
    }
    t.stack = [];
    t.snap('isempty', top === -1 ? m('The stack is empty again.', 'Stack yine boş.') : m(`Done. ${top + 1} element(s) left; the top is ${cells[top]!.v}.`, `Bitti. ${top + 1} eleman kaldı; tepedeki ${cells[top]!.v}.`), S());
    return t.steps;
  },
  concept: [
    m('LIFO: the last pushed element is the first popped.', 'LIFO: en son push edilen ilk pop edilir.'),
    m('Uses: undo, matching brackets, postfix evaluation, method calls (the call stack).', 'Kullanım: geri alma, parantez eşleme, postfix hesaplama, metot çağrıları (call stack).'),
  ],
  complexity: [{ op: 'push / pop / top', best: 'O(1)', avg: 'O(1)', worst: 'O(1)' }],
  pitfalls: [m('++topOfStack (pre) in push, topOfStack-- (post) in pop.', 'push\'ta ++topOfStack (ön), pop\'ta topOfStack-- (son).')],
  blanks: [
    { label: 'push', text: '++topOfStack', hint: m('Move up first, then write.', 'Önce yukarı çık, sonra yaz.') },
    { label: 'pop', text: 'topOfStack--', hint: m('Read first, then move down.', 'Önce oku, sonra aşağı in.') },
    { label: 'isempty', text: 'topOfStack == -1', hint: m('Index of the top in an empty stack.', 'Boş stack\'te tepenin index\'i.') },
  ],
};

// ---------------- Queue (circular array) ----------------
const queueCode = java(`
public void enqueue(int x) {                         //@esig
    if (currentSize == theArray.length)              //@full
        throw new OverflowException();
    back = increment(back);                          //@back
    theArray[back] = x;                              //@put
    currentSize++;                                   //@inc
}

public int dequeue() {                               //@dsig
    if (isEmpty())                                   //@empty
        throw new UnderflowException();
    currentSize--;                                   //@dec
    int value = theArray[front];                     //@take
    front = increment(front);                        //@front
    return value;                                    //@ret
}

private int increment(int x) {                       //@isig
    if (++x == theArray.length)                      //@wrap
        x = 0;                                       //@zero
    return x;
}
`);

export const queueAlg: Algorithm = {
  id: 'queue',
  category: 'basic',
  name: m('Queue (circular array)', 'Queue (dairesel dizi)'),
  summary: m('First In, First Out. Enqueue at the back, dequeue at the front. With wrap-around, the array is used like a ring and both operations are O(1).', 'İlk giren ilk çıkar (FIFO). Arkaya enqueue, önden dequeue. Sarmalama (wrap-around) ile dizi bir halka gibi kullanılır, iki işlem de O(1).'),
  code: queueCode,
  notes: {
    esig: m('Add x at the back.', 'x\'i arkaya ekle.'),
    full: m('We count elements with currentSize, because front and back alone cannot tell "full" from "empty".', 'Eleman sayısını currentSize ile tutarız, çünkü sadece front ve back ile "dolu" ve "boş" ayırt edilemez.'),
    back: m('Move back one step forward, wrapping to 0 at the end.', 'back\'i bir adım ilerlet, sonda 0\'a sar.'),
    put: m('Write x at the new back.', 'x\'i yeni back\'e yaz.'),
    inc: m('One more element.', 'Bir eleman daha.'),
    dsig: m('Remove from the front.', 'Önden çıkar.'),
    empty: m('Nothing to dequeue.', 'Çıkarılacak bir şey yok.'),
    dec: m('One element fewer.', 'Bir eleman eksik.'),
    take: m('The oldest element is at front.', 'En eski eleman front\'ta.'),
    front: m('Move front forward (with wrap-around). Nothing is shifted: that is why it is O(1).', 'front\'u ilerlet (sarmalayarak). Hiçbir şey kaydırılmaz: bu yüzden O(1).'),
    ret: m('Return the removed value.', 'Çıkarılan değeri döndür.'),
    isig: m('Circular increment.', 'Dairesel artırma.'),
    wrap: m('Past the last index?', 'Son index\'i geçtik mi?'),
    zero: m('Wrap around to the start of the array.', 'Dizinin başına sar.'),
  },
  inputs: [
    { key: 'ops', label: opsLabel, type: 'list' },
    { key: 'cap', label: m('Capacity', 'Kapasite'), type: 'number' },
  ],
  defaults: { ops: '3 5 7 - - 9 11 13 -', cap: '5' },
  presets: [
    { name: m('Wrap-around', 'Sarmalama (wrap-around)'), values: { ops: '3 5 7 - - 9 11 13 -', cap: '5' } },
    { name: m('Full queue', 'Dolu queue'), values: { ops: '1 2 3 4', cap: '3' } },
  ],
  run(input) {
    const ops = parseOps(input.ops);
    const cap = parseNum(input.cap, 2, 10, 'capacity');
    const t = new Tracer(queueCode);
    const cells: (Tok | null)[] = new Array(cap).fill(null);
    let front = 0,
      back = -1,
      size = 0,
      id = 1;
    const S = (extra: Partial<QueueState> = {}): QueueState => ({ kind: 'queue', cells: cells.slice(), front, back, size, marks: [], ...extra });
    t.set({ front, back, currentSize: size });
    t.snap('esig', m(`Empty queue: front = 0, back = −1, currentSize = 0.`, `Boş queue: front = 0, back = −1, currentSize = 0.`), S());
    const increment = (x: number, name: string) => {
      t.stack.push(`increment(${x})`);
      const nx = x + 1;
      if (nx === cap) {
        t.snap('wrap', m(`++${name} = ${nx} = length.`, `++${name} = ${nx} = length.`), S());
        t.snap('zero', m(`Wrap around: ${name} = 0.`, `Başa sar: ${name} = 0.`), S());
        t.stack.pop();
        return 0;
      }
      t.snap('wrap', m(`++${name} = ${nx}, inside the array.`, `++${name} = ${nx}, dizinin içinde.`), S());
      t.stack.pop();
      return nx;
    };
    for (const op of ops) {
      if (op !== null) {
        const tok = { id: id++, v: op };
        t.stack = [`enqueue(${op})`];
        t.snap('esig', m(`enqueue(${op})`, `enqueue(${op})`), S({ incoming: tok }));
        if (size === cap) {
          t.snap('full', m(`currentSize = ${size} = length: full → OverflowException.`, `currentSize = ${size} = length: dolu → OverflowException.`), S({ incoming: tok, marks: cells.map((_, i) => ({ idx: i, role: 'bad' as const })) }));
          continue;
        }
        t.snap('full', m(`currentSize = ${size} < ${cap}: there is room.`, `currentSize = ${size} < ${cap}: yer var.`), S({ incoming: tok }));
        back = increment(back, 'back');
        t.set({ back });
        t.snap('back', m(`back = ${back}.`, `back = ${back}.`), S({ incoming: tok, marks: [{ idx: back, role: 'path' }] }));
        cells[back] = tok;
        t.count('moves');
        t.snap('put', m(`theArray[${back}] = ${op}.`, `theArray[${back}] = ${op}.`), S({ marks: [{ idx: back, role: 'write' }] }));
        size++;
        t.set({ currentSize: size });
        t.snap('inc', m(`currentSize = ${size}.`, `currentSize = ${size}.`), S());
      } else {
        t.stack = ['dequeue()'];
        t.snap('dsig', m('dequeue()', 'dequeue()'), S());
        if (size === 0) {
          t.snap('empty', m('Empty → UnderflowException.', 'Boş → UnderflowException.'), S());
          continue;
        }
        t.snap('empty', m('Not empty.', 'Boş değil.'), S({ marks: [{ idx: front, role: 'active' }] }));
        size--;
        t.set({ currentSize: size });
        t.snap('dec', m(`currentSize = ${size}.`, `currentSize = ${size}.`), S({ marks: [{ idx: front, role: 'active' }] }));
        const out = cells[front]!;
        cells[front] = null;
        t.count('moves');
        t.set({ value: out.v });
        t.snap('take', m(`value = theArray[${front}] = ${out.v}.`, `value = theArray[${front}] = ${out.v}.`), S({ out }));
        front = increment(front, 'front');
        t.set({ front });
        t.snap('front', m(`front = ${front}.`, `front = ${front}.`), S({ out }));
        t.snap('ret', m(`return ${out.v}.`, `return ${out.v}.`), S({ out }));
        t.set({ value: undefined });
      }
    }
    t.stack = [];
    t.snap('esig', m(`Done. currentSize = ${size}, front = ${front}, back = ${back}.`, `Bitti. currentSize = ${size}, front = ${front}, back = ${back}.`), S());
    return t.steps;
  },
  concept: [
    m('FIFO: elements leave in the order they arrived.', 'FIFO: elemanlar geldikleri sırayla çıkar.'),
    m('Circular array: front and back move forward and wrap around; nothing is ever shifted.', 'Dairesel dizi: front ve back ilerler ve başa sarar; hiçbir şey kaydırılmaz.'),
    m('Uses: printer jobs, BFS, buffering, OS scheduling.', 'Kullanım: yazıcı işleri, BFS, tamponlama, OS zamanlama.'),
  ],
  complexity: [{ op: 'enqueue / dequeue', best: 'O(1)', avg: 'O(1)', worst: 'O(1)' }],
  pitfalls: [
    m('Without wrap-around, back reaches the end while the front cells are free: the array looks full but is not.', 'Sarmalama olmadan back sona ulaşır ama öndeki hücreler boştur: dizi dolu görünür ama değildir.'),
    m('Empty and full both can have back just before front, so keep currentSize.', 'Boş ve dolu durumda back, front\'un hemen önünde olabilir; bu yüzden currentSize tutulur.'),
  ],
  blanks: [
    { label: 'back', text: 'increment(back)', hint: m('Advance back circularly.', 'back\'i dairesel ilerlet.') },
    { label: 'take', text: 'theArray[front]', hint: m('Where is the oldest element?', 'En eski eleman nerede?') },
    { label: 'front', text: 'front = increment(front)', hint: m('Advance front circularly.', 'front\'u dairesel ilerlet.') },
    { label: 'wrap', text: '++x == theArray.length', hint: m('Did we step past the last index?', 'Son index\'i geçtik mi?') },
  ],
};
