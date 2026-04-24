const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'images');

function rgba(hex, alpha = 255) {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
    a: alpha,
  };
}

function mix(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
    a: Math.round(a.a + (b.a - a.a) * t),
  };
}

function put(png, x, y, color, coverage = 1) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height || coverage <= 0) return;
  const idx = (Math.floor(y) * png.width + Math.floor(x)) * 4;
  const srcA = (color.a / 255) * Math.min(1, coverage);
  const dstA = png.data[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);

  if (outA <= 0) return;

  png.data[idx] = Math.round((color.r * srcA + png.data[idx] * dstA * (1 - srcA)) / outA);
  png.data[idx + 1] = Math.round((color.g * srcA + png.data[idx + 1] * dstA * (1 - srcA)) / outA);
  png.data[idx + 2] = Math.round((color.b * srcA + png.data[idx + 2] * dstA * (1 - srcA)) / outA);
  png.data[idx + 3] = Math.round(outA * 255);
}

function fill(png, color) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      put(png, x, y, color);
    }
  }
}

function fillGradient(png, topLeft, bottomRight) {
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const t = Math.min(1, Math.max(0, (x + y) / (png.width + png.height)));
      put(png, x, y, mix(topLeft, bottomRight, t));
    }
  }
}

function circle(png, cx, cy, radius, color) {
  const minX = Math.floor(cx - radius - 2);
  const maxX = Math.ceil(cx + radius + 2);
  const minY = Math.floor(cy - radius - 2);
  const maxY = Math.ceil(cy + radius + 2);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      put(png, x, y, color, radius + 0.7 - d);
    }
  }
}

function roundedRect(png, x, y, w, h, r, color) {
  const minX = Math.floor(x - 2);
  const maxX = Math.ceil(x + w + 2);
  const minY = Math.floor(y - 2);
  const maxY = Math.ceil(y + h + 2);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const bx = w / 2 - r;
  const by = h / 2 - r;

  for (let py = minY; py <= maxY; py += 1) {
    for (let px = minX; px <= maxX; px += 1) {
      const qx = Math.abs(px + 0.5 - cx) - bx;
      const qy = Math.abs(py + 0.5 - cy) - by;
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const inside = Math.min(Math.max(qx, qy), 0);
      const dist = outside + inside - r;
      put(png, px, py, color, 0.7 - dist);
    }
  }
}

function capsule(png, x1, y1, x2, y2, radius, color) {
  const minX = Math.floor(Math.min(x1, x2) - radius - 2);
  const maxX = Math.ceil(Math.max(x1, x2) + radius + 2);
  const minY = Math.floor(Math.min(y1, y2) - radius - 2);
  const maxY = Math.ceil(Math.max(y1, y2) + radius + 2);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((x + 0.5 - x1) * dx + (y + 0.5 - y1) * dy) / lenSq));
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      put(png, x, y, color, radius + 0.7 - d);
    }
  }
}

function miniPaw(png, cx, cy, scale, color) {
  circle(png, cx - 28 * scale, cy - 18 * scale, 11 * scale, color);
  circle(png, cx - 8 * scale, cy - 31 * scale, 12 * scale, color);
  circle(png, cx + 14 * scale, cy - 31 * scale, 12 * scale, color);
  circle(png, cx + 34 * scale, cy - 18 * scale, 11 * scale, color);
  roundedRect(png, cx - 24 * scale, cy + 2 * scale, 56 * scale, 39 * scale, 20 * scale, color);
}

function poopMark(png, cx, cy, scale, color, highlightColor) {
  roundedRect(png, cx - 120 * scale, cy + 66 * scale, 240 * scale, 92 * scale, 46 * scale, color);
  capsule(png, cx - 86 * scale, cy + 58 * scale, cx + 88 * scale, cy + 10 * scale, 48 * scale, color);
  capsule(png, cx - 54 * scale, cy - 4 * scale, cx + 64 * scale, cy - 56 * scale, 43 * scale, color);
  circle(png, cx + 18 * scale, cy - 96 * scale, 42 * scale, color);
  capsule(png, cx - 44 * scale, cy + 104 * scale, cx + 56 * scale, cy + 80 * scale, 10 * scale, highlightColor);
  capsule(png, cx - 12 * scale, cy + 26 * scale, cx + 44 * scale, cy + 8 * scale, 8 * scale, highlightColor);
}

function brandMark(png, size, opts = {}) {
  const scale = size / 1024;
  const cx = opts.cx ?? size / 2;
  const cy = opts.cy ?? size / 2;
  const teal = opts.markColor ?? rgba('20B2AA');
  const pocket = opts.lightColor ?? rgba('FFFFFF');
  const poop = opts.poopColor ?? rgba('8B5E34');
  const poopLight = opts.poopLightColor ?? rgba('F4B455');
  const shadow = opts.shadowColor ?? rgba('063F3B', 34);

  roundedRect(png, cx - 248 * scale + 8 * scale, cy - 268 * scale + 24 * scale, 496 * scale, 560 * scale, 124 * scale, shadow);
  roundedRect(png, cx - 248 * scale, cy - 268 * scale, 496 * scale, 560 * scale, 124 * scale, pocket);
  capsule(png, cx - 156 * scale, cy + 88 * scale, cx + 156 * scale, cy + 88 * scale, 12 * scale, rgba('D6EDEA'));
  capsule(png, cx - 156 * scale, cy + 88 * scale, cx - 96 * scale, cy + 208 * scale, 10 * scale, rgba('D6EDEA'));
  capsule(png, cx + 156 * scale, cy + 88 * scale, cx + 96 * scale, cy + 208 * scale, 10 * scale, rgba('D6EDEA'));
  poopMark(png, cx, cy - 24 * scale, scale, poop, poopLight);
  miniPaw(png, cx + 145 * scale, cy + 184 * scale, scale, teal);
  circle(png, cx + 145 * scale, cy + 184 * scale, 72 * scale, rgba('FFFFFF', 0));
}

function backgroundTexture(png, size, isDark = false) {
  const teal = rgba(isDark ? '082F2C' : '20B2AA');
  const deep = rgba(isDark ? '020F0E' : '0F766E');
  fillGradient(png, teal, deep);
  circle(png, size * 0.17, size * 0.16, size * 0.34, rgba('FFFFFF', isDark ? 10 : 22));
  circle(png, size * 0.92, size * 0.84, size * 0.42, rgba('FFFFFF', isDark ? 8 : 18));
  capsule(png, size * 0.1, size * 0.85, size * 0.92, size * 0.1, size * 0.035, rgba('FFFFFF', isDark ? 8 : 14));
}

function writePng(fileName, png) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, fileName), PNG.sync.write(png, { colorType: 6 }));
}

function makeIcon(size) {
  const png = new PNG({ width: size, height: size });
  backgroundTexture(png, size);
  brandMark(png, size);
  return png;
}

function makeAdaptiveBackground(size) {
  const png = new PNG({ width: size, height: size });
  fillGradient(png, rgba('E9FBF8'), rgba('CFF5EF'));
  circle(png, size * 0.14, size * 0.2, size * 0.28, rgba('20B2AA', 34));
  circle(png, size * 0.96, size * 0.82, size * 0.34, rgba('0F766E', 22));
  return png;
}

function makeAdaptiveForeground(size, monochrome = false) {
  const png = new PNG({ width: size, height: size });
  const markColor = monochrome ? rgba('FFFFFF') : rgba('20B2AA');
  const lightColor = monochrome ? rgba('FFFFFF', 0) : rgba('FFFFFF');

  if (monochrome) {
    const cx = size / 2;
    const cy = size / 2;
    const scale = size / 1024;
    capsule(png, cx - 154 * scale, cy - 220 * scale, cx + 154 * scale, cy - 220 * scale, 18 * scale, markColor);
    capsule(png, cx - 198 * scale, cy - 118 * scale, cx - 154 * scale, cy + 210 * scale, 18 * scale, markColor);
    capsule(png, cx + 198 * scale, cy - 118 * scale, cx + 154 * scale, cy + 210 * scale, 18 * scale, markColor);
    capsule(png, cx - 120 * scale, cy + 230 * scale, cx + 120 * scale, cy + 230 * scale, 18 * scale, markColor);
    poopMark(png, cx, cy - 24 * scale, scale, markColor, markColor);
    miniPaw(png, cx + 145 * scale, cy + 184 * scale, scale, markColor);
  } else {
    brandMark(png, size, { markColor, lightColor, shadowColor: rgba('063F3B', 26) });
  }

  return png;
}

function makeSplash(size) {
  const png = new PNG({ width: size, height: size });
  const markSize = size * 0.74;
  const inset = (size - markSize) / 2;
  roundedRect(png, inset, inset, markSize, markSize, size * 0.18, rgba('E9FBF8'));
  roundedRect(png, inset + size * 0.018, inset + size * 0.018, markSize - size * 0.036, markSize - size * 0.036, size * 0.16, rgba('FFFFFF', 168));
  brandMark(png, size, {
    cx: size / 2,
    cy: size / 2,
    markColor: rgba('20B2AA'),
    lightColor: rgba('FFFFFF'),
    poopColor: rgba('8B5E34'),
    poopLightColor: rgba('F4B455'),
    shadowColor: rgba('063F3B', 22),
  });
  return png;
}

writePng('icon.png', makeIcon(1024));
writePng('favicon.png', makeIcon(48));
writePng('android-icon-background.png', makeAdaptiveBackground(512));
writePng('android-icon-foreground.png', makeAdaptiveForeground(512));
writePng('android-icon-monochrome.png', makeAdaptiveForeground(432, true));
writePng('splash-icon.png', makeSplash(1024));
