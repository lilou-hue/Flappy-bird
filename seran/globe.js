/*
 * Seran 3D viewer — MapLibre GL JS.
 *
 * Two audiences, one map. The default is the picture: hypsometric basemap
 * draped over real relief, lit, with sky. Behind a toggle are the seventeen
 * analytical layers and a cursor readout that reports what the model actually
 * computed rather than a colour guessed back off a legend.
 *
 * Vertical exaggeration defaults to 1.0 and says so. Seran's highest point is
 * 3,902 m on a 680 km island — a ratio of 1:174, which is genuinely almost
 * flat. Every 3D terrain viewer tempts you to lie about that; docs/06 calls
 * exaggeration the single most reliable tell of a generated world. The slider
 * is there because flat is hard to read, not because flat is wrong.
 */
'use strict';

const BASE = new URL('.', document.currentScript.src).href;
const DATA = BASE + 'data3d/';

const state = { meta: null, map: null, layer: null, cache: {}, exag: 1.0 };

/* ------------------------------------------------------------- palettes */
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
  hypso: stops([[70,120,70],[110,150,75],[165,165,95],[160,120,75],[130,100,90],[240,240,245]]),
};
const CLASS_COLOURS = [
  [70,110,160],[95,150,95],[200,180,110],[170,120,70],[120,160,90],
  [60,120,80],[90,130,60],[150,170,130],[190,200,205],[225,225,230],
  [140,90,140],[110,80,50],[70,140,150],[200,120,90],[130,130,140],
  [80,170,190],[230,200,140],[110,60,90],[60,90,130],
];

/* --------------------------------------------------------------- decode */
function decodeLayer(spec) {
  if (state.cache[spec.id]) return Promise.resolve(state.cache[spec.id]);
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const px = g.getImageData(0, 0, img.width, img.height).data;
      const n = img.width * img.height;
      let vals;
      if (spec.encoding === 'class_r') {
        vals = new Uint8Array(n);
        for (let i = 0; i < n; i++) vals[i] = px[i * 4];
      } else {
        vals = new Float32Array(n);
        const lo = spec.min, span = spec.max - spec.min;
        for (let i = 0; i < n; i++) {
          vals[i] = lo + (((px[i * 4] << 8) | px[i * 4 + 1]) / 65535) * span;
        }
      }
      const rec = { vals, w: img.width, h: img.height, spec };
      state.cache[spec.id] = rec;
      res(rec);
    };
    img.onerror = () => rej(new Error('load ' + spec.id));
    img.src = DATA + spec.id + '.png';
  });
}

/** Colour-ramp a decoded layer into a data-URL the map can drape. */
function tint(rec) {
  const { vals, w, h, spec } = rec;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const isClass = spec.kind === 'class';
  const pal = PALETTES[spec.palette] || PALETTES.heat;
  const lo = spec.min, span = (spec.max - spec.min) || 1;
  for (let i = 0; i < w * h; i++) {
    let col;
    if (isClass) {
      const k = vals[i];
      col = k === 0 ? null : CLASS_COLOURS[k % CLASS_COLOURS.length];
    } else {
      col = pal((vals[i] - lo) / span);
    }
    const o = i * 4;
    if (col) { d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 216; }
    else { d[o + 3] = 0; }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

/* ----------------------------------------------------------------- map */
function cornersOf(b) {                     // [w,s,e,n] -> MapLibre corner list
  return [[b[0], b[3]], [b[2], b[3]], [b[2], b[1]], [b[0], b[1]]];
}

async function main() {
  state.meta = await (await fetch(DATA + 'seran3d.json')).json();
  const m = state.meta;
  const b = m.bounds;

  const style = {
    version: 8,
    sources: {
      dem: {
        type: 'raster-dem', tiles: [DATA + m.terrain.tiles],
        tileSize: m.terrain.tileSize, minzoom: m.terrain.minzoom,
        maxzoom: m.terrain.maxzoom, encoding: m.terrain.encoding,
        // Without this MapLibre asks for every tile in the viewport and takes a
        // 404 for each one outside the model. Harmless but it fills the console
        // with what look like errors, which buries the ones that are real.
        bounds: b,
      },
      base: { type: 'image', url: DATA + m.basemap, coordinates: cornersOf(b) },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#05080f' } },
      { id: 'base', type: 'raster', source: 'base',
        paint: { 'raster-opacity': 1, 'raster-fade-duration': 0 } },
      { id: 'hs', type: 'hillshade', source: 'dem',
        paint: { 'hillshade-exaggeration': 0.35,
                 'hillshade-shadow-color': '#0a1020',
                 'hillshade-highlight-color': '#ffffff' } },
    ],
    sky: { 'sky-color': '#7ab6e8', 'horizon-color': '#cfe3f2',
           'fog-color': '#b9cfe0', 'sky-horizon-blend': 0.6, 'fog-ground-blend': 0.6 },
  };

  const map = state.map = new maplibregl.Map({
    container: 'map', style,
    center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2],
    zoom: 5.1, pitch: 62, bearing: -28, maxPitch: 80, antialias: true,
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 140, unit: 'metric' }));

  map.on('load', () => {
    map.setTerrain({ source: 'dem', exaggeration: state.exag });
    document.getElementById('loading').remove();
    buildUI();
  });

  map.on('mousemove', (e) => readout(e.lngLat));
}

/* ------------------------------------------------------------- controls */
function buildUI() {
  const list = document.getElementById('layers');
  const mk = (id, label, on, fn) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (on) btn.classList.add('on');
    btn.onclick = () => { [...list.children].forEach(c => c.classList.remove('on'));
                          btn.classList.add('on'); fn(); };
    list.appendChild(btn);
    return btn;
  };

  mk('none', 'Terrain (natural)', true, () => setLayer(null));
  state.meta.layers.forEach((l) => mk(l.id, l.label, false, () => setLayer(l)));

  const ex = document.getElementById('exag');
  const exv = document.getElementById('exagval');
  ex.oninput = () => {
    state.exag = Number(ex.value);
    exv.textContent = state.exag.toFixed(1) + '×';
    exv.classList.toggle('warn', state.exag > 1.01);
    state.map.setTerrain({ source: 'dem', exaggeration: state.exag });
  };
  document.getElementById('top').onclick = () =>
    state.map.easeTo({ pitch: 0, bearing: 0, duration: 900 });
  document.getElementById('tilt').onclick = () =>
    state.map.easeTo({ pitch: 68, bearing: -28, duration: 900 });
}

async function setLayer(spec) {
  const map = state.map;
  if (map.getLayer('data')) { map.removeLayer('data'); map.removeSource('data'); }
  state.layer = spec;
  document.getElementById('legend').innerHTML = '';
  if (!spec) return;
  const rec = await decodeLayer(spec);
  map.addSource('data', { type: 'image', url: tint(rec),
                          coordinates: cornersOf(state.meta.bounds) });
  map.addLayer({ id: 'data', type: 'raster', source: 'data',
                 paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 0 } }, 'hs');
  drawLegend(spec);
}

function drawLegend(spec) {
  const el = document.getElementById('legend');
  if (spec.kind === 'class') {
    const t = state.meta.classes[spec.id] || {};
    el.innerHTML = Object.keys(t).map((k) => {
      const c = Number(k) === 0 ? [40, 50, 70] : CLASS_COLOURS[Number(k) % CLASS_COLOURS.length];
      return `<span class="sw"><i style="background:rgb(${c.join(',')})"></i>${t[k]}</span>`;
    }).join('');
    return;
  }
  const pal = PALETTES[spec.palette] || PALETTES.heat;
  const cells = [];
  for (let i = 0; i < 36; i++) {
    const c = pal(i / 35).map(Math.round);
    cells.push(`<i style="background:rgb(${c.join(',')})"></i>`);
  }
  const fmt = (v) => spec.kind === 'scalar_log'
    ? Math.pow(10, v).toPrecision(2) : v.toFixed(Math.abs(v) > 100 ? 0 : 1);
  el.innerHTML = `<span class="ramp">${cells.join('')}</span>
    <span class="lbl">${fmt(spec.min)}</span>
    <span class="lbl">${fmt(spec.max)} ${spec.unit}</span>`;
}

/* -------------------------------------------------------------- readout */
function readout(lngLat) {
  const box = document.getElementById('readout');
  const m = state.meta, b = m.bounds;
  const fx = (lngLat.lng - b[0]) / (b[2] - b[0]);
  const fy = (b[3] - lngLat.lat) / (b[3] - b[1]);
  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) { box.innerHTML = ''; return; }

  let elev = state.map.queryTerrainElevation(lngLat);
  let txt = elev == null ? '' : `<b>${elev.toFixed(0)} m</b>`;

  const spec = state.layer;
  if (spec && state.cache[spec.id]) {
    const r = state.cache[spec.id];
    const i = Math.min(r.h - 1, (fy * r.h) | 0) * r.w + Math.min(r.w - 1, (fx * r.w) | 0);
    if (spec.kind === 'class') {
      const t = m.classes[spec.id] || {};
      txt += ` · ${t[String(r.vals[i])] || 'class ' + r.vals[i]}`;
    } else {
      let v = r.vals[i];
      if (spec.kind === 'scalar_log') v = Math.pow(10, v);
      txt += ` · ${Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)} ${spec.unit}`;
    }
  }
  box.innerHTML = txt +
    `<span class="ll">${lngLat.lat.toFixed(2)}°N ${lngLat.lng.toFixed(2)}°E</span>`;
}

main().catch((e) => {
  const l = document.getElementById('loading');
  if (l) l.textContent = 'Failed to load: ' + e.message;
});
