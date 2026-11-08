import { Scene } from '../engine/scene';
import { InputError } from '../engine/tracer';
import { ROLE_LABELS, UI, tr } from '../i18n';
import type { Algorithm, Step } from '../types';
import { frameFor } from '../viz';
import { codeBlock } from './codeView';
import { h, store } from './dom';

interface Memory {
  values: Record<string, string>;
  idx: number;
  speed: number;
}
const memory = new Map<string, Memory>();
const ZOOMS = [0.6, 0.8, 1, 1.25, 1.5, 2, 2.5];

/**
 * Learn tab, kept deliberately simple:
 *   input bar
 *   code (read-only, running line highlighted)  |  diagram with ◀ ▶ arrows, zoom and full screen
 *   one-sentence explanation of the step, variables
 *   playback bar
 *   complexity table
 */
export function mountLearn(host: HTMLElement, alg: Algorithm): () => void {
  const mem: Memory = memory.get(alg.id) ?? { values: { ...alg.defaults }, idx: 0, speed: 1 };
  memory.set(alg.id, mem);

  let steps: Step[] = [];
  let idx = 0;
  let timer = 0;
  let zoom = 1;
  let varNames: string[] = [];
  let hideCode = store('hideCode') === '1';

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
    control.addEventListener('input', () => (mem.values[f.key] = control.value));
    control.addEventListener('change', () => (mem.values[f.key] = control.value));
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

  // ---------- code panel (read only) ----------
  const { el: codeEl, rows } = codeBlock(alg.code.lines);
  const codeScroll = h('div', { class: 'code-scroll' }, codeEl);
  const codePanel = h('section', { class: 'panel code-panel', 'aria-label': 'Java code' }, h('div', { class: 'panel-head' }, h('span', { class: 'lang-badge' }, 'Java')), codeScroll);

  // ---------- diagram panel ----------
  const vizHost = h('div', { class: 'viz' });
  const vizWrap = h('div', { class: 'viz-wrap' }, vizHost);
  const prevBig = h('button', { class: 'arrow-btn', 'aria-label': tr(UI.prev), title: tr(UI.prev), onclick: () => go(idx - 1) }, '‹');
  const nextBig = h('button', { class: 'arrow-btn', 'aria-label': tr(UI.next), title: tr(UI.next), onclick: () => go(idx + 1) }, '›');
  const zoomLabel = h('span', { class: 'zoom-label' }, '100%');
  const codeToggle = h('button', { class: 'btn small', onclick: () => setHideCode(!hideCode) });
  const expandBtn = h('button', { class: 'btn small', onclick: () => setExpanded(!vizPanel.classList.contains('expanded')) });
  const stepBadge = h('span', { class: 'step-badge' });
  const msg = h('p', { class: 'msg', 'aria-live': 'polite' });
  const legendEl = h('div', { class: 'legend' });
  const varsEl = h('div', { class: 'chips' });
  const stackEl = h('div', { class: 'stack-line' });
  const vizPanel = h(
    'section',
    { class: 'panel viz-panel', 'aria-label': 'Diagram' },
    h(
      'div',
      { class: 'viz-toolbar' },
      h('button', { class: 'btn small icon-s', 'aria-label': tr(UI.zoomOut), title: tr(UI.zoomOut), onclick: () => setZoom(-1) }, '−'),
      zoomLabel,
      h('button', { class: 'btn small icon-s', 'aria-label': tr(UI.zoomIn), title: tr(UI.zoomIn), onclick: () => setZoom(1) }, '+'),
      h('span', { class: 'spacer' }),
      codeToggle,
      expandBtn,
    ),
    h('div', { class: 'stage' }, prevBig, vizWrap, nextBig),
    h('div', { class: 'caption' }, stepBadge, msg),
    legendEl,
    h('div', { class: 'vars-row' }, varsEl, stackEl),
  );
  const scene = new Scene(vizHost);

  // ---------- playback ----------
  const slider = h('input', { type: 'range', min: '0', max: '0', value: '0', class: 'slider', 'aria-label': tr(UI.step), id: `slider-${alg.id}` });
  slider.addEventListener('input', () => go(Number(slider.value)));
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
    btn('⏮', tr(UI.first), () => go(0)),
    btn('◀', tr(UI.prev), () => go(idx - 1)),
    playBtn,
    btn('▶', tr(UI.next), () => go(idx + 1)),
    btn('⏭', tr(UI.last), () => go(steps.length - 1)),
    slider,
    h('label', { class: 'speed-wrap' }, tr(UI.speed), speedSel),
  );

  // ---------- complexity ----------
  const complexity = h(
    'section',
    { class: 'complexity-card' },
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
  );

  const workspace = h('div', { class: 'workspace' }, codePanel, vizPanel);
  host.replaceChildren(inputBar, workspace, playback, complexity);

  // ---------- behaviour ----------
  function setHideCode(v: boolean) {
    hideCode = v;
    store('hideCode', v ? '1' : '0');
    workspace.classList.toggle('no-code', v);
    codeToggle.textContent = tr(v ? UI.showCode : UI.hideCode);
  }
  function setExpanded(v: boolean) {
    vizPanel.classList.toggle('expanded', v);
    document.body.classList.toggle('noscroll', v);
    expandBtn.textContent = tr(v ? UI.close : UI.expand);
  }
  function setZoom(dir: number) {
    const i = ZOOMS.indexOf(zoom);
    zoom = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + dir))];
    vizHost.style.width = zoom === 1 ? '' : `${zoom * 100}%`;
    vizHost.classList.toggle('zoomed', zoom !== 1);
    zoomLabel.textContent = Math.round(zoom * 100) + '%';
  }

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
    // every variable that ever appears gets a fixed place, so nothing jumps around
    varNames = [];
    for (const s of steps) for (const [k] of s.vars) if (!varNames.includes(k)) varNames.push(k);
    stackEl.hidden = !steps.some((s) => s.stack.length > 1);
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

  function go(i: number, animate = true) {
    if (!steps.length) return;
    idx = Math.max(0, Math.min(steps.length - 1, i));
    mem.idx = idx;
    const st = steps[idx];
    scene.duration = Math.min(420, 900 / mem.speed);
    scene.render(frameFor(st.state), animate);

    rows.forEach((r, k) => r.classList.toggle('on', k + 1 === st.line));
    const row = rows[st.line - 1];
    if (row) {
      // scroll only the code box, never the page
      const top = row.offsetTop,
        bottom = top + row.offsetHeight;
      if (top < codeScroll.scrollTop + 8) codeScroll.scrollTop = top - 48;
      else if (bottom > codeScroll.scrollTop + codeScroll.clientHeight - 8) codeScroll.scrollTop = bottom - codeScroll.clientHeight + 48;
    }

    stepBadge.textContent = `${idx + 1} / ${steps.length}`;
    msg.textContent = tr(st.msg);
    const vals = new Map(st.vars);
    varsEl.replaceChildren(
      ...varNames.map((k) => {
        const v = vals.get(k);
        return h('span', { class: 'chip' + (v === undefined ? ' chip-empty' : '') }, h('b', {}, k), ' = ', v === undefined ? '–' : String(v));
      }),
    );
    stackEl.textContent = st.stack.length ? `${tr(UI.callStack)}: ${st.stack[st.stack.length - 1]}` : '';
    slider.value = String(idx);
    prevBig.disabled = idx === 0;
    nextBig.disabled = idx >= steps.length - 1;
    if (idx >= steps.length - 1) stop();
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
    } else if (e.key === 'Escape' && vizPanel.classList.contains('expanded')) {
      setExpanded(false);
    }
  };
  document.addEventListener('keydown', onKey);

  setHideCode(hideCode);
  setExpanded(false);
  const restore = mem.idx;
  runNow();
  if (restore && restore < steps.length) go(restore, false);

  return () => {
    stop();
    document.body.classList.remove('noscroll');
    document.removeEventListener('keydown', onKey);
  };
}
