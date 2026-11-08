import { m } from '../i18n';
import type { Algorithm, CategoryId, T } from '../types';
import { queueAlg, stackAlg } from './basic/stackQueue';
import { chaining } from './hashing/chaining';
import { doubleHashing, linearProbing, quadraticProbing } from './hashing/probing';
import { buildHeap } from './heap/buildHeap';
import { heapDeleteMin } from './heap/heapDeleteMin';
import { heapInsert } from './heap/heapInsert';
import { bubbleSort } from './sorting/bubbleSort';
import { countingSort } from './sorting/countingSort';
import { heapSort } from './sorting/heapSort';
import { insertionSort } from './sorting/insertionSort';
import { mergeSort } from './sorting/mergeSort';
import { quickSort } from './sorting/quickSort';
import { radixSort } from './sorting/radixSort';
import { selectionSort } from './sorting/selectionSort';
import { avlInsert } from './trees/avlInsert';
import { bstFind } from './trees/bstFind';
import { bstInsert } from './trees/bstInsert';
import { bstRemove } from './trees/bstRemove';
import { rotations } from './trees/rotations';
import { traversals } from './trees/traversals';

// To add a new algorithm: write one file that exports an `Algorithm`
// and add it to this list. Nothing else needs to change.
export const ALGORITHMS: Algorithm[] = [
  stackAlg,
  queueAlg,
  traversals,
  bstFind,
  bstInsert,
  bstRemove,
  rotations,
  avlInsert,
  heapInsert,
  heapDeleteMin,
  buildHeap,
  insertionSort,
  selectionSort,
  bubbleSort,
  heapSort,
  mergeSort,
  quickSort,
  countingSort,
  radixSort,
  chaining,
  linearProbing,
  quadraticProbing,
  doubleHashing,
];

export const CATEGORIES: { id: CategoryId; name: T }[] = [
  { id: 'basic', name: m('Stacks & Queues', 'Stack ve Queue') },
  { id: 'trees', name: m('Trees (BST, AVL)', 'Ağaçlar (BST, AVL)') },
  { id: 'heap', name: m('Priority Queues (Heap)', 'Priority Queue (Heap)') },
  { id: 'sorting', name: m('Sorting', 'Sıralama') },
  { id: 'hashing', name: m('Hashing', 'Hashing') },
];
