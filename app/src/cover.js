// Vice Cover Studio — the cover drawing engine.
// A cover is a set of photo panels in a chosen layout, a colour grade washed over
// the whole sheet, and bold poster lettering. Everything is drawn on a 2D canvas
// at the export size, so the live preview and the exported PNG are the same drawing.

// Panel rectangles are fractions of the cover: [x, y, width, height].
export const LAYOUTS = {
  // Big hero photo on the left, two stacked panels on the right.
  hero: [
    { name: 'Hero', rect: [0, 0, 0.62, 1] },
    { name: 'Top right', rect: [0.62, 0, 0.38, 0.5] },
    { name: 'Bottom right', rect: [0.62, 0.5, 0.38, 0.5] },
  ],
  // Four equal panels in a grid.
  grid: [
    { name: 'Top left', rect: [0, 0, 0.5, 0.5] },
    { name: 'Top right', rect: [0.5, 0, 0.5, 0.5] },
    { name: 'Bottom left', rect: [0, 0.5, 0.5, 0.5] },
    { name: 'Bottom right', rect: [0.5, 0.5, 0.5, 0.5] },
  ],
  // One photo fills the sheet; a narrow side strip holds a second photo.
  strip: [
    { name: 'Main', rect: [0, 0, 0.84, 1] },
    { name: 'Side strip', rect: [0.84, 0, 0.16, 1] },
  ],
};

// Each grade is a wash of colour over the panels plus the border and accent colours.
export const GRADES = {
  sunset: {
    top: 'rgba(255, 110, 60, 0.10)', bottom: 'rgba(220, 40, 130, 0.55)',
    border: '#ffd166', accent: '#ff5e8a', dark: '#2b1030',
  },
  neon: {
    top: 'rgba(0, 229, 255, 0.10)', bottom: 'rgba(190, 20, 220, 0.55)',
    border: '#00e5ff', accent: '#ff5e8a', dark: '#0d0a2e',
  },
  gold: {
    top: 'rgba(255, 200, 80, 0.12)', bottom: 'rgba(180, 90, 10, 0.52)',
    border: '#ffcf5c', accent: '#ff8a3c', dark: '#2a1a08',
  },
};

export const PANEL_GAP = 0.008; // gap between panels, as a fraction of the cover width

/** The ranges a panel assignment may take: zoom 1–2.5, pan offsets within ±0.5. */
export const ASSIGNMENT_LIMITS = { zoomMin: 1, zoomMax: 2.5, panMax: 0.5 };

/** Clamps an assignment's zoom and pan into their ranges, in place, and returns it. */
export function clampAssignment(a) {
  a.zoom = Math.max(ASSIGNMENT_LIMITS.zoomMin, Math.min(ASSIGNMENT_LIMITS.zoomMax, a.zoom || 1));
  a.ox = Math.max(-ASSIGNMENT_LIMITS.panMax, Math.min(ASSIGNMENT_LIMITS.panMax, a.ox || 0));
  a.oy = Math.max(-ASSIGNMENT_LIMITS.panMax, Math.min(ASSIGNMENT_LIMITS.panMax, a.oy || 0));
  return a;
}

/** Moves a panel's photo by (dx, dy) in panel fractions, keeping it in range. */
export function nudgeAssignment(a, dx, dy) {
  a.ox = (a.ox || 0) + dx;
  a.oy = (a.oy || 0) + dy;
  return clampAssignment(a);
}

/** Builds a tidy download name from the cover title and export size. */
export function exportFileName(title, w, h) {
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cover';
  return `vice-cover-${slug}-${w}x${h}.png`;
}

/** Panel rectangles in pixels for a layout on a cover of width w and height h. */
export function panelRects(layoutId, w, h) {
  return LAYOUTS[layoutId].map((p) => ({
    name: p.name,
    x: p.rect[0] * w,
    y: p.rect[1] * h,
    w: p.rect[2] * w,
    h: p.rect[3] * h,
  }));
}

/** Finds which panel (index, or -1) the point (px, py) falls in. */
export function panelAt(layoutId, w, h, px, py) {
  return panelRects(layoutId, w, h).findIndex(
    (r) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h,
  );
}

/** Draws one photo into a panel rect, cover-fit, with zoom and pan offsets. */
function drawPanelPhoto(ctx, img, rect, zoom, ox, oy) {
  const gap = PANEL_GAP * Math.max(rect.w, rect.h) * 2;
  const x = rect.x + gap / 2, y = rect.y + gap / 2;
  const w = rect.w - gap, h = rect.h - gap;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const s = base * zoom;
  const pw = img.naturalWidth * s;
  const ph = img.naturalHeight * s;
  const cx = x + w / 2 + ox * w;
  const cy = y + h / 2 + oy * h;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** Draws the empty-panel placeholder where a panel has no photo yet. */
function drawEmptyPanel(ctx, rect, grade, label) {
  const gap = PANEL_GAP * Math.max(rect.w, rect.h) * 2;
  const x = rect.x + gap / 2, y = rect.y + gap / 2;
  const w = rect.w - gap, h = rect.h - gap;
  const wash = ctx.createLinearGradient(x, y, x + w, y + h);
  wash.addColorStop(0, grade.dark);
  wash.addColorStop(1, '#12081c');
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.setLineDash([Math.max(6, w * 0.02), Math.max(6, w * 0.02)]);
  ctx.lineWidth = Math.max(2, w * 0.006);
  ctx.strokeRect(x + ctx.lineWidth, y + ctx.lineWidth, w - 2 * ctx.lineWidth, h - 2 * ctx.lineWidth);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `bold ${Math.max(13, w * 0.055)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.textBaseline = 'alphabetic';
}

/** Fits a one-line title to the cover width, returning the font size to use. */
function fitTitle(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 italic ${size}px sans-serif`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 italic ${size}px sans-serif`;
  }
  return size;
}

/** Draws the title, subtitle and studio mark over the panels. */
function drawCaption(ctx, w, h, { title, subtitle, color, position, accent }) {
  const text = title.trim().toUpperCase();
  const sub = subtitle.trim();
  if (!text && !sub) return;
  const band = position === 'top' ? h * 0.06 : position === 'center' ? h * 0.42 : h * 0.75;
  const shade = ctx.createLinearGradient(0, band - h * 0.1, 0, band + h * 0.2);
  shade.addColorStop(0, 'rgba(10, 4, 18, 0)');
  shade.addColorStop(0.5, 'rgba(10, 4, 18, 0.55)');
  shade.addColorStop(1, 'rgba(10, 4, 18, 0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, Math.max(0, band - h * 0.1), w, h * 0.3);
  ctx.textAlign = 'center';
  let cursor = band;
  if (text) {
    const size = fitTitle(ctx, text, w * 0.92, h * 0.115);
    ctx.font = `900 italic ${size}px sans-serif`;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = 'rgba(12, 4, 20, 0.9)';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, w / 2, cursor + size);
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.fillText(text, w / 2, cursor + size);
    ctx.shadowBlur = 0;
    cursor += size * 1.12;
    // Accent rule under the title.
    const ruleW = Math.min(w * 0.5, ctx.measureText(text).width * 0.6);
    ctx.fillStyle = accent;
    ctx.fillRect((w - ruleW) / 2, cursor + size * 0.08, ruleW, Math.max(3, h * 0.005));
    cursor += size * 0.22;
  }
  if (sub) {
    const size = Math.max(13, h * 0.028);
    ctx.font = `700 ${size}px sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillText(sub.toUpperCase(), w / 2, cursor + size);
  }
  // Small original studio mark, top-right corner, clear of the caption.
  const markSize = Math.max(11, h * 0.016);
  ctx.font = `800 ${markSize}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillText('VICE COVER STUDIO', w - w * 0.02, h * 0.032);
  ctx.textAlign = 'center';
}

/**
 * Draws the whole cover onto `canvas` at its own size.
 * `state` holds: photos (array of images or null), assignments (per layout, one
 * { photo, zoom, ox, oy } per panel), layout, grade, title, subtitle,
 * titleColor, captionPos, and selectedPanel (index, or -1) to outline.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const rects = panelRects(state.layout, w, h);
  const panels = state.assignments[state.layout] ?? [];
  ctx.fillStyle = grade.dark;
  ctx.fillRect(0, 0, w, h);
  rects.forEach((rect, i) => {
    const a = clampAssignment(panels[i] ?? { photo: 0, zoom: 1, ox: 0, oy: 0 });
    const img = state.photos[a.photo] ?? null;
    if (img) drawPanelPhoto(ctx, img, rect, a.zoom, a.ox, a.oy);
    else drawEmptyPanel(ctx, rect, grade, 'ADD A PHOTO');
  });
  // Grade wash over the whole sheet, stronger toward the bottom.
  const wash = ctx.createLinearGradient(0, h * 0.25, 0, h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  // Bright panel borders.
  const borderW = Math.max(2, w * 0.004);
  ctx.strokeStyle = grade.border;
  ctx.lineWidth = borderW;
  rects.forEach((rect) => {
    ctx.strokeRect(rect.x + borderW / 2, rect.y + borderW / 2, rect.w - borderW, rect.h - borderW);
  });
  // Selected panel outline, for the editor.
  if (state.selectedPanel >= 0 && rects[state.selectedPanel]) {
    const r = rects[state.selectedPanel];
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = Math.max(3, w * 0.006);
    ctx.setLineDash([Math.max(10, w * 0.02), Math.max(8, w * 0.012)]);
    ctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
    ctx.setLineDash([]);
  }
  drawCaption(ctx, w, h, {
    title: state.title,
    subtitle: state.subtitle,
    color: state.titleColor,
    position: state.captionPos,
    accent: grade.accent,
  });
}
