import { UI, tr } from '../i18n';
import type { Algorithm, Blank } from '../types';
import { codeBlock, highlight } from './codeView';
import { isCorrect } from '../engine/blanks';
import { h } from './dom';

const answers = new Map<string, string[]>();


/** Test tab: the code with blanks in critical places. Returns a cleanup function. */
export function mountTest(host: HTMLElement, alg: Algorithm): () => void {
  const saved = answers.get(alg.id) ?? alg.blanks.map(() => '');
  answers.set(alg.id, saved);

  // which blanks are on which line
  const byLine = new Map<number, { b: Blank; i: number }[]>();
  alg.blanks.forEach((b, i) => {
    const ln = alg.code.labels[b.label];
    if (!ln) throw new Error(`blank label ${b.label} missing in ${alg.id}`);
    byLine.set(ln, [...(byLine.get(ln) ?? []), { b, i }]);
  });

  const inputs: HTMLInputElement[] = [];
  const render = (line: string, n: number): Node[] => {
    const list = byLine.get(n);
    if (!list) return highlight(line);
    const out: Node[] = [];
    let rest = line;
    for (const { b, i } of list) {
      const at = rest.indexOf(b.text);
      if (at < 0) throw new Error(`blank text "${b.text}" not found in ${alg.id}`);
      out.push(...highlight(rest.slice(0, at)));
      const inp = h('input', {
        class: 'blank',
        type: 'text',
        id: `blank-${alg.id}-${i}`,
        value: saved[i],
        spellcheck: 'false',
        autocomplete: 'off',
        placeholder: String(i + 1),
        'aria-label': `Blank ${i + 1}`,
        style: `width:${Math.max(b.text.length, 3) + 2}ch`,
      });
      inp.addEventListener('input', () => {
        saved[i] = inp.value;
        inp.classList.remove('ok', 'bad');
        items[i].classList.remove('ok', 'bad');
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') check();
      });
      inputs[i] = inp;
      out.push(inp);
      rest = rest.slice(at + b.text.length);
    }
    out.push(...highlight(rest));
    return out;
  };

  const { el: codeEl } = codeBlock(alg.code.lines, render);
  const score = h('div', { class: 'score', 'aria-live': 'polite' });

  const items = alg.blanks.map((b, i) => {
    const hintEl = h('div', { class: 'hint-text', hidden: true }, tr(b.hint));
    const ansEl = h('div', { class: 'answer-text', hidden: true }, h('b', {}, tr(UI.answerWas) + ': '), h('code', {}, b.text));
    const note = alg.notes[b.label];
    const whyEl = note ? h('div', { class: 'why-text', hidden: true }, tr(note)) : null;
    const li = h(
      'li',
      { class: 'blank-item' },
      h('div', { class: 'blank-row' }, h('span', { class: 'blank-num' }, String(i + 1)), h('span', { class: 'muted small' }, `${tr(UI.line)} ${alg.code.labels[b.label]}`), h('button', { class: 'btn small', onclick: () => (hintEl.hidden = !hintEl.hidden) }, tr(UI.hint))),
      hintEl,
      ansEl,
      whyEl,
    );
    (li as HTMLElement & { _ans?: HTMLElement; _why?: HTMLElement | null })._ans = ansEl;
    (li as HTMLElement & { _why?: HTMLElement | null })._why = whyEl;
    return li;
  });

  function check() {
    let ok = 0;
    alg.blanks.forEach((b, i) => {
      const good = isCorrect(b, inputs[i].value);
      if (good) ok++;
      inputs[i].classList.toggle('ok', good);
      inputs[i].classList.toggle('bad', !good);
      items[i].classList.toggle('ok', good);
      items[i].classList.toggle('bad', !good);
      const why = (items[i] as HTMLElement & { _why?: HTMLElement | null })._why;
      if (why) why.hidden = !good;
    });
    score.textContent = `${tr(UI.score)}: ${ok} / ${alg.blanks.length}` + (ok === alg.blanks.length ? ' — ' + tr(UI.allCorrect) : '');
    score.classList.toggle('perfect', ok === alg.blanks.length);
  }
  function reveal() {
    items.forEach((li) => ((li as HTMLElement & { _ans?: HTMLElement })._ans!.hidden = false));
  }
  function reset() {
    alg.blanks.forEach((_, i) => {
      saved[i] = '';
      inputs[i].value = '';
      inputs[i].classList.remove('ok', 'bad');
      items[i].classList.remove('ok', 'bad');
      items[i].querySelectorAll<HTMLElement>('.hint-text,.answer-text,.why-text').forEach((e) => (e.hidden = true));
    });
    score.textContent = '';
  }

  host.replaceChildren(
    h('p', { class: 'test-intro' }, tr(UI.testIntro)),
    h(
      'div',
      { class: 'test-grid' },
      h('section', { class: 'panel code-panel' }, h('div', { class: 'panel-head' }, h('span', { class: 'lang-badge' }, 'Java')), h('div', { class: 'code-scroll' }, codeEl)),
      h(
        'aside',
        { class: 'panel blanks-panel' },
        h('div', { class: 'test-actions' }, h('button', { class: 'btn primary', onclick: check }, tr(UI.check)), h('button', { class: 'btn', onclick: reveal }, tr(UI.reveal)), h('button', { class: 'btn', onclick: reset }, tr(UI.reset))),
        score,
        h('ol', { class: 'blank-list' }, items),
      ),
    ),
  );
  return () => {};
}
