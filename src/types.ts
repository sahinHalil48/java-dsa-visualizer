// Shared types for the whole app.
// Every algorithm produces a list of Steps. A Step says:
//   - which Java line is running,
//   - what the data structure looks like right after that line,
//   - a short explanation (in English and Turkish).
// The UI simply plays these steps back.

/** A bilingual text. */
export type T = { en: string; tr: string };

/** A value that can move around on screen. `id` stays the same while it moves. */
export type Tok = { id: number; v: number };

/** How an element is highlighted in the diagram. */
export type Role =
  | 'cmp' // being compared
  | 'move' // being moved / shifted
  | 'swap' // being swapped
  | 'write' // just written to its final place in this step
  | 'pivot' // quicksort pivot
  | 'min' // current minimum
  | 'found' // search succeeded
  | 'bad' // a rule is broken (heap order, AVL balance)
  | 'path' // on the search path
  | 'new' // newly created
  | 'active' // the element we are working on
  | 'sub'; // a whole subtree that moves (rotations)

export type Row = 'main' | 'aux';

export interface Ptr {
  name: string;
  idx: number;
  row?: Row;
}
export interface Mark {
  idx: number;
  role: Role;
  row?: Row;
}
export interface Range {
  from: number;
  to: number;
  role: 'sorted' | 'active' | 'left' | 'right' | 'dim';
  row?: Row;
}

// ---------- Visualization states (one per diagram kind) ----------

export interface ArrayState {
  kind: 'array';
  cells: (Tok | null)[];
  /** optional second row, e.g. the tmp array of mergesort or the count array */
  aux?: { label: string; cells: (Tok | null)[] };
  /** a value held in a variable, drawn above column `at` (e.g. tmp in insertion sort) */
  float?: { label: string; tok: Tok | null; at: number };
  ptrs: Ptr[];
  marks: Mark[];
  ranges: Range[];
}

export interface HeapState {
  kind: 'heap';
  /** 1 = root at index 1 (PQ slides), 0 = root at index 0 (heapsort) */
  base: 0 | 1;
  cells: (Tok | null)[];
  /** last index that belongs to the heap */
  hi: number;
  float?: { label: string; tok: Tok; at: number };
  marks: Mark[];
  ptrs: Ptr[];
  /** heapsort: indexes > hi are the sorted part */
  sortedTail?: boolean;
  maxHeap?: boolean;
}

export interface TNode {
  id: number;
  key: number;
  left: number | null;
  right: number | null;
  h?: number;
}
export interface TreeState {
  kind: 'tree';
  nodes: Record<number, TNode>;
  root: number | null;
  marks: { id: number; role: Role }[];
  /** small text labels next to nodes, e.g. k1, k2, t */
  labels?: { id: number; text: string }[];
  /** the key we are inserting / searching, drawn next to node `near` */
  ghost?: { key: number; near: number | null; side?: 'left' | 'right' };
  output?: { label: string; values: number[] };
  avl?: boolean;
}

export interface HashState {
  kind: 'hash';
  mode: 'chain' | 'probe';
  slots: (Tok | null)[];
  chains: Tok[][];
  marks: Mark[];
  /** the formula being computed, e.g. "h(89) = 89 % 10 = 9" */
  calc?: string;
  /** probe sequence visited so far (slot indexes) */
  probe?: number[];
  incoming?: { tok: Tok; at: number } | null;
  size: number;
}

export interface StackState {
  kind: 'stack';
  cells: (Tok | null)[];
  top: number;
  marks: Mark[];
  incoming?: Tok | null;
  out?: Tok | null;
}

export interface QueueState {
  kind: 'queue';
  cells: (Tok | null)[];
  front: number;
  back: number;
  size: number;
  marks: Mark[];
  incoming?: Tok | null;
  out?: Tok | null;
}

export interface BucketState {
  kind: 'buckets';
  cells: (Tok | null)[];
  buckets: Tok[][];
  place: number;
  digits: number;
  marks: Mark[];
  activeBucket?: number;
}

export type VizState = ArrayState | HeapState | TreeState | HashState | StackState | QueueState | BucketState;

// ---------- Steps and algorithms ----------

export type CounterKey = 'cmp' | 'moves' | 'swaps' | 'probes' | 'rotations' | 'calls' | 'visits';

export interface Step {
  line: number; // 1-based line in the Java code
  msg: T;
  state: VizState;
  vars: [string, string | number][];
  stack: string[];
  counters: Partial<Record<CounterKey, number>>;
}

export interface ParsedCode {
  lines: string[];
  labels: Record<string, number>;
}

export interface InputField {
  key: string;
  label: T;
  type: 'list' | 'number' | 'select';
  options?: { value: string; label: T }[];
}

export interface Blank {
  /** label of the code line that contains the blank */
  label: string;
  /** exact text in that line that gets hidden */
  text: string;
  /** other accepted answers */
  accept?: string[];
  hint: T;
}

export type CategoryId = 'basic' | 'sorting' | 'heap' | 'trees' | 'hashing';

export interface Algorithm {
  id: string;
  category: CategoryId;
  name: T;
  /** one-line description */
  summary: T;
  code: ParsedCode;
  /** what each labelled line does (shown on hover) */
  notes: Record<string, T>;
  inputs: InputField[];
  defaults: Record<string, string>;
  presets?: { name: T; values: Record<string, string> }[];
  random?: () => Record<string, string>;
  run(input: Record<string, string>): Step[];
  /** key ideas, shown as blue cards */
  concept: T[];
  /** complexity rows */
  complexity: { op: T | string; best?: string; avg?: string; worst?: string }[];
  /** exam traps, shown as orange cards */
  pitfalls: T[];
  blanks: Blank[];
}
