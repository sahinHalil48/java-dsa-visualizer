import type { Frame } from '../engine/scene';
import type { VizState } from '../types';
import { arrayFrame } from './arrayViz';
import { hashFrame } from './hashViz';
import { heapFrame } from './heapViz';
import { bucketFrame, queueFrame, stackFrame } from './linearViz';
import { treeFrame } from './treeViz';

export function frameFor(st: VizState): Frame {
  switch (st.kind) {
    case 'array':
      return arrayFrame(st);
    case 'heap':
      return heapFrame(st);
    case 'tree':
      return treeFrame(st);
    case 'hash':
      return hashFrame(st);
    case 'stack':
      return stackFrame(st);
    case 'queue':
      return queueFrame(st);
    case 'buckets':
      return bucketFrame(st);
  }
}
