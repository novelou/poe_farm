import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { encounters, validateEncounters } from '../web/data/encounters.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(projectRoot, 'web');
const worker = join(projectRoot, 'worker', 'index.js');
const output = join(projectRoot, 'dist');
if (!output.startsWith(projectRoot) || output === projectRoot) throw new Error('Unsafe build output path');
const errors = validateEncounters(encounters);
if (errors.length) throw new Error(errors.join('\n'));
await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'server'), { recursive: true });
await mkdir(join(output, 'client'), { recursive: true });
await cp(source, join(output, 'client'), { recursive: true });
await cp(worker, join(output, 'server', 'index.js'));
const htmlPath = join(output, 'client', 'index.html');
const html = await readFile(htmlPath, 'utf8');
if (!html.includes('PoE2 Boss Market') || !html.includes('app.js')) throw new Error('Built page is incomplete');
await writeFile(join(output, 'build-info.json'), JSON.stringify({ builtAt: new Date().toISOString(), encounters: encounters.length }, null, 2));
console.log(`Built ${encounters.length} encounters to ${output}`);
