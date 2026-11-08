// Turns dist-single/index.html (a full HTML document) into a page fragment:
// the content of <head> followed by the content of <body>.
// Used to publish the app as a single hosted page.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , input = 'dist-single/index.html', output = 'dist-single/algolens.html'] = process.argv;
const html = readFileSync(input, 'utf8');
const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '';
const cleanHead = head.replace(/<meta charset[^>]*>/i, '').replace(/<meta name="viewport"[^>]*>/i, '');
writeFileSync(output, cleanHead.trim() + '\n' + body.trim() + '\n');
console.log(`wrote ${output}`);
