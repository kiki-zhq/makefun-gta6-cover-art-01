// Vice Cover Studio — wires the editor: photo slots, layout and panel controls,
// caption and grade, drag-to-pan on the preview, and PNG export at three sizes.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, LAYOUTS, panelAt, panelRects } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const captionPos = document.getElementById('caption-pos');
const panelControls = document.getElementById('panel-controls');

/** The whole editor state; drawCover reads it directly. */
export const state = {
  photos: [null, null, null],
  photoNames: ['', '', ''],
  // One assignment per panel, kept per layout so switching layouts keeps its crops.
  assignments: {
    hero: [
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1.15, ox: 0, oy: -0.05 },
    ],
    grid: [
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1.2, ox: 0.05, oy: 0 },
      { photo: 0, zoom: 1.2, ox: -0.05, oy: 0.05 },
    ],
    strip: [
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1, ox: 0, oy: 0 },
    ],
  },
  layout: 'hero',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'One last job under the neon',
  titleColor: '#ffffff',
  captionPos: 'bottom',
  selectedPanel: 0,
};

function redraw() {
  drawCover(canvas, state);
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Puts an image into a photo slot and updates its label. */
export function setPhoto(slot, img, name) {
  state.photos[slot] = img;
  state.photoNames[slot] = name;
  const label = document.getElementById(`slot-state-${slot}`);
  if (label) label.textContent = name || 'empty';
  redraw();
}

/** Loads a bundled sample photo into a slot. */
export async function loadSample(slot, sample) {
  const img = await loadImage(`samples/${sample}.jpg`);
  setPhoto(slot, img, `${sample} sample`);
}

// ---- Photo slots: file uploads and sample buttons ----

for (let slot = 0; slot < 3; slot += 1) {
  document.getElementById(`file-${slot}`).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      setPhoto(slot, img, file.name);
    } catch {
      status.textContent = 'That file could not be read as an image.';
    }
  });
}
document.querySelectorAll('.sample-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try {
      await loadSample(Number(btn.dataset.slot), btn.dataset.sample);
    } catch {
      status.textContent = 'The sample photo could not be loaded.';
    }
  });
});

// ---- Panel controls: rebuilt for the current layout ----

function buildPanelControls() {
  panelControls.innerHTML = '';
  const panels = LAYOUTS[state.layout];
  const assigns = state.assignments[state.layout];
  panels.forEach((panel, i) => {
    const box = document.createElement('div');
    box.className = `panel-box${state.selectedPanel === i ? ' active' : ''}`;
    box.dataset.panel = String(i);
    const a = assigns[i];
    box.innerHTML = `
      <h3>Panel ${String.fromCharCode(65 + i)} — ${panel.name}</h3>
      <label>Photo
        <select data-kind="photo">
          <option value="0">Photo 1</option>
          <option value="1">Photo 2</option>
          <option value="2">Photo 3</option>
        </select>
      </label>
      <label>Zoom <input type="range" data-kind="zoom" min="1" max="2.5" step="0.05" value="${a.zoom}"></label>
      <label>Move left / right <input type="range" data-kind="ox" min="-0.5" max="0.5" step="0.02" value="${a.ox}"></label>
      <label>Move up / down <input type="range" data-kind="oy" min="-0.5" max="0.5" step="0.02" value="${a.oy}"></label>`;
    box.querySelector('[data-kind="photo"]').value = String(a.photo);
    box.addEventListener('click', () => {
      state.selectedPanel = i;
      buildPanelControls();
      redraw();
    });
    box.querySelectorAll('select, input').forEach((el) => {
      el.addEventListener('input', () => {
        const kind = el.dataset.kind;
        if (kind === 'photo') a.photo = Number(el.value);
        else a[kind] = Number(el.value);
        state.selectedPanel = i;
        redraw();
      });
      el.addEventListener('click', (e) => e.stopPropagation());
    });
    panelControls.appendChild(box);
  });
}

document.querySelectorAll('input[name="layout"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    state.layout = radio.value;
    state.selectedPanel = 0;
    buildPanelControls();
    redraw();
  });
});

// ---- Caption, colour and grade ----

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
captionPos.addEventListener('change', () => { state.captionPos = captionPos.value; redraw(); });
document.querySelectorAll('.swatch').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.titleColor = btn.dataset.color;
    document.querySelectorAll('.swatch').forEach((b) => b.classList.toggle('picked', b === btn));
    redraw();
  });
});
document.querySelector('.swatch[data-color="#ffffff"]').classList.add('picked');
document.querySelectorAll('input[name="grade"]').forEach((radio) => {
  radio.addEventListener('change', () => { state.grade = radio.value; redraw(); });
});

// ---- Drag a panel on the preview to pan its photo ----

let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const idx = panelAt(state.layout, canvas.width, canvas.height, p.x, p.y);
  if (idx < 0) return;
  state.selectedPanel = idx;
  buildPanelControls();
  const a = state.assignments[state.layout][idx];
  drag = { panel: idx, startX: p.x, startY: p.y, ox: a.ox, oy: a.oy };
  canvas.classList.add('dragging');
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const r = rects[drag.panel];
  const a = state.assignments[state.layout][drag.panel];
  a.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (p.x - drag.startX) / r.w));
  a.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (p.y - drag.startY) / r.h));
  const box = panelControls.querySelector(`[data-panel="${drag.panel}"]`);
  if (box) {
    box.querySelector('[data-kind="ox"]').value = String(a.ox);
    box.querySelector('[data-kind="oy"]').value = String(a.oy);
  }
  redraw();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
  canvas.classList.remove('dragging');
});

// ---- Export ----

/** Renders the cover at a chosen size and downloads it as a PNG. */
export function exportCover(sizeText) {
  const [w, h] = sizeText.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const saved = { ...state, selectedPanel: -1 };
  drawCover(off, saved);
  off.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — the browser could not make the PNG.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved vice-cover-${w}x${h}.png`;
  }, 'image/png');
}
document.querySelectorAll('.export-btn').forEach((btn) => {
  btn.addEventListener('click', () => exportCover(btn.dataset.size));
});

// ---- Start ----

buildPanelControls();
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSample,
    setState(patch) {
      Object.assign(state, patch);
      titleInput.value = state.title;
      subtitleInput.value = state.subtitle;
      captionPos.value = state.captionPos;
      document.querySelector(`input[name="layout"][value="${state.layout}"]`).checked = true;
      document.querySelector(`input[name="grade"][value="${state.grade}"]`).checked = true;
      document.querySelectorAll('.swatch').forEach((b) => b.classList.toggle('picked', b.dataset.color === state.titleColor));
      buildPanelControls();
    },
    redraw,
  });
} else {
  redraw();
}
