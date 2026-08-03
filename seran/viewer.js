/*
 * Seran interactive map viewer.
 *
 * No dependencies. Layers arrive as 8-bit RGB PNGs carrying a 16-bit value
 * (high byte in R, low byte in G); the same decoded pixels drive both the
 * colour ramp and the value readout, so the number under the cursor is what
 * the model actually computed rather than a colour guessed back from a legend.
 */
'use strict';

// Resolve against THIS script's URL, not the page's. The page lives at "/"
// and the data at "/seran/data/", so a bare relative path would look in the
// wrong place.
const DATA = new URL('data/', document.currentScript.src).href;
const state = {
  meta: null,
  layers: {},          // id -> {vals:Float32Array|Uint8Array, w, h}
  current: 'elevation',
  hillshade: true,
  zoom: 1, panX: 0, panY: 0,
  dragging: false, lastX: 0, lastY: 0,
  base: null,          // elevation, kept for hillshading every layer
};

/* ---------------------------------------------------------------- palettes */
const stops = (arr) => (t) => {
  t = Math.max(0, Math.min(1, t));
  const n = arr.length - 1, i = Math.min(Math.floor(t * n), n - 1), f = t * n - i;
  const a = arr[i], b = arr[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
};

const PALETTES = {
  heat:  stops([[30,40,60],[40,110,140],[240,220,120],[220,110,50],[170,30,30]]),
  rain:  stops([[80,60,30],[190,170,90],[110,190,140],[40,130,190],[30,50,150]]),
  temp:  stops([[40,60,150],[90,160,200],[240,235,180],[230,140,60],[160,30,30]]),
  water: stops([[8,20,45],[20,70,120],[60,150,200],[160,220,245]]),
  earth: stops([[60,50,40],[120,95,60],[180,155,110],[225,215,185]]),
  ice:   stops([[20,35,60],[90,140,190],[200,225,245],[255,255,255]]),
  depth: stops([[5,12,35],[15,45,95],[35,95,150],[110,180,215],[200,235,245]]),
  slab:  stops([[250,240,200],[230,160,80],[190,80,60],[110,40,80],[40,20,60]]),
  age:   stops([[255,245,215],[240,190,120],[200,120,90],[130,60,90],[50,25,60]]),
};

// hypsometric: land and sea share one scale but read as different worlds
function hypso(v, seaLevel) {
  if (v <= seaLevel) {
    const d = Math.min(1, (seaLevel - v) / 9000);
    return stops([[150,215,225],[70,160,205],[30,95,160],[15,50,110],
                  [8,25,70],[4,12,40]])(Math.pow(d, 0.65));
  }
  const h = Math.min(1, (v - seaLevel) / 3950);
  return stops([[70,120,70],[110,150,75],[165,165,95],[160,120,75],
                [130,100,90],[190,190,195],[250,250,255]])(Math.pow(h, 0.72));
}

const CLASS_COLOURS = [
  [70,110,160],[95,150,95],[200,180,110],[170,120,70],[120,160,90],
  [60,120,80],[90,130,60],[150,170,130],[190,200,205],[225,225,230],
  [140,90,140],[110,80,50],[70,140,150],[200,120,90],[130,130,140],
  [80,170,190],[230,200,140],[110,60,90],[60,90,130],
];

/* ------------------------------------------------------------------ loading */
async function loadMeta() {
  state.meta = await (await fetch(DATA + 'layers.json')).json();
}

function decode(img, spec) {
  const c = document.createElement('canvas');
  c.width = spec.width; c.height = spec.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, spec.width, spec.height).data;
  const n = spec.width * spec.height;

  if (spec.encoding === 'class_r') {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = px[i * 4];
    return out;
  }
  const out = new Float32Array(n);
  const lo = spec.min, span = spec.max - spec.min;
  for (let i = 0; i < n; i++) {
    const u = (px[i * 4] << 8) | px[i * 4 + 1];      // R:high, G:low
    out[i] = lo + (u / 65535) * span;
  }
  return out;
}

function loadLayer(id) {
  if (state.layers[id]) return Promise.resolve(state.layers[id]);
  const spec = state.meta.layers.find((l) => l.id === id);
  if (!spec) return Promise.reject(new Error('no layer ' + id));
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const rec = { vals: decode(img, spec), w: spec.width, h: spec.height, spec };
      state.layers[id] = rec;
      res(rec);
    };
    img.onerror = () => rej(new Error('failed to load ' + spec.file));
    img.src = DATA + spec.file;
  });
}

/* ----------------------------------------------------------------- drawing */
function render() {
  const rec = state.layers[state.current];
  if (!rec) return;
  const { w, h, vals, spec } = rec;
  const cv = document.getElementById('map');
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;

  const sea = state.meta.sea_level_m;
  const base = state.base;
  const isClass = spec.kind === 'class';
  const pal = PALETTES[spec.palette] || PALETTES.heat;
  const lo = spec.min, span = (spec.max - spec.min) || 1;

  // hillshade from elevation, so every layer reads as terrain
  let shade = null;
  if (state.hillshade && base && base.w === w) {
    shade = new Float32Array(w * h);
    const az = Math.PI * 5 / 4, alt = Math.PI / 6, ce = 250;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx = (base.vals[i + 1] - base.vals[i - 1]) / (2 * ce);
        const gy = (base.vals[i + w] - base.vals[i - w]) / (2 * ce);
        const sl = Math.atan(Math.hypot(gx, gy));
        const asp = Math.atan2(-gx, gy);
        shade[i] = Math.max(0, Math.sin(alt) * Math.cos(sl) +
                               Math.cos(alt) * Math.sin(sl) * Math.cos(az - asp));
      }
    }
  }

  for (let i = 0; i < w * h; i++) {
    let c;
    if (isClass) {
      const k = vals[i];
      c = k === 0 ? [16, 26, 48] : CLASS_COLOURS[k % CLASS_COLOURS.length];
    } else if (spec.id === 'elevation') {
      c = hypso(vals[i], sea);
    } else {
      const under = base && base.vals[i] <= sea;
      c = under ? [14, 24, 46] : pal((vals[i] - lo) / span);
    }
    let m = 1;
    if (shade) m = 0.45 + 0.85 * shade[i];
    const o = i * 4;
    d[o] = Math.min(255, c[0] * m);
    d[o + 1] = Math.min(255, c[1] * m);
    d[o + 2] = Math.min(255, c[2] * m);
    d[o + 3] = 255;
  }
  cv.width = w; cv.height = h;
  ctx.putImageData(img, 0, 0);
  applyTransform();
  drawLegend(spec);
}

function applyTransform() {
  const cv = document.getElementById('map');
  cv.style.transform =
    `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
}

function drawLegend(spec) {
  const el = document.getElementById('legend');
  if (spec.kind === 'class') {
    const table = state.meta.classes[spec.id] || {};
    el.innerHTML = Object.keys(table).map((k) => {
      const c = Number(k) === 0 ? [16, 26, 48]
        : CLASS_COLOURS[Number(k) % CLASS_COLOURS.length];
      return `<span class="sw"><i style="background:rgb(${c.join(',')})"></i>${table[k]}</span>`;
    }).join('');
    return;
  }
  const pal = spec.id === 'elevation' ? null : (PALETTES[spec.palette] || PALETTES.heat);
  const n = 40, cells = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const c = pal ? pal(t)
      : hypso(state.meta.sea_level_m + t * 3900, state.meta.sea_level_m);
    cells.push(`<i style="background:rgb(${c.map(Math.round).join(',')})"></i>`);
  }
  const fmt = (v) => spec.kind === 'scalar_log'
    ? Math.pow(10, v).toPrecision(2) : v.toFixed(v > 100 ? 0 : 1);
  el.innerHTML = `<span class="ramp">${cells.join('')}</span>
    <span class="lbl">${spec.id === 'elevation' ? '0' : fmt(spec.min)}</span>
    <span class="lbl r">${spec.id === 'elevation' ? '3900 m' : fmt(spec.max) + ' ' + spec.unit}</span>`;
}

/* ---------------------------------------------------------------- readout */
function readout(ev) {
  const rec = state.layers[state.current];
  if (!rec) return;
  const cv = document.getElementById('map');
  const r = cv.getBoundingClientRect();
  const x = Math.floor((ev.clientX - r.left) / r.width * rec.w);
  const y = Math.floor((ev.clientY - r.top) / r.height * rec.h);
  const box = document.getElementById('readout');
  if (x < 0 || y < 0 || x >= rec.w || y >= rec.h) { box.textContent = ''; return; }

  const i = y * rec.w + x;
  const spec = rec.spec;
  let txt;
  if (spec.kind === 'class') {
    const table = state.meta.classes[spec.id] || {};
    txt = table[String(rec.vals[i])] || 'class ' + rec.vals[i];
  } else {
    let v = rec.vals[i];
    if (spec.kind === 'scalar_log') v = Math.pow(10, v);
    txt = (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)) + ' ' + spec.unit;
  }
  const cn = state.meta.corners;
  const lat = cn.lat[1] - (y / rec.h) * (cn.lat[1] - cn.lat[0]);
  const lon = cn.lon[0] + (x / rec.w) * (cn.lon[1] - cn.lon[0]);
  let elev = '';
  if (state.base && state.current !== 'elevation') {
    elev = ` · ${state.base.vals[i].toFixed(0)} m`;
  }
  box.innerHTML = `<b>${txt}</b>${elev}<span class="ll">${lat.toFixed(2)}°N ${lon.toFixed(2)}°E</span>`;
}

/* -------------------------------------------------------------------- init */
async function main() {
  await loadMeta();
  const sel = document.getElementById('layers');
  state.meta.layers.forEach((l) => {
    const b = document.createElement('button');
    b.textContent = l.label;
    b.dataset.id = l.id;
    b.onclick = async () => {
      document.querySelectorAll('#layers button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      b.disabled = true;
      await loadLayer(l.id);
      b.disabled = false;
      state.current = l.id;
      render();
    };
    sel.appendChild(b);
  });

  state.base = await loadLayer('elevation');
  document.querySelector('#layers button').classList.add('on');
  render();
  document.getElementById('loading').remove();

  const wrap = document.getElementById('wrap');
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const nz = Math.max(0.4, Math.min(14, state.zoom * f));
    const r = wrap.getBoundingClientRect();
    const cx = e.clientX - r.left - r.width / 2 - state.panX;
    const cy = e.clientY - r.top - r.height / 2 - state.panY;
    state.panX -= cx * (nz / state.zoom - 1);
    state.panY -= cy * (nz / state.zoom - 1);
    state.zoom = nz;
    applyTransform();
  }, { passive: false });

  wrap.addEventListener('mousedown', (e) => {
    state.dragging = true; state.lastX = e.clientX; state.lastY = e.clientY;
    wrap.classList.add('grab');
  });
  addEventListener('mouseup', () => { state.dragging = false; wrap.classList.remove('grab'); });
  wrap.addEventListener('mousemove', (e) => {
    if (state.dragging) {
      state.panX += e.clientX - state.lastX;
      state.panY += e.clientY - state.lastY;
      state.lastX = e.clientX; state.lastY = e.clientY;
      applyTransform();
    }
    readout(e);
  });

  document.getElementById('shade').onclick = (e) => {
    state.hillshade = !state.hillshade;
    e.target.classList.toggle('on', state.hillshade);
    render();
  };
  document.getElementById('reset').onclick = () => {
    state.zoom = 1; state.panX = 0; state.panY = 0; applyTransform();
  };
}

main().catch((e) => {
  document.getElementById('loading').textContent = 'Failed to load: ' + e.message;
});
