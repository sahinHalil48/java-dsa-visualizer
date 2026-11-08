// A tiny animated SVG scene.
//
// Renderers describe a frame as:
//   - statics: elements that are simply redrawn (boxes, labels, backgrounds)
//   - tokens:  elements with a stable key and a position. When the same key
//              appears in the next frame at another position, it glides there.
//   - edges:   lines between two tokens; they follow the tokens while they move.
//
// This is what makes a swap, a percolation or an AVL rotation *move* on screen
// instead of jumping.

export const SVGNS = 'http://www.w3.org/2000/svg';

export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | undefined> = {},
  children: (SVGElement | string)[] = [],
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) el.setAttribute(k, String(v));
  for (const c of children) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}

export interface TokenSpec {
  key: string;
  x: number;
  y: number;
  cls?: string;
  build: () => SVGElement[];
}
export interface EdgeSpec {
  key: string;
  from: string;
  to: string;
  cls?: string;
  /** shorten the line at both ends (node radius) */
  inset?: number;
}
export interface Frame {
  width: number;
  height: number;
  under: SVGElement[]; // drawn below edges
  statics: SVGElement[]; // drawn below tokens
  tokens: TokenSpec[];
  edges: EdgeSpec[];
  over?: SVGElement[]; // drawn above everything
}

interface Live {
  el: SVGGElement;
  x: number;
  y: number;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
}

export class Scene {
  readonly svg: SVGSVGElement;
  private under = s('g');
  private edgeLayer = s('g', { class: 'edges' });
  private staticLayer = s('g');
  private tokenLayer = s('g');
  private overLayer = s('g');
  private live = new Map<string, Live>();
  private edges: { el: SVGLineElement; spec: EdgeSpec }[] = [];
  private raf = 0;
  duration = 380;

  constructor(host: HTMLElement) {
    this.svg = s('svg', { class: 'scene', role: 'img' });
    const defs = s('defs', {}, [
      s('marker', { id: 'arrowhead', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, [
        s('path', { d: 'M0 0 L10 5 L0 10 Z', class: 'arrowhead' }),
      ]),
    ]);
    this.svg.append(defs);
    this.svg.append(this.under, this.edgeLayer, this.staticLayer, this.tokenLayer, this.overLayer);
    host.append(this.svg);
  }

  render(f: Frame, animate = true) {
    cancelAnimationFrame(this.raf);
    // snap tokens to their current interpolated positions before re-targeting
    this.svg.setAttribute('viewBox', `0 0 ${Math.max(1, f.width)} ${Math.max(1, f.height)}`);
    this.svg.style.aspectRatio = `${f.width} / ${f.height}`;
    // very wide diagrams scroll sideways instead of shrinking to unreadable text
    this.svg.style.minWidth = f.width > 620 ? `${Math.round(f.width * 0.78)}px` : '';
    this.under.replaceChildren(...f.under);
    this.staticLayer.replaceChildren(...f.statics);
    this.overLayer.replaceChildren(...(f.over ?? []));

    const seen = new Set<string>();
    for (const t of f.tokens) {
      seen.add(t.key);
      let l = this.live.get(t.key);
      if (!l) {
        const el = s('g');
        el.classList.add('tok', 'tok-enter');
        this.tokenLayer.append(el);
        l = { el, x: t.x, y: t.y, fx: t.x, fy: t.y, tx: t.x, ty: t.y };
        this.live.set(t.key, l);
        requestAnimationFrame(() => el.classList.remove('tok-enter'));
      }
      l.fx = l.x;
      l.fy = l.y;
      l.tx = t.x;
      l.ty = t.y;
      l.el.setAttribute('class', 'tok' + (t.cls ? ' ' + t.cls : ''));
      l.el.replaceChildren(...t.build());
      // keep later tokens on top
      this.tokenLayer.append(l.el);
    }
    for (const [k, l] of this.live) {
      if (!seen.has(k)) {
        this.live.delete(k);
        const el = l.el;
        el.classList.add('tok-leave');
        setTimeout(() => el.remove(), 260);
      }
    }

    this.edgeLayer.replaceChildren();
    this.edges = f.edges.map((spec) => {
      const el = s('line', { class: 'edge' + (spec.cls ? ' ' + spec.cls : '') });
      this.edgeLayer.append(el);
      return { el, spec };
    });

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dur = animate && !reduce ? this.duration : 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = dur === 0 ? 1 : Math.min(1, (now - t0) / dur);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      for (const l of this.live.values()) {
        l.x = l.fx + (l.tx - l.fx) * e;
        l.y = l.fy + (l.ty - l.fy) * e;
        l.el.setAttribute('transform', `translate(${l.x.toFixed(2)} ${l.y.toFixed(2)})`);
      }
      this.drawEdges();
      if (p < 1) this.raf = requestAnimationFrame(tick);
    };
    tick(t0);
  }

  private drawEdges() {
    for (const { el, spec } of this.edges) {
      const a = this.live.get(spec.from);
      const b = this.live.get(spec.to);
      if (!a || !b) {
        el.setAttribute('visibility', 'hidden');
        continue;
      }
      el.removeAttribute('visibility');
      let x1 = a.x,
        y1 = a.y,
        x2 = b.x,
        y2 = b.y;
      const r = spec.inset ?? 0;
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const ux = (x2 - x1) / len,
        uy = (y2 - y1) / len;
      x1 += ux * r;
      y1 += uy * r;
      x2 -= ux * r;
      y2 -= uy * r;
      el.setAttribute('x1', x1.toFixed(1));
      el.setAttribute('y1', y1.toFixed(1));
      el.setAttribute('x2', x2.toFixed(1));
      el.setAttribute('y2', y2.toFixed(1));
    }
  }
}
