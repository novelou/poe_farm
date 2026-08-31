import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getMarket } from '../server/market.mjs';
import { encounters, validateEncounters } from '../web/data/encounters.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(projectRoot, 'web');
const output = join(projectRoot, 'pages-dist');
if (!output.startsWith(projectRoot) || output === projectRoot) throw new Error('Unsafe Pages output path');

const errors = validateEncounters(encounters);
if (errors.length) throw new Error(errors.join('\n'));

const publicOrigin = (process.env.PAGES_URL || 'https://novelou.github.io/poe_farm').replace(/\/$/, '');
await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'data'), { recursive: true });
await cp(source, output, { recursive: true });

const market = await getMarket();
if (!market.items?.length) throw new Error(`Market snapshot is empty: ${market.error || 'unknown error'}`);
await writeFile(join(output, 'data', 'market.json'), JSON.stringify(market), 'utf8');

const htmlPath = join(output, 'index.html');
const html = (await readFile(htmlPath, 'utf8'))
  .replaceAll('__PUBLIC_ORIGIN__', publicOrigin)
  .replaceAll('__MARKET_ENDPOINT__', 'data/market.json');
if (!html.includes('PoE2 Boss Market') || html.includes('__MARKET_ENDPOINT__')) throw new Error('Pages HTML is incomplete');
await writeFile(htmlPath, html, 'utf8');
await writeFile(join(output, '.nojekyll'), '', 'utf8');

console.log(`Built ${encounters.length} encounters and ${market.items.length} market prices for GitHub Pages`);
