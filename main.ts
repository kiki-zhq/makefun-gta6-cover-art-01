// Vice Cover Studio — entrypoint (Node 22, standard library only).
// Copies app/ and screenshots/ beside this file to /output and writes
// /output/dossier.json with buildDossier from vendor/makefun-app.ts.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function countTree(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      const sub = countTree(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (st.isFile()) {
      files += 1;
      bytes += st.size;
    }
  }
  return { files, bytes };
}

const MAX_SHOT_BYTES = 262144;

function isImageBytes(buf) {
  const png = buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const jpg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  return png || jpg;
}

function validateScreenshots(dir) {
  if (!existsSync(dir)) throw new Error('screenshots/ is missing: take 3 or 4 screenshots first');
  const names = readdirSync(dir).filter((n) => !n.startsWith('.'));
  if (names.length < 3 || names.length > 4) {
    throw new Error(`screenshots/ holds ${names.length} images, need 3 or 4`);
  }
  for (const name of names) {
    const path = join(dir, name);
    const st = statSync(path);
    if (!st.isFile()) throw new Error(`screenshots/${name} is not a file`);
    if (st.size > MAX_SHOT_BYTES) throw new Error(`screenshots/${name} is ${st.size} bytes, over the 256 KiB limit`);
    const buf = readFileSync(path);
    if (!isImageBytes(buf)) throw new Error(`screenshots/${name} is not a whole PNG or JPEG`);
  }
  return names;
}

mkdirSync(out, { recursive: true });
validateScreenshots(join(here, 'screenshots'));
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

const appTree = countTree(join(out, 'app'));
if (appTree.files > 993) throw new Error(`app/ holds ${appTree.files} files, over the 993-file limit`);
if (appTree.bytes > 50331648) throw new Error(`app/ is ${appTree.bytes} bytes, over the 48 MiB limit`);
const shots = existsSync(join(out, 'screenshots'))
  ? readdirSync(join(out, 'screenshots')).filter((n) => !n.startsWith('.'))
  : [];

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// Read the dossier back: it must be valid JSON and inside the 1.5 MiB cap.
const dossierBytes = statSync(join(out, 'dossier.json')).size;
if (dossierBytes > 1572864) throw new Error(`dossier.json is ${dossierBytes} bytes, over the 1.5 MiB limit`);
JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));

console.log(
  `Vice Cover Studio: ${shots.length} screenshots, app/ ${appTree.files} files / ${appTree.bytes} bytes, dossier.json ${dossierBytes} bytes — validation passed`,
);
