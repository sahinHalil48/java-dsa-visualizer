import { Scene } from '../engine/scene';
import { InputError } from '../engine/tracer';
import { COUNTER_LABELS, ROLE_LABELS, UI, tr } from '../i18n';
import type { Algorithm, Step, T } from '../types';
import { frameFor } from '../viz';
import { codeBlock } from './codeView';
import { h } from './dom';

interface Memory {
  values: Record<string, string>;
  idx: number;
  speed: number;
}
const memory = new Map<string, Memory>();

/** Learn tab: input bar, code (left), diagram (right), playback, notes. Returns a cleanup function. */
export function mountLearn(host: HTMLElement, alg: Algorithm): () => void {
  const mem: Memory = memory.get(alg.id) ?? { values: { ...alg.defaults }, idx: 0, speed: 1 };
  memory.set(alg.id, mem);

  // line number -> note
  const noteByLine = new Map<number, T>();
  for (const [label, note] of Object.entries(alg.notes)) {
    const ln = alg.code.labels[label];
    if (ln) noteByLine.set(ln, note);
  }

  let steps: Step[] = [];
  let idx = 0;
  let timer = 0;
  let preview: number | null = null;

  // ---------- input bar ----------
  const fields = alg.inputs.map((f) => {
    const id = `in-${alg.id}-${f.key}`;
    let control: HTMLInputElement | HTMLSelectElement;
    if (f.type === 'select') {
      control = h('select', { id }, ...(f.options ?? []).map((o) => h('option', { value: o.value }, tr(o.label))));
      control.value = mem.values[f.key] ?? '';
    } else {
      control = h('input', { id, type: 'text', value: mem.values[f.key] ?? '', spellcheck: 'false', autocomplete: 'off', inputmode: f.type === 'number' ? 'numeric' : 'text' });
      control.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') runNow();
      });
    }
    control.addEventListener('change', () => (mem.values[f.key] = control.value));
    control.addEventListener('input', () => (mem.values[f.key] = control.value));
    return { f, control, wrap: h('label', { class: 'field field-' + f.type, for: id }, h('span', {}, tr(f.label)), control) };
  });
  const setValues = (v: Record<string, string>) => {
    Object.assign(mem.values, v);
    for (const { f, control } of fields) if (v[f.key] !== undefined) control.value = v[f.key];
    runNow();
  };
  const presetSel = alg.presets?.length
    ? h(
        'select',
        {
          id: `preset-${alg.id}`,
          class: 'preset',
          'aria-label': tr(UI.examples),
          onchange: (e: Event) => {
            const i = Number((e.target as HTMLSelectElement).value);
            if (i >= 0) setValues(alg.presets![i].values);
            (e.target as HTMLSelectElement).value = '-1';
          },
        },
        h('option', { value: '-1' }, tr(UI.examples) + '…'),
        ...alg.presets.map((p, i) => h('option', { value: String(i) }, tr(p.name))),
      )
    : null;
  const errBox = h('div', { class: 'input-error', role: 'alert', hidden: true });
  const inputBar = h(
    'div',
    { class: 'inputbar' },
    h('div', { class: 'fields' }, fields.map((x) => x.wrap)),
    h(
      'div',
      { class: 'input-actions' },
      h('button', { class: 'btn primary', onclick: () => runNow() }, tr(UI.run)),
      alg.random ? h('button', { class: 'btn', onclick: () => setValues(alg.random!()) }, tr(UI.random)) : null,
      presetSel,
    ),
    errBox,
  );

  // ---------- code panel ----------
  const { el: codeEl, rows } = codeBlock(alg.code.lines, undefined, { noteLines: new Set(noteByLine.keys()) });
  const tip = h('div', { class: 'tip', hidden: true });
  const codeScroll = h('div', { class: 'code-scroll' }, codeEl, tip);
  const codePanel = h('section', { class: 'panel code-panel', 'aria-label': 'Java code' }, h('div', { class: 'panel-head' }, h('span', { class: 'lang-badge' }, 'Java'), h('span', { class: 'muted small' }, tr(UI.hoverHint))), codeScroll);

  rows.forEach((row, i) => {
    const line = i + 1;
    row.addEventListener('mouseenter', () => hoverLine(line, row));
    row.addEventListener('mouseleave', () => hoverLine(null, row));
    row.addEventListener('click', () => jumpToLine(line));
  });

  // ---------- diagram panel ----------
  const vizHost = h('div', { class: 'viz' });
  const banner = h('div', { class: 'preview-banner', hidden: true });
  const msg = h('div', { class: 'msg', 'aria-live': 'polite' });
  const lineNote = h('div', { class: 'line-note' });
  const varsEl = h('div', { class: 'chips' });
  const stackEl = h('ol', { class: 'callstack' });
  const countersEl = h('div', { class: 'chips' });
  const legendEl = h('div', { class: 'legend' });
  const vizPanel = h(
    'section',
    { class: 'panel viz-panel', 'aria-label': 'Diagram' },
    h('div', { class: 'viz-wrap' }, banner, vizHost),
    legendEl,
    h('div', { class: 'explain' }, msg, lineNote),
    h(
      'div',
      { class: 'watch' },
      h('div', { class: 'watch-box' }, h('h4', {}, tr(UI.variables)), varsEl),
      h('div', { class: 'watch-box stack-box' }, h('h4', {}, tr(UI.callStack)), stackEl),
      h('div', { class: 'watch-box' }, h('h4', {}, tr(UI.counters)), countersEl),
    ),
  );
  const scene = new Scene(vizHost);

  // ---------- playback ----------
  const slider = h('input', { type: 'range', min: '0', max: '0', value: '0', class: 'slider', 'aria-label': tr(UI.step), id: `slider-${alg.id}` });
  slider.addEventListener('input', () => go(Number(slider.value)));
  const counter = h('span', { class: 'stepcount' });
  const playBtn = h('button', { class: 'btn icon play', 'aria-label': 'Play', onclick: () => toggle() });
  const speedSel = h('select', { class: 'speed', 'aria-label': tr(UI.speed), id: `speed-${alg.id}` }, ...[0.5, 1, 2, 4].map((v) => h('option', { value: String(v) }, v + '×')));
  speedSel.value = String(mem.speed);
  speedSel.addEventListener('change', () => {
    mem.speed = Number(speedSel.value);
    if (timer) {
      stop();
      start();
    }
  });
  const btn = (label: string, aria: string, f: () => void) => h('button', { class: 'btn icon', 'aria-label': aria, title: aria, onclick: f }, label);
  const playback = h(
    'div',
    { class: 'playback' },
    btn('⏮', 'First step', () => go(0)),
    btn('◀', 'Previous step', () => go(idx - 1)),
    playBtn,
    btn('▶', 'Next step', () => go(idx + 1)),
    btn('⏭', 'Last step', () => go(steps.length - 1)),
    slider,
    counter,
    h('label', { class: 'speed-wrap' }, tr(UI.speed), speedSel),
  );

  // ---------- notes ----------
  const notes = h(
    'section',
    { class: 'notes' },
    h('div', { class: 'note-col note-concept' }, h('h3', {}, tr(UI.concept)), h('ul', {}, alg.concept.map((c) => h('li', {}, tr(c))))),
    h(
      'div',
      { class: 'note-col note-complexity' },
      h('h3', {}, tr(UI.complexity)),
      h(
        'div',
        { class: 'table-scroll' },
        h(
          'table',
          {},
          h('thead', {}, h('tr', {}, h('th', {}, tr(UI.op)), h('th', {}, tr(UI.best)), h('th', {}, tr(UI.avg)), h('th', {}, tr(UI.worst)))),
          h('tbody', {}, alg.complexity.map((r) => h('tr', {}, h('td', {}, tr(r.op)), h('td', {}, r.best ?? '–'), h('td', {}, r.avg ?? '–'), h('td', {}, r.worst ?? '–')))),
        ),
      ),
    ),
    h('div', { class: 'note-col note-pitfalls' }, h('h3', {}, tr(UI.pitfalls)), h('ul', {}, alg.pitfalls.map((c) => h('li', {}, tr(c))))),
  );

  host.replaceChildren(inputBar, h('div', { class: 'workspace' }, codePanel, vizPanel), playback, h('p', { class: 'muted small keys' }, tr(UI.keys)), notes);

  // ---------- behaviour ----------
  function runNow() {
    stop();
    errBox.hidden = true;
    try {
      for (const { f, control } of fields) mem.values[f.key] = control.value;
      steps = alg.run(mem.values);
    } catch (e) {
      const t = e instanceof InputError ? e.t : { en: String((e as Error).message), tr: String((e as Error).message) };
      errBox.textContent = tr(UI.inputError) + ': ' + tr(t);
      errBox.hidden = false;
      return;
    }
    slider.max = String(steps.length - 1);
    buildLegend();
    go(0, false);
  }

  function buildLegend() {
    const roles = new Set<string>();
    for (const st of steps) {
      const s = st.state as { marks?: { role: string }[]; ranges?: { role: string }[]; sortedTail?: boolean };
      s.marks?.forEach((mk) => roles.add(mk.role));
      s.ranges?.forEach((r) => r.role === 'sorted' && roles.add('sorted'));
      if (s.sortedTail) roles.add('sorted');
    }
    legendEl.replaceChildren(...[...roles].filter((r) => ROLE_LABELS[r]).map((r) => h('span', { class: 'lg lg-' + r }, h('i', {}), tr(ROLE_LABELS[r]))));
  }

  function draw(i: number, animate = true) {
    const st = steps[i];
    if (!st) return;
    scene.render(frameFor(st.state), animate);
  }

  function go(i: number, animate = true) {
    if (!steps.length) return;
    idx = Math.max(0, Math.min(steps.length - 1, i));
    mem.idx = idx;
    const st = steps[idx];
    scene.duration = Math.min(420, 900 / mem.speed);
    if (preview === null) draw(idx, animate);
    rows.forEach((r, k) => r.classList.toggle('on', k + 1 === st.line));
    const row = rows[st.line - 1];
    if (row) {
      // scroll only the code box, never the page
      const top = row.offsetTop,
        bottom = top + row.offsetHeight;
      if (top < codeScroll.scrollTop + 8) codeScroll.scrollTop = top - 48;
      else if (bottom > codeScroll.scrollTop + codeScroll.clientHeight - 8) codeScroll.scrollTop = bottom - codeScroll.clientHeight + 48;
    }
    msg.textContent = tr(st.msg);
    const note = noteByLine.get(st.line);
    lineNote.replaceChildren(...(note ? [h('b', {}, tr(UI.whatLine) + ': '), tr(note)] : []));
    varsEl.replaceChildren(...(st.vars.length ? st.vars.map(([k, v]) => h('span', { class: 'chip' }, h('b', {}, k), ' = ', String(v))) : [h('span', { class: 'muted small' }, '–')]));
    stackEl.replaceChildren(...(st.stack.length ? [...st.stack].reverse().map((f, k) => h('li', { class: k === 0 ? 'top' : '' }, f)) : [h('li', { class: 'muted' }, '–')]));
    const cs = Object.entries(st.counters);
    countersEl.replaceChildren(...(cs.length ? cs.map(([k, v]) => h('span', { class: 'chip chip-count' }, h('b', {}, String(v)), ' ', tr(COUNTER_LABELS[k]))) : [h('span', { class: 'muted small' }, '–')]));
    slider.value = String(idx);
    counter.textContent = `${tr(UI.step)} ${idx + 1} ${tr(UI.of)} ${steps.length}`;
    if (idx >= steps.length - 1) stop();
  }

  function stepsForLine(line: number) {
    const all: number[] = [];
    steps.forEach((s, k) => s.line === line && all.push(k));
    return all;
  }
  function targetForLine(line: number): number | null {
    const all = stepsForLine(line);
    if (!all.length) return null;
    return all.find((k) => k >= idx) ?? all[all.length - 1];
  }

  function hoverLine(line: number | null, row: HTMLElement) {
    if (line === null) {
      tip.hidden = true;
      preview = null;
      banner.hidden = true;
      vizHost.classList.remove('previewing');
      draw(idx, true);
      return;
    }
    const note = noteByLine.get(line);
    const target = targetForLine(line);
    const count = stepsForLine(line).length;
    tip.replaceChildren(
      ...([
      note ? h('div', { class: 'tip-note' }, tr(note)) : h('div', { class: 'tip-note muted' }, alg.code.lines[line - 1].trim() || ' '),
      target === null ? (note ? null : h('div', { class: 'tip-meta' }, tr(UI.notRun))) : h('div', { class: 'tip-meta' }, `${tr(UI.step)} ${target + 1} · ${count}×`),
      ].filter(Boolean) as Node[]),
    );
    tip.style.top = row.offsetTop + row.offsetHeight + 4 + 'px';
    tip.hidden = !note && target === null;
    if (target !== null && target !== idx) {
      preview = target;
      banner.textContent = `${tr(UI.preview)} (${tr(UI.step)} ${target + 1})`;
      banner.hidden = false;
      vizHost.classList.add('previewing');
      draw(target, true);
    }
  }

  function jumpToLine(line: number) {
    const target = targetForLine(line);
    if (target === null) return;
    const all = stepsForLine(line);
    // clicking the current line again moves to its next occurrence
    const next = target === idx ? all.find((k) => k > idx) ?? all[0] : target;
    preview = null;
    banner.hidden = true;
    vizHost.classList.remove('previewing');
    go(next);
  }

  function start() {
    if (idx >= steps.length - 1) go(0);
    playBtn.classList.add('playing');
    playBtn.setAttribute('aria-label', 'Pause');
    timer = window.setInterval(() => go(idx + 1), 1100 / mem.speed);
  }
  function stop() {
    clearInterval(timer);
    timer = 0;
    playBtn.classList.remove('playing');
    playBtn.setAttribute('aria-label', 'Play');
  }
  function toggle() {
    timer ? stop() : start();
  }

  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowRight') {
      go(idx + 1);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      go(idx - 1);
      e.preventDefault();
    } else if (e.key === ' ') {
      toggle();
      e.preventDefault();
    }
  };
  document.addEventListener('keydown', onKey);

  const restore = mem.idx;
  runNow();
  if (restore && restore < steps.length) go(restore, false);

  return () => {
    stop();
    document.removeEventListener('keydown', onKey);
  };
}
