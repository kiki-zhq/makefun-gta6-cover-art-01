// Vice Cover Studio — screenshot scenes (?shot=cover / ?shot=editor).
// Reads the query, boots the app into the scene, and marks window.__shotReady
// once the view has fully rendered, so screenshots capture the finished frame.
import { boot } from './main.js';

function readScene() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot') || 'editor';
  const photo = q.get('photo') || 'pier';
  const caption = q.get('caption') || '';
  const size = q.get('size') || 'square';
  const grade = q.get('grade') || '';
  const layout = q.get('layout') || '';
  return { shot, photo, caption, size, grade, layout };
}

async function runScene() {
  const scene = readScene();
  try {
    await boot({
      scene: scene.shot === 'cover' ? 'cover' : 'editor',
      photo: scene.photo,
      caption: scene.caption || undefined,
      size: scene.size,
      grade: scene.grade || undefined,
      layout: scene.layout || undefined,
    });
  } catch (err) {
    console.warn('scene boot failed', err);
  }
  // Let fonts, images and the canvas settle, then signal readiness.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runScene);
} else {
  runScene();
}
