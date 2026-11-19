// Fixed scenes for screenshots: ?shot=cover shows the cover alone at the
// viewport's size; ?shot=editor shows the page with a sample photo loaded.
// `photo`/`photo2` pick the samples (samples/<name>.jpg), `caption` the
// title, `layout`/`grade` the poster style. window.__shotReady is set once
// the scene has painted (two animation frames after the draw).
export async function runShot(shot, query, apply) {
  if (shot === 'cover' || shot === 'cover2' || shot === 'wide') {
    document.body.classList.add('shot-cover');
  }
  const scene = {
    photoA: query.get('photo') ?? 'pier',
    photoB: query.get('photo2') ?? 'boulevard',
    layout: query.get('layout') ?? (shot === 'cover2' ? 'triptych' : shot === 'wide' ? 'hero' : 'duo'),
    grade: query.get('grade') ?? 'sunset',
    aspect: query.get('aspect') ?? (shot === 'wide' ? 'wide' : 'square'),
    title: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'Neon nights · 2026',
  };
  await apply(scene);
  // Fonts are the poster's look: wait for the vendored OFL faces, then paint
  // once more so the canvas text uses them, not a fallback.
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch { /* fonts are best-effort here; the draw already happened */ }
  window.__vice.redraw();
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  window.__shotReady = true;
}
