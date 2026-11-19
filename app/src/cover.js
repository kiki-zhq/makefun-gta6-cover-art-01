// Vice Cover Studio — cover drawing engine (no DOM state, only canvas + a state object).
// A state is: { layout, grade, title, subtitle, photos: [HTMLImageElement], panels: [{photo, zoom, x, y}] }

export const LAYOUTS = {
  hero: {
    label: 'Hero + 2',
    slots: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
    ],
  },
  grid: {
    label: '4-panel grid',
    slots: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  bleed: {
    label: 'Full-bleed',
    slots: [
      { x: 0, y: 0, w: 1, h: 1 },
      { x: 0.72, y: 0.08, w: 0.24, h: 0.52 },
    ],
  },
};

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    stops: ['rgba(255,122,24,0.55)', 'rgba(255,46,136,0.45)', 'rgba(122,31,162,0.5)'],
    blend: 'overlay',
    caption: '#fff3d6',
    captionEdge: '#c2255c',
    band: 'rgba(20,4,24,0.72)',
  },
  neon: {
    label: 'Neon Night',
    stops: ['rgba(46,230,255,0.5)', 'rgba(255,46,136,0.4)', 'rgba(20,10,60,0.55)'],
    blend: 'screen',
    caption: '#8ef6ff',
    captionEdge: '#ff2e88',
    band: 'rgba(4,10,34,0.78)',
  },
  gold: {
    label: 'Gold Hour',
    stops: ['rgba(255,196,77,0.55)', 'rgba(255,140,40,0.4)', 'rgba(90,40,0,0.45)'],
    blend: 'soft-light',
    caption: '#ffe9a8',
    captionEdge: '#7a4d00',
    band: 'rgba(26,16,2,0.74)',
  },
};

export function defaultPanels(layout) {
  const count = LAYOUTS[layout].slots.length;
  const order = [0, 1, 2, 0];
  return Array.from({ length: count }, (_, i) => ({
    photo: order[i % order.length],
    zoom: 1,
    x: 0,
    y: 0,
  }));
}

export function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    title: 'SUNSET HEIST',
    subtitle: 'VICE CITY • 2026',
    photos: [],
    panels: defaultPanels('hero'),
  };
}

// Keep a panel's crop inside what the photo can show: zoom 1–2.5, pan ±0.5 of the rect.
export function clampPanel(panel) {
  const zoom = Math.max(1, Math.min(2.5, panel.zoom || 1));
  const x = Math.max(-0.5, Math.min(0.5, panel.x || 0));
  const y = Math.max(-0.5, Math.min(0.5, panel.y || 0));
  return { ...panel, zoom, x, y };
}

// Nudge a panel by (dx, dy) fractions of its rect, then clamp the result.
export function nudgePanel(panel, dx, dy) {
  return clampPanel({ ...panel, x: (panel.x || 0) + dx, y: (panel.y || 0) + dy });
}

// Cover-fit: draw img into rect, scaled to cover, then zoomed and panned by (x, y)
// fractions of the rect size. Pan is clamped so the image never leaves a gap.
function drawPanelImage(ctx, img, rect, panel) {
  const clamped = clampPanel(panel);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * clamped.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const maxX = Math.max(0, (dw - rect.w) / 2);
  const maxY = Math.max(0, (dh - rect.h) / 2);
  const px = Math.max(-maxX, Math.min(maxX, clamped.x * rect.w));
  const py = Math.max(-maxY, Math.min(maxY, clamped.y * rect.h));
  const dx = rect.x + (rect.w - dw) / 2 + px;
  const dy = rect.y + (rect.h - dh) / 2 + py;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function paintGrade(ctx, w, h, grade) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  grade.stops.forEach((stop, i) => g.addColorStop(i / (grade.stops.length - 1), stop));
  ctx.save();
  ctx.globalCompositeOperation = grade.blend;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function paintCaption(ctx, w, h, state, grade) {
  const bandH = Math.round(h * 0.2);
  const bandY = h - bandH;
  const band = ctx.createLinearGradient(0, bandY, 0, h);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(0.35, grade.band);
  band.addColorStop(1, grade.band);
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);
  const pad = Math.round(w * 0.045);
  const titleSize = Math.round(Math.min(w * 0.085, bandH * 0.52));
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = grade.caption;
  ctx.strokeStyle = grade.captionEdge;
  ctx.lineWidth = Math.max(2, titleSize * 0.09);
  ctx.lineJoin = 'round';
  ctx.font = `900 ${titleSize}px "Arial Black", "Archivo Black", Impact, sans-serif`;
  const titleY = bandY + bandH * 0.58;
  ctx.strokeText(state.title, pad, titleY);
  ctx.fillText(state.title, pad, titleY);
  const subSize = Math.round(titleSize * 0.34);
  ctx.font = `700 ${subSize}px "Avenir Next", "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = Math.max(1, subSize * 0.12);
  const subY = bandY + bandH * 0.86;
  const spaced = state.subtitle.split('').join('\u2009');
  ctx.strokeText(spaced, pad, subY);
  ctx.fillText(spaced, pad, subY);
}

export function drawCover(canvas, state, w, h) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.fillStyle = '#0d0a14';
  ctx.fillRect(0, 0, w, h);
  layout.slots.forEach((slot, i) => {
    const rect = { x: slot.x * w, y: slot.y * h, w: slot.w * w, h: slot.h * h };
    const panel = state.panels[i] || { photo: 0, zoom: 1, x: 0, y: 0 };
    const img = state.photos[panel.photo];
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) {
      drawPanelImage(ctx, img, rect, panel);
    } else {
      const ph = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      ph.addColorStop(0, '#2a1b4d');
      ph.addColorStop(1, '#12081f');
      ctx.fillStyle = ph;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `700 ${Math.round(Math.min(rect.w, rect.h) * 0.07)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  });
  // Gutters + keylines between panels.
  ctx.strokeStyle = 'rgba(5,3,8,0.9)';
  ctx.lineWidth = Math.max(3, w * 0.006);
  layout.slots.forEach((slot) => {
    ctx.strokeRect(slot.x * w, slot.y * h, slot.w * w, slot.h * h);
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1, w * 0.0016);
  layout.slots.forEach((slot) => {
    ctx.strokeRect(slot.x * w, slot.y * h, slot.w * w, slot.h * h);
  });
  paintGrade(ctx, w, h, grade);
  if (state.title) paintCaption(ctx, w, h, state, grade);
  return canvas;
}

export function renderCoverToCanvas(state, w, h) {
  const canvas = document.createElement('canvas');
  return drawCover(canvas, state, w, h);
}

export function slotAt(state, fx, fy) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero;
  for (let i = layout.slots.length - 1; i >= 0; i--) {
    const s = layout.slots[i];
    if (fx >= s.x && fx < s.x + s.w && fy >= s.y && fy < s.y + s.h) return i;
  }
  return 0;
}

// File name for an exported cover: slug of the title plus its pixel size.
export function coverFileName(title, w, h) {
  const slug = (title || 'vice-cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'vice-cover';
  return `${slug}-${w}x${h}.png`;
}
