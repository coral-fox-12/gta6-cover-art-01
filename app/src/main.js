// Sunset Cover Studio — page wiring.
//
// State: two photos (A/B), per-photo crop (zoom + pan), layout, grade,
// title/subtitle, display font. The preview canvas re-renders on every
// change; exports render the same poster at exact pixel sizes and download
// as PNG. `?shot=` scenes (./shots.js) drive deterministic screenshots.
import { drawPoster, renderPoster, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');

const state = {
  photos: { a: null, b: null },
  crops: {
    a: { zoom: 1, dx: 0, dy: 0 },
    b: { zoom: 1, dx: 0, dy: 0 },
  },
  layout: 'duo',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'Neon nights · 2026',
  font: 'anton',
  titleScale: 1,
  aspect: 'square',
};

const ASPECTS = {
  square: { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide 1920 × 1080' },
};

const EXPORTS = [
  { key: 'square', w: 1080, h: 1080 },
  { key: 'portrait', w: 1080, h: 1350 },
  { key: 'wide', w: 1920, h: 1080 },
];

function setStatus(msg) {
  statusEl.textContent = msg;
}

function redraw() {
  const aspect = ASPECTS[state.aspect];
  canvas.width = aspect.w;
  canvas.height = aspect.h;
  drawPoster(canvas, state);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function pickPhoto(slot, file) {
  if (!file) return;
  try {
    state.photos[slot] = await loadImage(URL.createObjectURL(file));
    setStatus(`Photo ${slot.toUpperCase()} loaded — ${file.name}`);
    redraw();
  } catch {
    setStatus(`Could not read ${file.name} as an image.`);
  }
}

async function useSample(slot, name) {
  try {
    state.photos[slot] = await loadImage(`samples/${name}.jpg`);
    setStatus(`Photo ${slot.toUpperCase()} set to sample “${name}”.`);
    redraw();
  } catch {
    setStatus(`Sample ${name} failed to load.`);
  }
}

/** Renders + downloads the poster at an exact size; returns the size. */
export function exportPNG(w, h) {
  const out = renderPoster(w, h, state);
  return new Promise((resolve) => {
    out.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sunset-cover-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setStatus(`Exported sunset-cover-${w}x${h}.png (${blob.size.toLocaleString()} bytes)`);
      resolve({ w, h, bytes: blob.size });
    }, 'image/png');
  });
}

// --- Controls -------------------------------------------------------------

function bindPhotoControls(slot) {
  $(`photo-${slot}`).addEventListener('change', (e) => pickPhoto(slot, e.target.files[0]));
  document.querySelectorAll(`[data-sample="${slot}"]`).forEach((btn) => {
    btn.addEventListener('click', () => useSample(slot, btn.dataset.photo));
  });
  $(`zoom-${slot}`).addEventListener('input', (e) => {
    state.crops[slot].zoom = Number(e.target.value);
    $(`zoom-${slot}-val`).textContent = `${Math.round(state.crops[slot].zoom * 100)}%`;
    redraw();
  });
  $(`panx-${slot}`).addEventListener('input', (e) => {
    state.crops[slot].dx = Number(e.target.value);
    redraw();
  });
  $(`pany-${slot}`).addEventListener('input', (e) => {
    state.crops[slot].dy = Number(e.target.value);
    redraw();
  });
}
bindPhotoControls('a');
bindPhotoControls('b');

function syncToggleButtons(attr, value) {
  document.querySelectorAll(`[data-${attr}]`).forEach((b) => b.classList.toggle('active', b.dataset[attr] === value));
}

document.querySelectorAll('[data-layout]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.layout = btn.dataset.layout;
    syncToggleButtons('layout', state.layout);
    setStatus(`Layout: ${LAYOUTS[state.layout].label}`);
    redraw();
  });
});

document.querySelectorAll('[data-grade]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.grade = btn.dataset.grade;
    syncToggleButtons('grade', state.grade);
    setStatus(`Grade: ${GRADES[state.grade].label}`);
    redraw();
  });
});

/** Shuffle: pick a random layout + grade, so one click explores the looks. */
$('shuffle').addEventListener('click', () => {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  syncToggleButtons('layout', state.layout);
  syncToggleButtons('grade', state.grade);
  setStatus(`Shuffle: ${LAYOUTS[state.layout].label} + ${GRADES[state.grade].label}`);
  redraw();
});

document.querySelectorAll('[data-aspect]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.aspect = btn.dataset.aspect;
    syncToggleButtons('aspect', state.aspect);
    setStatus(`Preview: ${ASPECTS[state.aspect].label}`);
    redraw();
  });
});

document.querySelectorAll('[data-font]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.font = btn.dataset.font;
    syncToggleButtons('font', state.font);
    redraw();
  });
});

$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('title-size').addEventListener('input', (e) => {
  state.titleScale = Number(e.target.value);
  $('title-size-val').textContent = `${Math.round(state.titleScale * 100)}%`;
  redraw();
});

EXPORTS.forEach(({ w, h }) => {
  $(`export-${w}x${h}`).addEventListener('click', () => exportPNG(w, h));
});
$('export-all').addEventListener('click', async () => {
  for (const { w, h } of EXPORTS) await exportPNG(w, h);
  setStatus('Exported all three sizes.');
});

// --- Headless hooks (verification + screenshots) --------------------------
// window.__vice exposes the app for the screenshot/verification scripts:
// state, a render that returns a PNG data URL at an exact size, and the
// ready flag shots.js sets once a scene has painted.
window.__vice = {
  state,
  renderDataURL(w, h) {
    return renderPoster(w, h, state).toDataURL('image/png');
  },
  exportSize: exportPNG,
  redraw,
};

// --- Boot -----------------------------------------------------------------

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, async ({ photoA, photoB, layout, grade, aspect, title, subtitle }) => {
    if (layout) state.layout = layout;
    if (grade) state.grade = grade;
    if (aspect) state.aspect = aspect;
    if (title !== undefined) { state.title = title; $('title').value = title; }
    if (subtitle !== undefined) { state.subtitle = subtitle; $('subtitle').value = subtitle; }
    if (photoA) state.photos.a = await loadImage(`samples/${photoA}.jpg`);
    if (photoB) state.photos.b = await loadImage(`samples/${photoB}.jpg`);
    syncToggleButtons('layout', state.layout);
    syncToggleButtons('grade', state.grade);
    syncToggleButtons('aspect', state.aspect);
    redraw();
  });
} else {
  // First paint: load the pier sample so the app never opens empty.
  useSample('a', 'pier').then(() => { window.__shotReady = true; });
}
