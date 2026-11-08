import type { CounterKey, ParsedCode, Step, T, VizState } from '../types';

export class InputError extends Error {
  constructor(public t: T) {
    super(t.en);
  }
}

const MAX_STEPS = 5000;

/**
 * The Tracer records Steps while an algorithm runs.
 * The algorithm code calls `snap(label, msg, state)` right after a Java line "runs".
 */
export class Tracer {
  steps: Step[] = [];
  counters: Partial<Record<CounterKey, number>> = {};
  vars: Record<string, string | number | undefined> = {};
  stack: string[] = [];

  constructor(private code: ParsedCode) {}

  count(k: CounterKey, by = 1) {
    this.counters[k] = (this.counters[k] ?? 0) + by;
  }

  /** set (merge) watched variables; pass undefined to hide one */
  set(v: Record<string, string | number | undefined>) {
    Object.assign(this.vars, v);
  }

  snap(label: string, msg: T, state: VizState) {
    const line = this.code.labels[label];
    if (line === undefined) throw new Error(`Unknown code label "${label}"`);
    if (this.steps.length >= MAX_STEPS) {
      throw new Error('Too many steps');
    }
    this.steps.push({
      line,
      msg,
      state: structuredClone(state),
      vars: Object.entries(this.vars).filter((e): e is [string, string | number] => e[1] !== undefined),
      stack: [...this.stack],
      counters: { ...this.counters },
    });
  }
}
