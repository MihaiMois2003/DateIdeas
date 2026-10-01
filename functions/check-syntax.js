// Verifică sintaxa tuturor fișierelor .js (din functions/ și din aplicația web), fără să le ruleze.
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const folders = ['functions', 'js'].map((folder) => join(root, folder));

function* jsFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* jsFiles(path);
    else if (entry.name.endsWith('.js')) yield path;
  }
}

let failed = 0;
let count = 0;
for (const file of folders.flatMap((folder) => [...jsFiles(folder)])) {
  count++;
  try {
    // Node detectează singur modulele ES (import/export) și în fișierele din js/.
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    failed++;
    console.error(`✗ ${relative(root, file)}\n${error.stderr}`);
  }
}
console.log(failed ? `${failed} din ${count} fișiere au erori.` : `Sintaxă OK în ${count} fișiere.`);
process.exit(failed ? 1 : 0);
