import type { T } from './types';

export type Lang = 'en' | 'tr';

let lang: Lang = 'en';
const listeners: (() => void)[] = [];

export function getLang(): Lang {
  return lang;
}
export function setLang(l: Lang) {
  lang = l;
  listeners.forEach((f) => f());
}
export function onLangChange(f: () => void) {
  listeners.push(f);
}

/** Make a bilingual text. */
export function m(en: string, tr: string): T {
  return { en, tr };
}

/** Pick the current language. */
export function tr(t: T | string): string {
  return typeof t === 'string' ? t : t[lang];
}

/** Fixed UI strings. */
export const UI = {
  learn: m('Learn', 'Öğren'),
  test: m('Test', 'Test'),
  run: m('Run', 'Çalıştır'),
  random: m('Random', 'Rastgele'),
  examples: m('Slide examples', 'Slayt örnekleri'),
  input: m('Input', 'Girdi'),
  step: m('Step', 'Adım'),
  of: m('of', '/'),
  speed: m('Speed', 'Hız'),
  variables: m('Variables', 'Değişkenler'),
  callStack: m('Call stack', 'Çağrı yığını'),
  counters: m('Counters', 'Sayaçlar'),
  whatLine: m('What this line does', 'Bu satır ne yapar'),
  hoverHint: m(
    'Hover a line to see what it does and what it changes in the diagram. Click it to jump there.',
    'Bir satırın üstüne gel: ne yaptığını ve diyagramda neyi değiştirdiğini gör. Tıklarsan o adıma atlarsın.',
  ),
  preview: m('Preview: state right after this line runs', 'Önizleme: bu satır çalıştıktan hemen sonraki durum'),
  notRun: m('This line does not run for this input.', 'Bu satır bu girdide hiç çalışmıyor.'),
  concept: m('Key ideas', 'Ana fikirler'),
  complexity: m('Complexity', 'Karmaşıklık'),
  pitfalls: m('Exam traps', 'Sınav tuzakları'),
  op: m('Operation', 'İşlem'),
  best: m('Best', 'En iyi'),
  avg: m('Average', 'Ortalama'),
  worst: m('Worst', 'En kötü'),
  check: m('Check answers', 'Kontrol et'),
  reveal: m('Show answers', 'Cevapları göster'),
  reset: m('Reset', 'Sıfırla'),
  hint: m('Hint', 'İpucu'),
  testIntro: m(
    'Fill in the missing parts of the code. Spaces do not matter. Use the hints if you get stuck, then check your answers.',
    'Koddaki eksik yerleri doldur. Boşlukların önemi yok. Takılırsan ipuçlarına bak, sonra kontrol et.',
  ),
  score: m('Score', 'Puan'),
  allCorrect: m('All correct. Now try it in the Learn tab with your own input.', 'Hepsi doğru! Şimdi Öğren sekmesinde kendi girdinle dene.'),
  answerWas: m('Answer', 'Cevap'),
  legend: m('Colors', 'Renkler'),
  keys: m('Keys: ← → step, space play/pause', 'Tuşlar: ← → adım, boşluk oynat/durdur'),
  inputError: m('Input problem', 'Girdi hatası'),
  theme: m('Theme', 'Tema'),
  menu: m('Topics', 'Konular'),
  line: m('line', 'satır'),
};

export const COUNTER_LABELS: Record<string, T> = {
  cmp: m('comparisons', 'karşılaştırma'),
  moves: m('moves', 'taşıma'),
  swaps: m('swaps', 'swap'),
  probes: m('probes', 'deneme (probe)'),
  rotations: m('rotations', 'rotasyon'),
  calls: m('recursive calls', 'recursive çağrı'),
  visits: m('nodes visited', 'ziyaret edilen düğüm'),
};

export const ROLE_LABELS: Record<string, T> = {
  cmp: m('compared', 'karşılaştırılıyor'),
  move: m('moved', 'taşındı'),
  swap: m('swapped', 'swap edildi'),
  write: m('written', 'yazıldı'),
  pivot: m('pivot', 'pivot'),
  found: m('found', 'bulundu'),
  bad: m('rule broken', 'kural bozuk'),
  path: m('on the path', 'yol üzerinde'),
  sorted: m('sorted', 'sıralı'),
};
