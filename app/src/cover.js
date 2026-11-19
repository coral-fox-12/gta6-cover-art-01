// Sunset Cover Studio — poster engine.
//
// Draws a multi-panel poster in the style of a sunset poster,
// using only the user's own photos and vendored OFL fonts. No Rockstar
// artwork, logo or font is used anywhere: the sun disc, skyline and palm
// silhouettes below are drawn from scratch with canvas paths.
//
// The engine is resolution-independent: drawPoster() takes any canvas and
// renders the current state at that canvas's pixel size, so the on-screen
// preview and the exported PNGs share exactly the same drawing code.

export const LAYOUTS = {
  duo: {
    label: 'Split Duo',
    panels: [
      { photo: 'a', x: 0, y: 0, w: 0.5, h: 0.78 },
      { photo: 'b', x: 0.5, y: 0, w: 0.5, h: 0.78 },
    ],
    caption: 0.78,
  },
  triptych: {
    label: 'Triptych',
    panels: [
      { photo: 'a', x: 0, y: 0, w: 1 / 3, h: 0.78 },
      { photo: 'b', x: 1 / 3, y: 0, w: 1 / 3, h: 0.78 },
      { photo: 'a', x: 2 / 3, y: 0, w: 1 / 3, h: 0.78 },
    ],
    caption: 0.78,
  },
  hero: {
    label: 'Hero + Strip',
    panels: [
      { photo: 'a', x: 0, y: 0, w: 1, h: 0.56 },
      { photo: 'b', x: 0, y: 0.56, w: 0.5, h: 0.22 },
      { photo: 'a', x: 0.5, y: 0.56, w: 0.5, h: 0.22 },
    ],
    caption: 0.78,
    sun: true,
  },
  single: {
    label: 'Full Frame',
    panels: [{ photo: 'a', x: 0, y: 0, w: 1, h: 1 }],
    caption: 0.78,
    overlayCaption: true,
  },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    saturate: 1.3,
    contrast: 1.08,
    top: 'rgba(255, 122, 24, 0.32)',
    bottom: 'rgba(255, 46, 136, 0.48)',
  },
  neon: {
    label: 'Neon Nights',
    saturate: 1.45,
    contrast: 1.12,
    top: 'rgba(0, 229, 255, 0.30)',
    bottom: 'rgba(255, 0, 128, 0.45)',
  },
  gold: {
    label: 'Vice Gold',
    saturate: 1.2,
    contrast: 1.05,
    top: 'rgba(255, 190, 60, 0.30)',
    bottom: 'rgba(190, 60, 20, 0.40)',
  },
  noir: {
    label: 'Mono Noir',
    saturate: 0.35,
    contrast: 1.22,
    top: 'rgba(120, 140, 200, 0.22)',
    bottom: 'rgba(10, 10, 30, 0.45)',
  },
};

/** Deterministic pseudo-random from an integer seed (for skyline windows). */
function seeded(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Draws `img` to cover rect (x, y, w, h), with zoom and pan offsets.
 *  When the photo must be cropped top-to-bottom (a wide panel holding a
 *  square or portrait photo), the crop is biased toward the top of the
 *  frame, where faces usually are, instead of dead centre. */
function drawCoverFit(ctx, img, x, y, w, h, crop) {
  const zoom = crop?.zoom ?? 1;
  const dx = crop?.dx ?? 0;
  const dy = crop?.dy ?? 0;
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const topBias = ph > h ? (ph - h) * 0.18 : 0;
  ctx.drawImage(img, x + (w - pw) / 2 + dx * w, y + (h - ph) / 2 + dy * h - topBias, pw, ph);
}

/** Sunset disc with slatted lower half, drawn from scratch. */
function drawSun(ctx, cx, cy, r) {
  ctx.save();
  // Clip to the disc first: the slats below must only cut the sun itself,
  // never the photo underneath it.
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#ffe259');
  g.addColorStop(0.55, '#ff7e2e');
  g.addColorStop(1, '#ff2e88');
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Slats: cut horizontal gaps through the lower half of the disc.
  ctx.globalCompositeOperation = 'destination-out';
  const slats = 5;
  for (let i = 0; i < slats; i += 1) {
    const sy = cy + (r * (i + 0.5)) / slats;
    ctx.fillRect(cx - r, sy, r * 2, r * 0.09);
  }
  ctx.restore();
}

/** Dark skyline silhouette with a few lit windows, drawn from scratch. */
function drawSkyline(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(16, 6, 28, 0.92)';
  let bx = x;
  let i = 0;
  while (bx < x + w) {
    const bw = w * (0.06 + seeded(i) * 0.09);
    const bh = h * (0.35 + seeded(i + 50) * 0.6);
    ctx.fillRect(bx, y + h - bh, bw, bh);
    // Lit windows: tiny warm dots on some buildings.
    ctx.fillStyle = 'rgba(255, 214, 120, 0.9)';
    const rows = Math.floor(bh / (h * 0.09));
    const cols = Math.floor(bw / (w * 0.03));
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (seeded(i * 91 + r * 17 + c * 7) > 0.72) {
          ctx.fillRect(bx + c * w * 0.03 + w * 0.008, y + h - bh + r * h * 0.09 + h * 0.02, w * 0.012, h * 0.03);
        }
      }
    }
    ctx.fillStyle = 'rgba(16, 6, 28, 0.92)';
    bx += bw + w * 0.008;
    i += 1;
  }
  ctx.restore();
}

/** Applies the colour grade over a panel rect: tint gradients + vignette. */
function applyGrade(ctx, x, y, w, h, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, grade.top);
  g.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // Vignette: darken the panel edges so the photo sits in the poster.
  const v = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.32,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.72,
  );
  v.addColorStop(0, 'rgba(10, 4, 20, 0)');
  v.addColorStop(1, 'rgba(10, 4, 20, 0.42)');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = v;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Draws one photo panel: photo, grade, inner keyline. */
function drawPanel(ctx, panel, photos, crops, grade, W, H) {
  const x = panel.x * W;
  const y = panel.y * H;
  const w = panel.w * W;
  const h = panel.h * H;
  const img = photos[panel.photo] ?? photos.a ?? photos.b ?? null;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#2b1838';
  ctx.fillRect(x, y, w, h);
  if (img) {
    ctx.filter = `saturate(${grade.saturate}) contrast(${grade.contrast})`;
    drawCoverFit(ctx, img, x, y, w, h, crops[panel.photo]);
    ctx.filter = 'none';
    applyGrade(ctx, x, y, w, h, grade);
  } else {
    // Empty panel: a placeholder sunset gradient so the layout still reads.
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#3a1c5c');
    g.addColorStop(0.6, '#c22e6e');
    g.addColorStop(1, '#ff7a18');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    drawSun(ctx, x + w / 2, y + h * 0.42, Math.min(w, h) * 0.22);
  }
  ctx.restore();
  // Gutter keyline around the panel.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = Math.max(2, W * 0.002);
  ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

/** Word-wraps `text` to at most two lines that fit `maxWidth` at `font`. */
function wrapTitle(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [''];
  for (const word of words) {
    const trial = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !lines[lines.length - 1]) {
      lines[lines.length - 1] = trial;
    } else if (lines.length === 1) {
      lines.push(word);
    } else {
      // Two lines are full: squeeze the word onto the second line anyway.
      lines[1] += ` ${word}`;
    }
  }
  return lines.filter(Boolean);
}

/** Draws the caption band: gradient, big display title, subtitle, footer. */
function drawCaption(ctx, state, W, H, bandY, bandH, overlay) {
  const { title, subtitle, font } = state;
  if (overlay) {
    const g = ctx.createLinearGradient(0, bandY - bandH * 0.4, 0, H);
    g.addColorStop(0, 'rgba(20, 5, 35, 0)');
    g.addColorStop(1, 'rgba(20, 5, 35, 0.82)');
    ctx.fillStyle = g;
    ctx.fillRect(0, bandY - bandH * 0.4, W, bandH * 1.4);
  } else {
    const g = ctx.createLinearGradient(0, bandY, W, bandY + bandH);
    g.addColorStop(0, '#ff2e88');
    g.addColorStop(0.5, '#ff5e3a');
    g.addColorStop(1, '#ffb347');
    ctx.fillStyle = g;
    ctx.fillRect(0, bandY, W, bandH);
    // Thin neon rules top and bottom of the band.
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(0, bandY, W, Math.max(3, H * 0.004));
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(0, bandY + bandH - Math.max(2, H * 0.002), W, Math.max(2, H * 0.002));
  }

  const text = (title || '').trim().toUpperCase();
  const cx = W / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (text) {
    let size = bandH * 0.42 * (state.titleScale ?? 1);
    const face = font === 'archivo' ? "'Archivo Black'" : 'Anton';
    const setFont = (s) => { ctx.font = `${s}px ${face}, 'Archivo Black', sans-serif`; };
    setFont(size);
    // Shrink until the wrapped title fits, then draw up to two lines.
    let lines = wrapTitle(ctx, text, W * 0.9);
    while (lines.length > 2 && size > 12) {
      size -= 2;
      setFont(size);
      lines = wrapTitle(ctx, text, W * 0.9);
    }
    while (lines.some((l) => ctx.measureText(l).width > W * 0.9) && size > 12) {
      size -= 2;
      setFont(size);
    }
    const lineH = size * 1.02;
    const totalH = lineH * lines.length;
    const top = bandY + bandH * 0.40 - totalH / 2 + (overlay ? bandH * 0.22 : 0);
    ctx.save();
    ctx.rotate(-0.015);
    ctx.shadowColor = 'rgba(20, 5, 35, 0.55)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.04;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(20, 5, 35, 0.65)';
    ctx.lineWidth = Math.max(2, size * 0.06);
    lines.forEach((line, i) => {
      const ly = top + lineH * (i + 0.5);
      ctx.strokeText(line, cx, ly);
      ctx.fillText(line, cx, ly);
    });
    ctx.restore();
  }
  const sub = (subtitle || '').trim();
  if (sub) {
    const size = Math.max(12, bandH * 0.105);
    ctx.font = `${size}px 'Archivo Black', sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, size * 0.18)}px`; } catch { /* older canvas: no letter-spacing */ }
    ctx.fillStyle = overlay ? 'rgba(255,255,255,0.92)' : 'rgba(30, 5, 40, 0.92)';
    ctx.fillText(sub.toUpperCase(), cx, bandY + bandH * 0.80);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }
  if (!overlay) {
    ctx.font = `${Math.max(10, bandH * 0.07)}px 'Archivo Black', sans-serif`;
    ctx.fillStyle = 'rgba(30, 5, 40, 0.6)';
    ctx.fillText('MADE WITH SUNSET COVER STUDIO', cx, bandY + bandH * 0.94);
  }
}

/**
 * Draws the whole poster onto `canvas` at its own pixel size.
 * `state`: { photos: {a, b}, crops: {a, b}, layout, grade, title, subtitle, font, titleScale }
 */
export function drawPoster(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.duo;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  ctx.clearRect(0, 0, W, H);
  // Poster ground: deep violet-black with a faint warm wash at the top.
  const ground = ctx.createLinearGradient(0, 0, 0, H);
  ground.addColorStop(0, '#1a0b2e');
  ground.addColorStop(1, '#0d0518');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, W, H);

  const gutter = Math.max(4, W * 0.008);
  for (const panel of layout.panels) {
    const inset = {
      x: panel.x + (panel.x === 0 ? 0 : gutter / 2 / W),
      y: panel.y,
      w: panel.w - (panel.x === 0 || panel.x + panel.w >= 1 ? gutter / 2 / W : gutter / W),
      h: panel.h,
    };
    drawPanel(ctx, { ...panel, ...inset }, state.photos, state.crops, grade, W, H);
  }

  if (layout.sun) {
    // Sun disc peeking over the hero panel's horizon, top right; the skyline
    // strip drawn after it grounds the disc's lower half.
    drawSun(ctx, W * 0.78, H * 0.38, Math.min(W, H) * 0.15);
    drawSkyline(ctx, 0, H * 0.44, W, H * 0.12);
  }

  const bandY = layout.caption * H;
  const bandH = H - bandY;
  drawCaption(ctx, state, W, H, bandY, bandH, Boolean(layout.overlayCaption));
}

/** Renders the poster at an exact export size and returns the canvas. */
export function renderPoster(width, height, state) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawPoster(canvas, state);
  return canvas;
}
