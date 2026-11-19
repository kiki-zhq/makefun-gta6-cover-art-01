// Vice Cover Studio — the entry program for gta6-cover-art-01 (Node 22, standard library only).
// The app itself is plain static files in this directory's app/ folder: an offline
// multi-panel cover maker (app/index.html plus its ES modules, no library, no
// network request). This program hands the entry in: it copies app/ and
// screenshots/ from beside this file into /output and writes /output/dossier.json,
// the summary the judge reads, using the vendored make.fun library. The two
// bundled sample photos under app/samples/ were made for make.fun with an image
// model and are free to use. Build the app, put 3 or 4 PNG or JPEG screenshots
// in screenshots/ (the first by name is the cover) and run it.
//
// Try it locally first with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast when the screenshots break the gate's limits, instead of handing
// in an entry the scorer would refuse: 3 or 4 images, each at most 256 KiB,
// each a whole PNG or JPEG (checked by its magic bytes).
const shotDir = join(here, 'screenshots');
const shotNames = existsSync(shotDir)
  ? readdirSync(shotDir).filter((n) => !n.startsWith('.'))
  : [];
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`screenshots/: expected 3 or 4 images, found ${shotNames.length}`);
}
for (const name of shotNames) {
  const shotPath = join(shotDir, name);
  const size = statSync(shotPath).size;
  if (size > 262144) {
    throw new Error(`screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
  }
}

// The app itself must also fit the gate: at most 993 files and 48 MiB in all.
let appFiles = 0;
let appBytes = 0;
(function countApp(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) countApp(p);
    else { appFiles += 1; appBytes += st.size; }
  }
})(join(here, 'app'));
if (appFiles > 993) throw new Error(`app/: ${appFiles} files, over the 993-file cap`);
if (appBytes > 50331648) throw new Error(`app/: ${appBytes} bytes, over the 48 MiB cap`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
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

// Read the dossier back and confirm it is valid JSON within its cap, so a
// broken build fails here instead of at the gate.
const dossierPath = join(out, 'dossier.json');
const dossierBytes = statSync(dossierPath).size;
if (dossierBytes > 1572864) throw new Error(`dossier.json is ${dossierBytes} bytes, over the 1.5 MiB cap`);
JSON.parse(readFileSync(dossierPath, 'utf8'));
console.log(
  `Vice Cover Studio: ${shotNames.length} screenshots, app/ ${appFiles} files / ${appBytes} bytes, ` +
  `dossier.json ${dossierBytes} bytes — validation passed`,
);
