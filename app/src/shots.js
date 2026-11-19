// Fixed scenes for screenshots. `?shot=cover` shows the cover alone, full-window;
// `?shot=editor` shows the editor with photos loaded. Query parameters:
//   photo   — the sample for photo slot 1 (boulevard or pier, default pier)
//   photo2  — the sample for photo slot 2 (default boulevard)
//   caption — the title words (default "Sunset Heist")
//   layout  — hero, grid or strip (default hero)
//   grade   — sunset, neon or gold (default sunset)
//   size    — square, portrait or wide; sets the preview canvas (default square)
// window.__shotReady is set once the scene is painted.
export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const layout = query.get('layout') ?? 'hero';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? 'square';
  const sizes = { square: [1080, 1080], portrait: [1080, 1350], wide: [1920, 1080] };
  const [w, h] = sizes[size] ?? sizes.square;
  const canvas = document.getElementById('cover');
  canvas.width = w;
  canvas.height = h;
  api.setState({
    layout,
    grade,
    title: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'One last job under the neon',
    titleColor: query.get('color') ?? '#ffffff',
    captionPos: query.get('pos') ?? 'bottom',
    selectedPanel: -1,
  });
  await api.loadSample(0, query.get('photo') ?? 'pier');
  await api.loadSample(1, query.get('photo2') ?? 'boulevard');
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
    document.body.dataset.shotReady = '1';
  }));
}
