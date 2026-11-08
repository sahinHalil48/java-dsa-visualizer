import './styles.css';
import { ALGORITHMS, CATEGORIES } from './algorithms';
import { UI, getLang, onLangChange, setLang, tr, type Lang } from './i18n';
import type { Algorithm } from './types';
import { h, store } from './ui/dom';
import { mountLearn } from './ui/learn';
import { mountTest } from './ui/test';

type Mode = 'learn' | 'test';

const app = document.getElementById('app')!;
let current: Algorithm = ALGORITHMS.find((a) => a.id === location.hash.slice(1)) ?? ALGORITHMS.find((a) => a.id === store('alg')) ?? ALGORITHMS[0];
let mode: Mode = (store('mode') as Mode) === 'test' ? 'test' : 'learn';
let cleanup: () => void = () => {};

const savedLang = store('lang');
if (savedLang === 'tr' || savedLang === 'en') setLang(savedLang);
else if (navigator.language?.toLowerCase().startsWith('tr')) setLang('tr');
const savedTheme = store('theme');
if (savedTheme === 'dark' || savedTheme === 'light') document.documentElement.dataset.theme = savedTheme;

function select(a: Algorithm) {
  current = a;
  store('alg', a.id);
  if (location.hash.slice(1) !== a.id) history.replaceState(null, '', '#' + a.id);
  render();
  app.querySelector('.main')?.scrollTo({ top: 0 });
  window.scrollTo({ top: 0 });
}

function render() {
  cleanup();
  document.documentElement.lang = getLang();

  const langToggle = h(
    'div',
    { class: 'seg', role: 'group', 'aria-label': 'Language' },
    ...(['en', 'tr'] as Lang[]).map((l) => h('button', { class: getLang() === l ? 'on' : '', 'aria-pressed': String(getLang() === l), onclick: () => switchLang(l) }, l.toUpperCase())),
  );
  const themeBtn = h(
    'button',
    {
      class: 'btn icon theme-btn',
      title: tr(UI.theme),
      'aria-label': tr(UI.theme),
      onclick: () => {
        const dark = document.documentElement.dataset.theme
          ? document.documentElement.dataset.theme === 'dark'
          : window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.dataset.theme = dark ? 'light' : 'dark';
        store('theme', document.documentElement.dataset.theme);
      },
    },
    themeIcon(),
  );

  const header = h(
    'header',
    { class: 'top' },
    h('div', { class: 'brand' }, h('span', { class: 'logo', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), h('b', {}, 'AlgoLens'), h('span', { class: 'course' }, 'CMPE 250')),
    h('div', { class: 'top-actions' }, langToggle, themeBtn),
  );

  // sidebar (desktop) + select (phone)
  const nav = h(
    'nav',
    { class: 'side', 'aria-label': tr(UI.menu) },
    CATEGORIES.map((c) => {
      const algs = ALGORITHMS.filter((a) => a.category === c.id);
      if (!algs.length) return null;
      return h(
        'div',
        { class: 'cat' },
        h('h2', {}, tr(c.name)),
        h('ul', {}, algs.map((a) => h('li', {}, h('a', { href: '#' + a.id, class: a === current ? 'on' : '', 'aria-current': a === current ? 'page' : undefined, onclick: (e: Event) => (e.preventDefault(), select(a)) }, tr(a.name))))),
      );
    }),
  );
  const mobileSel = h(
    'select',
    { class: 'mobile-nav', id: 'mobile-nav', 'aria-label': tr(UI.menu), onchange: (e: Event) => select(ALGORITHMS.find((a) => a.id === (e.target as HTMLSelectElement).value)!) },
    CATEGORIES.map((c) => h('optgroup', { label: tr(c.name) }, ALGORITHMS.filter((a) => a.category === c.id).map((a) => h('option', { value: a.id, selected: a === current }, tr(a.name))))),
  );

  const tabs = h(
    'div',
    { class: 'tabs', role: 'tablist' },
    (['learn', 'test'] as Mode[]).map((md) =>
      h(
        'button',
        {
          role: 'tab',
          class: mode === md ? 'on' : '',
          'aria-selected': String(mode === md),
          onclick: () => {
            mode = md;
            store('mode', md);
            render();
          },
        },
        tr(md === 'learn' ? UI.learn : UI.test),
        md === 'test' ? h('span', { class: 'tab-count' }, String(current.blanks.length)) : null,
      ),
    ),
  );

  const cat = CATEGORIES.find((c) => c.id === current.category)!;
  const body = h('div', { class: 'view' });
  const main = h(
    'main',
    { class: 'main' },
    mobileSel,
    h('div', { class: 'title-row' }, h('div', {}, h('p', { class: 'eyebrow' }, tr(cat.name)), h('h1', {}, tr(current.name)), h('p', { class: 'summary' }, tr(current.summary))), tabs),
    body,
  );

  app.replaceChildren(header, h('div', { class: 'layout' }, nav, main));
  cleanup = mode === 'learn' ? mountLearn(body, current) : mountTest(body, current);
}

function themeIcon() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  const c = document.createElementNS(ns, 'circle');
  c.setAttribute('cx', '12');
  c.setAttribute('cy', '12');
  c.setAttribute('r', '8');
  c.setAttribute('fill', 'none');
  c.setAttribute('stroke', 'currentColor');
  c.setAttribute('stroke-width', '2');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', 'M12 4a8 8 0 0 1 0 16z');
  p.setAttribute('fill', 'currentColor');
  svg.append(c, p);
  return svg;
}

function switchLang(l: Lang) {
  store('lang', l);
  setLang(l);
}
onLangChange(render);
window.addEventListener('hashchange', () => {
  const a = ALGORITHMS.find((x) => x.id === location.hash.slice(1));
  if (a && a !== current) select(a);
});

render();
