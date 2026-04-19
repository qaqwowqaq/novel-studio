// One-shot helper: invoke the Python script that strips the white background
// from the source brand icon and writes the transparent build asset.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const py = path.join(here, 'make_transparent_icon.py');
const r = spawnSync('python', [py], { stdio: 'inherit' });
process.exit(r.status ?? 1);
