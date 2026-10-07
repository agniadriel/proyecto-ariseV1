

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

/* ---------- Tabla CRC32 (zlib) ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* ---------- Codificador PNG básico (RGBA, 8 bits) ---------- */
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(canvas) {
  const { width: w, height: h, data } = canvas;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // profundidad de bits
  ihdr[9] = 6; // color RGBA
  // 10..12: compresión, filtro, entrelazado = 0

  // Scanlines: cada fila precedida por el byte de filtro (0 = None)
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const rowStart = y * (1 + w * 4);
    raw[rowStart] = 0;
    data.copy(raw, rowStart + 1, y * w * 4, (y + 1) * w * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // firma
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- Lienzo RGBA con utilidades de dibujo ---------- */
function createCanvas(size) {
  return { width: size, height: size, data: Buffer.alloc(size * size * 4) };
}

function fillCircle(cv, cx, cy, r, color) {
  const { width: w, height: h, data } = cv;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(w - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(h - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        const i = (y * w + x) * 4;
        data[i] = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
        data[i + 3] = 255;
      }
    }
  }
}

/** Distancia de un punto a un segmento AB (para trazar el "check"). */
function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 === 0 ? 0 : ((px - ax) * abx + (py - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const dx = px - (ax + t * abx);
  const dy = py - (ay + t * aby);
  return Math.hypot(dx, dy);
}

function strokePolyline(cv, points, width, color) {
  const { width: w, height: h, data } = cv;
  const half = width / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let d = Infinity;
      for (let s = 0; s < points.length - 1; s++) {
        const [ax, ay] = points[s];
        const [bx, by] = points[s + 1];
        d = Math.min(d, distToSegment(x, y, ax, ay, bx, by));
      }
      if (d <= half) {
        const i = (y * w + x) * 4;
        data[i] = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
        data[i + 3] = 255;
      }
    }
  }
}

/* ---------- Colores del tema (global.css) ---------- */
const BG = [14, 20, 32]; // #0e1420 (--bg-soft)
const ACCENT = [34, 211, 238]; // #22d3ee (--accent, cian)
const SUCCESS = [52, 211, 153]; // #34d399 (--success, verde)

/**
 * Dibuja la marca: fondo, aro y check. Si radius>0, el fondo es un cuadrado
 * redondeado (transparencia en las esquinas); si radius=0, fondo completo.
 */
function drawIcon(size, { ringRadius, ringWidth, checkWidth, checkPoints, bgRadius, scale = 1 }) {
  const cv = createCanvas(size);
  const c = size / 2;
  const rr = bgRadius * scale;

  // Fondo: cuadrado redondeado con test de esquinas (o completo si rr=0)
  if (rr <= 0) {
    fillCircle(cv, c, c, size * 2, BG); // llena todo
  } else {
    const { width: w, height: h, data } = cv;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const qx = Math.max(c - x, x - (c - 1)) - (c - rr); // distancia a la esquina
        const qy = Math.max(c - y, y - (c - 1)) - (c - rr);
        if (qx <= 0 || qy <= 0 || qx * qx + qy * qy <= rr * rr) {
          const i = (y * w + x) * 4;
          data[i] = BG[0];
          data[i + 1] = BG[1];
          data[i + 2] = BG[2];
          data[i + 3] = 255;
        }
      }
    }
  }

  // Aro (dona): círculo exterior menos interior (recupera el fondo)
  const outer = ringRadius * scale + (ringWidth * scale) / 2;
  const inner = ringRadius * scale - (ringWidth * scale) / 2;
  fillCircle(cv, c, c, outer, ACCENT);
  if (inner > 0) {
    const { width: w, height: h, data } = cv;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - c;
        const dy = y - c;
        if (dx * dx + dy * dy < inner * inner) {
          const i = (y * w + x) * 4;
          data[i] = BG[0];
          data[i + 1] = BG[1];
          data[i + 2] = BG[2];
          data[i + 3] = 255;
        }
      }
    }
  }

  // Check verde
  strokePolyline(
    cv,
    checkPoints.map(([x, y]) => [c + (x - c) * scale, c + (y - c) * scale]),
    checkWidth * scale,
    SUCCESS
  );

  return cv;
}

/* ---------- Generación de los 4 archivos ---------- */
mkdirSync(outDir, { recursive: true });

// Ícono normal 192 (marca centrada)
writeFileSync(
  join(outDir, 'pwa-192.png'),
  encodePng(
    drawIcon(192, {
      ringRadius: 52,
      ringWidth: 18,
      checkWidth: 16,
      checkPoints: [
        [58, 102],
        [88, 130],
        [138, 76],
      ],
      bgRadius: 42,
    })
  )
);

// Ícono normal 512 (misma composición, escalada ×2.667)
writeFileSync(
  join(outDir, 'pwa-512.png'),
  encodePng(
    drawIcon(512, {
      ringRadius: 138,
      ringWidth: 48,
      checkWidth: 42,
      checkPoints: [
        [154, 272],
        [234, 346],
        [368, 202],
      ],
      bgRadius: 112,
    })
  )
);

// Maskable 512: marca al 82% con fondo completo (zona segura de Android)
writeFileSync(
  join(outDir, 'pwa-maskable-512.png'),
  encodePng(
    drawIcon(512, {
      ringRadius: 138,
      ringWidth: 48,
      checkWidth: 42,
      checkPoints: [
        [154, 272],
        [234, 346],
        [368, 202],
      ],
      bgRadius: 0,
      scale: 0.82,
    })
  )
);

// Apple touch 180: fondo completo (iOS aplica su propia máscara)
writeFileSync(
  join(outDir, 'apple-touch-icon.png'),
  encodePng(
    drawIcon(180, {
      ringRadius: 52,
      ringWidth: 20,
      checkWidth: 18,
      checkPoints: [
        [52, 96],
        [86, 128],
        [134, 70],
      ],
      bgRadius: 0,
    })
  )
);

console.log('✅ Íconos PWA generados en frontend/public/:');
console.log('   pwa-192.png · pwa-512.png · pwa-maskable-512.png · apple-touch-icon.png');
