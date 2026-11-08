import { h } from './dom';

// Minimal Java syntax highlighting (enough for the course code).
const KEYWORDS = new Set(
  'public private protected static void int boolean return if else for while new null true false break class this throw throws final extends implements try catch do continue'.split(' '),
);
const TYPES = new Set('int boolean void String Integer List ArrayList BinaryNode AvlNode HashEntry Math'.split(' '));

export function highlight(code: string): Node[] {
  const out: Node[] = [];
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(\b\d+\b)|([A-Za-z_]\w*)|(\s+)|(.)/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(code))) {
    const [tok, com, str, num, word] = mm;
    let cls = '';
    if (com) cls = 'c-com';
    else if (str) cls = 'c-str';
    else if (num) cls = 'c-num';
    else if (word) {
      if (KEYWORDS.has(word) && !TYPES.has(word)) cls = 'c-kw';
      else if (TYPES.has(word)) cls = 'c-type';
      else if (code[re.lastIndex] === '(') cls = 'c-fn';
    }
    out.push(cls ? h('span', { class: cls }, tok) : document.createTextNode(tok));
  }
  return out;
}

export interface LineOpts {
  noteLines?: Set<number>;
}

/** Build the code block: one row per line with a line number gutter. */
export function codeBlock(lines: string[], render: (line: string, n: number) => Node[] = (l) => highlight(l), opts: LineOpts = {}) {
  const rows = lines.map((l, i) =>
    h(
      'div',
      { class: 'ln' + (opts.noteLines?.has(i + 1) ? ' has-note' : ''), 'data-line': i + 1 },
      h('span', { class: 'gut' }, String(i + 1)),
      h('span', { class: 'src' }, ...render(l, i + 1), l.length ? '' : ' '),
    ),
  );
  return { el: h('div', { class: 'code' }, rows), rows };
}
