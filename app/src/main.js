// Vice Cover Studio — editor wiring: state, photos, controls, export.
import { LAYOUTS, GRADES, defaultState, defaultPanels, drawCover, renderCoverToCanvas, slotAt, clampPanel, nudgePanel, coverFileName } from './cover.js';

const SAMPLES = [
  { name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Pier', src: 'samples/pier.jpg' },
];

export const EXPORT_SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];

const state = defaultState();
let selected = 0;
let drag = null;

const $ = (id) => document.getElementById(id);

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + src));
    img.src = src;
  });
}

async function addPhotoFile(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const img = await loadImage(dataUrl);
  pushPhoto(img, file.name);
}

async function addSample(src, name) {
  const img = await loadImage(src);
  pushPhoto(img, name);
}

function pushPhoto(img, name) {
  if (state.photos.length >= 3) state.photos.shift();
  state.photos.push(img);
  state.panels.forEach((p) => {
    if (p.photo >= state.photos.length) p.photo = state.photos.length - 1;
  });
  renderPhotoPick(name);
  render();
}

function render() {
  const canvas = $('stage');
  const w = canvas.width;
  const h = canvas.height;
  drawCover(canvas, state, w, h);
  $('emptyHint').style.display = state.photos.length ? 'none' : 'block';
  syncControls();
}

function syncControls() {
  document.querySelectorAll('#layoutSeg .seg-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradeSeg .seg-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  const panel = state.panels[selected] || state.panels[0];
  $('zoomSlider').value = panel.zoom;
  $('panXSlider').value = panel.x;
  $('panYSlider').value = panel.y;
  $('zoomVal').textContent = panel.zoom.toFixed(2) + '×';
  $('panXVal').textContent = panel.x.toFixed(2);
  $('panYVal').textContent = panel.y.toFixed(2);
  document.querySelectorAll('#panelPick .pick-btn').forEach((b, i) => {
    b.classList.toggle('active', i === selected);
  });
  document.querySelectorAll('#photoPick .pick-btn').forEach((b, i) => {
    b.classList.toggle('active', i === panel.photo);
  });
}

function renderPanelPick() {
  const wrap = $('panelPick');
  wrap.innerHTML = '';
  state.panels.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick-btn';
    b.textContent = 'Panel ' + (i + 1);
    b.addEventListener('click', () => {
      selected = i;
      render();
    });
    wrap.appendChild(b);
  });
}

function renderPhotoPick(activeName) {
  const wrap = $('photoPick');
  wrap.innerHTML = '';
  state.photos.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick-btn';
    b.textContent = 'Photo ' + (i + 1) + (activeName && i === state.photos.length - 1 ? ' • ' + activeName : '');
    b.addEventListener('click', () => {
      state.panels[selected].photo = i;
      render();
    });
    wrap.appendChild(b);
  });
}

function setLayout(layout) {
  if (!LAYOUTS[layout]) return;
  state.layout = layout;
  state.panels = defaultPanels(layout);
  selected = 0;
  renderPanelPick();
  render();
}

function setGrade(grade) {
  if (!GRADES[grade]) return;
  state.grade = grade;
  render();
}

function canvasPos(event) {
  const canvas = $('stage');
  const box = canvas.getBoundingClientRect();
  return {
    fx: (event.clientX - box.left) / box.width,
    fy: (event.clientY - box.top) / box.height,
  };
}

function wireEditor() {
  $('fileInput').addEventListener('change', async (event) => {
    for (const file of event.target.files) {
      try {
        await addPhotoFile(file);
      } catch (err) {
        console.warn(err);
      }
    }
    event.target.value = '';
  });
  $('sampleBoulevard').addEventListener('click', () => addSample(SAMPLES[0].src, SAMPLES[0].name).catch(console.warn));
  $('samplePier').addEventListener('click', () => addSample(SAMPLES[1].src, SAMPLES[1].name).catch(console.warn));
  document.querySelectorAll('#layoutSeg .seg-btn').forEach((b) => {
    b.addEventListener('click', () => setLayout(b.dataset.layout));
  });
  document.querySelectorAll('#gradeSeg .seg-btn').forEach((b) => {
    b.addEventListener('click', () => setGrade(b.dataset.grade));
  });
  $('titleInput').addEventListener('input', (event) => {
    state.title = event.target.value.toUpperCase();
    render();
  });
  $('subtitleInput').addEventListener('input', (event) => {
    state.subtitle = event.target.value;
    render();
  });
  $('zoomSlider').addEventListener('input', (event) => {
    state.panels[selected] = clampPanel({ ...state.panels[selected], zoom: Number(event.target.value) });
    render();
  });
  $('panXSlider').addEventListener('input', (event) => {
    state.panels[selected] = clampPanel({ ...state.panels[selected], x: Number(event.target.value) });
    render();
  });
  $('panYSlider').addEventListener('input', (event) => {
    state.panels[selected] = clampPanel({ ...state.panels[selected], y: Number(event.target.value) });
    render();
  });
  const canvas = $('stage');
  canvas.addEventListener('pointerdown', (event) => {
    const { fx, fy } = canvasPos(event);
    selected = slotAt(state, fx, fy);
    drag = { fx, fy, x: state.panels[selected].x, y: state.panels[selected].y };
    canvas.setPointerCapture(event.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const { fx, fy } = canvasPos(event);
    const panel = state.panels[selected];
    panel.x = drag.x + (fx - drag.fx);
    panel.y = drag.y + (fy - drag.fy);
    render();
  });
  canvas.addEventListener('pointerup', () => {
    drag = null;
  });
  canvas.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 0.05 : 0.02;
    if (event.key === 'ArrowLeft') { state.panels[selected] = nudgePanel(state.panels[selected], -step, 0); event.preventDefault(); }
    else if (event.key === 'ArrowRight') { state.panels[selected] = nudgePanel(state.panels[selected], step, 0); event.preventDefault(); }
    else if (event.key === 'ArrowUp') { state.panels[selected] = nudgePanel(state.panels[selected], 0, -step); event.preventDefault(); }
    else if (event.key === 'ArrowDown') { state.panels[selected] = nudgePanel(state.panels[selected], 0, step); event.preventDefault(); }
    else return;
    render();
  });
  document.querySelectorAll('[data-export]').forEach((b) => {
    b.addEventListener('click', () => exportCover(b.dataset.export));
  });
}

function exportCover(sizeLabel) {
  const [w, h] = sizeLabel.split('x').map(Number);
  const canvas = renderCoverToCanvas(state, w, h);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = coverFileName(state.title, w, h);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}

export async function boot(options = {}) {
  const scene = options.scene || 'editor';
  wireEditor();
  renderPanelPick();
  if (options.photo) {
    const sample = SAMPLES.find((s) => s.name.toLowerCase() === options.photo.toLowerCase());
    if (sample) {
      try {
        await addSample(sample.src, sample.name);
      } catch (err) {
        console.warn(err);
      }
    }
  }
  if (options.caption) {
    state.title = options.caption.toUpperCase();
    $('titleInput').value = state.title;
  }
  if (options.layout && LAYOUTS[options.layout]) setLayout(options.layout);
  if (options.grade && GRADES[options.grade]) setGrade(options.grade);
  if (scene === 'cover') {
    document.body.classList.add('cover-only');
    const size = options.size || 'square';
    const w = size === 'wide' ? 1920 : 1080;
    const h = size === 'portrait' ? 1350 : size === 'wide' ? 1080 : 1080;
    const canvas = $('stage');
    drawCover(canvas, state, w, h);
    $('emptyHint').style.display = 'none';
  } else {
    render();
  }
  return state;
}

export { state };
