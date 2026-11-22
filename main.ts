// entry.png — "The World in One Day": Saturday 21 November 2026.
// A procedural newspaper front page, drawn pixel by pixel with a tiny
// 5x7 bitmap font and a pure-stdlib PNG encoder. No network, no clock,
// no randomness: the same input always produces the same bytes.
//
// Stories (all happened, or were first reported, on 21 Nov 2026):
//  1. Iran says it struck two US bases in Bahrain (al-Riffa, Awali).
//  2. Russian ballistic missile hits Kryvyi Rih: 2 killed, 58 wounded.
//  3. Mexico seizes FBI most-wanted "Chapo Isidro" in Guasave, Sinaloa.
//  4. Drones hit Russian cargo ship Sparta II in the Gulf of Finland.
//  Also: COP31 overtime in Antalya; EU-Indonesia trade deal signed;
//  Saudi defences down three Houthi missiles aimed at Riyadh.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- font
// Classic 5x7 bitmap font: each glyph is 7 rows, each row 5 bits
// (bit 4 = leftmost pixel). All copy is rendered from this table.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  a: [0, 0, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  b: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x1e],
  c: [0, 0, 0x0e, 0x10, 0x10, 0x11, 0x0e],
  d: [0x01, 0x01, 0x0f, 0x11, 0x11, 0x11, 0x0f],
  e: [0, 0, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  f: [0x06, 0x08, 0x1e, 0x08, 0x08, 0x08, 0x08],
  g: [0, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  h: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x11],
  i: [0x04, 0, 0x0c, 0x04, 0x04, 0x04, 0x0e],
  j: [0x02, 0, 0x06, 0x02, 0x02, 0x12, 0x0c],
  k: [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12],
  l: [0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  m: [0, 0, 0x1a, 0x15, 0x15, 0x15, 0x15],
  n: [0, 0, 0x1e, 0x11, 0x11, 0x11, 0x11],
  o: [0, 0, 0x0e, 0x11, 0x11, 0x11, 0x0e],
  p: [0, 0, 0x1e, 0x11, 0x11, 0x1e, 0x10],
  q: [0, 0, 0x0f, 0x11, 0x11, 0x0f, 0x01],
  r: [0, 0, 0x16, 0x19, 0x10, 0x10, 0x10],
  s: [0, 0, 0x0f, 0x10, 0x0e, 0x01, 0x1e],
  t: [0x04, 0x04, 0x1f, 0x04, 0x04, 0x05, 0x06],
  u: [0, 0, 0x11, 0x11, 0x11, 0x13, 0x0d],
  v: [0, 0, 0x11, 0x11, 0x11, 0x0a, 0x04],
  w: [0, 0, 0x11, 0x15, 0x15, 0x15, 0x0a],
  x: [0, 0, 0x11, 0x0a, 0x04, 0x0a, 0x11],
  y: [0, 0, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  z: [0, 0, 0x1f, 0x02, 0x04, 0x08, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "’": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x1f, 0, 0, 0],
  "—": [0, 0, 0, 0x1f, 0, 0, 0],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  _: [0, 0, 0, 0, 0, 0, 0x1f],
  "[": [0x0e, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0e],
  "]": [0x0e, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0e],
  "*": [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  "•": [0, 0x04, 0x0e, 0x0e, 0x0e, 0x04, 0],
  "$": [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
};

// ---------------------------------------------------------------- raster
type RGB = [number, number, number];
const PAPER: RGB = [246, 241, 231];
const INK: RGB = [22, 19, 14];
const WHITE: RGB = [255, 255, 255];
const NAVY: RGB = [20, 33, 61];
const RED: RGB = [158, 27, 27];
const GREY: RGB = [90, 83, 72];

const fb = new Uint8Array(W * H * 3);

function setPix(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  fb[i] = c[0];
  fb[i + 1] = c[1];
  fb[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) setPix(i, j, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let j = cy - r; j <= cy + r; j++) {
    for (let i = cx - r; i <= cx + r; i++) {
      const dx = i - cx;
      const dy = j - cy;
      if (dx * dx + dy * dy <= r * r) setPix(i, j, c);
    }
  }
}

function fillTri(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: RGB): void {
  const minX = Math.max(0, Math.min(x1, x2, x3));
  const maxX = Math.min(W - 1, Math.max(x1, x2, x3));
  const minY = Math.max(0, Math.min(y1, y2, y3));
  const maxY = Math.min(H - 1, Math.max(y1, y2, y3));
  const d = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  if (d === 0) return;
  for (let j = minY; j <= maxY; j++) {
    for (let i = minX; i <= maxX; i++) {
      const a = ((x2 - i) * (y3 - j) - (y2 - j) * (x3 - i)) / d;
      const b = ((x3 - i) * (y1 - j) - (y3 - j) * (x1 - i)) / d;
      const cc = 1 - a - b;
      if (a >= 0 && b >= 0 && cc >= 0) setPix(i, j, c);
    }
  }
}

// Bresenham line, 1px wide.
function line(x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const dx = Math.abs(x2 - x1);
  const dy = -Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx + dy;
  let x = x1;
  let y = y1;
  for (;;) {
    setPix(x, y, c);
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

// Thick line: stamp small discs along the path.
function thickLine(x1: number, y1: number, x2: number, y2: number, r: number, c: RGB): void {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x1 + ((x2 - x1) * s) / steps);
    const y = Math.round(y1 + ((y2 - y1) * s) / steps);
    fillCircle(x, y, r, c);
  }
}

function star(cx: number, cy: number, outer: number, inner: number, c: RGB): void {
  const pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) {
    const ang = (Math.PI * k) / 5 - Math.PI / 2;
    const r = k % 2 === 0 ? outer : inner;
    pts.push([Math.round(cx + r * Math.cos(ang)), Math.round(cy + r * Math.sin(ang))]);
  }
  for (let k = 0; k < 10; k++) {
    const p1 = pts[k]!;
    const p2 = pts[(k + 1) % 10]!;
    fillTri(cx, cy, p1[0], p1[1], p2[0], p2[1], c);
  }
}

// ---------------------------------------------------------------- text
function charWidth(scale: number): number {
  return 6 * scale;
}

function textWidth(s: string, scale: number): number {
  return s.length * charWidth(scale);
}

function drawChar(ch: string, x: number, y: number, scale: number, c: RGB): void {
  const g = FONT[ch] ?? FONT[" "]!;
  for (let row = 0; row < 7; row++) {
    const bits = g[row]!;
    for (let col = 0; col < 5; col++) {
      if ((bits >> (4 - col)) & 1) {
        fillRect(x + col * scale, y + row * scale, scale, scale, c);
      }
    }
  }
}

function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  for (let k = 0; k < s.length; k++) {
    drawChar(s[k]!, x + k * charWidth(scale), y, scale, c);
  }
}

function drawTextCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

// Greedy word wrap to a pixel width; returns at most maxLines lines.
function wrap(s: string, maxPx: number, scale: number, maxLines: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textWidth(trial, scale) <= maxPx) {
      cur = trial;
    } else {
      if (cur !== "") lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    }
  }
  if (cur !== "" && lines.length < maxLines) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- PNG
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0; // filter: none
    Buffer.from(fb.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- scenes
// Each scene is a small flat pictogram strip at the foot of a story panel.
function sceneBahrain(x: number, y: number, w: number, h: number): void {
  const sky: RGB = [43, 58, 85];
  const sand: RGB = [201, 162, 110];
  const bld: RGB = [74, 85, 104];
  const win: RGB = [251, 191, 36];
  const flame: RGB = [249, 115, 22];
  const flame2: RGB = [239, 68, 68];
  fillRect(x, y, w, h, sky);
  fillRect(x, y + h - 22, w, 22, sand);
  fillRect(x + 18, y + 34, 52, h - 56, bld);
  fillRect(x + 84, y + 18, 44, h - 40, bld);
  fillRect(x + 142, y + 44, 60, h - 66, bld);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      fillRect(x + 24 + c * 14, y + 42 + r * 14, 6, 6, win);
      fillRect(x + 90 + c * 12, y + 26 + r * 14, 6, 6, win);
    }
  }
  // blast between the towers
  fillTri(x + 210, y + 78, x + 250, y + 10, x + 290, y + 78, flame2);
  fillTri(x + 222, y + 78, x + 250, y + 30, x + 278, y + 78, flame);
  fillCircle(x + 250, y + 26, 9, [253, 224, 71]);
  fillCircle(x + 300, y + 22, 7, [107, 114, 128]);
  fillCircle(x + 316, y + 14, 5, [107, 114, 128]);
  fillCircle(x + 210, y + 18, 6, [107, 114, 128]);
}

function sceneKryvyi(x: number, y: number, w: number, h: number): void {
  const sky: RGB = [58, 74, 107];
  const bld: RGB = [55, 65, 81];
  const bld2: RGB = [75, 85, 99];
  fillRect(x, y, w, h, sky);
  fillRect(x, y + h - 18, w, 18, [31, 41, 55]);
  fillRect(x + 16, y + 40, 58, h - 58, bld);
  fillRect(x + 88, y + 24, 48, h - 42, bld2);
  fillRect(x + 150, y + 48, 62, h - 66, bld);
  // blast
  fillCircle(x + 330, y + 52, 34, [239, 68, 68]);
  fillCircle(x + 330, y + 52, 23, [249, 115, 22]);
  fillCircle(x + 330, y + 52, 12, [253, 224, 71]);
  thickLine(x + 330, y + 52, x + 380, y + 12, 3, [253, 224, 71]);
  thickLine(x + 330, y + 52, x + 382, y + 52, 3, [249, 115, 22]);
  thickLine(x + 330, y + 52, x + 372, y + 92, 3, [239, 68, 68]);
  fillCircle(x + 292, y + 18, 8, [107, 114, 128]);
  fillCircle(x + 306, y + 10, 6, [107, 114, 128]);
}

function sceneMexico(x: number, y: number, w: number, h: number): void {
  const bg: RGB = [20, 83, 45];
  const gold: RGB = [251, 191, 36];
  const gold2: RGB = [217, 119, 6];
  const bar: RGB = [203, 213, 225];
  fillRect(x, y, w, h, bg);
  fillCircle(x + 96, y + 52, 44, gold2);
  fillCircle(x + 96, y + 52, 38, gold);
  star(x + 96, y + 52, 30, 12, NAVY);
  fillCircle(x + 96, y + 52, 7, gold);
  // jail bars on the right
  for (let k = 0; k < 5; k++) {
    fillRect(x + 250 + k * 30, y + 8, 10, h - 16, bar);
  }
  fillRect(x + 244, y + 8, 160, 8, bar);
  fillRect(x + 244, y + h - 16, 160, 8, bar);
  fillRect(x + 20, y + 88, 60, 6, gold);
}

function sceneSparta(x: number, y: number, w: number, h: number): void {
  const sky: RGB = [148, 163, 184];
  const sea: RGB = [29, 78, 107];
  const sea2: RGB = [46, 110, 142];
  const hull: RGB = [55, 65, 81];
  fillRect(x, y, w, h, sky);
  fillRect(x, y + 58, w, h - 58, sea);
  // waves
  for (let k = 0; k < 6; k++) {
    line(x + 8 + k * 70, y + 66, x + 48 + k * 70, y + 66, WHITE);
    line(x + 28 + k * 70, y + 88, x + 68 + k * 70, y + 88, sea2);
  }
  // ship
  fillRect(x + 120, y + 46, 220, 26, hull);
  fillTri(x + 340, y + 46, x + 372, y + 46, x + 340, y + 72, hull);
  fillRect(x + 140, y + 22, 44, 24, [220, 38, 38]);
  fillRect(x + 190, y + 22, 44, 24, [217, 119, 6]);
  fillRect(x + 240, y + 22, 44, 24, [20, 83, 45]);
  fillRect(x + 300, y + 30, 10, 16, [31, 41, 55]);
  // fire on deck
  fillTri(x + 150, y + 22, x + 162, y + 2, x + 174, y + 22, [249, 115, 22]);
  fillCircle(x + 162, y + 8, 5, [253, 224, 71]);
  // drones above
  line(x + 60, y + 14, x + 76, y + 26, INK);
  line(x + 76, y + 14, x + 60, y + 26, INK);
  line(x + 380, y + 10, x + 396, y + 22, INK);
  line(x + 396, y + 10, x + 380, y + 22, INK);
}

// ---------------------------------------------------------------- layout
function panel(
  x: number,
  y: number,
  w: number,
  h: number,
  kicker: string,
  kickerColor: RGB,
  headline: [string, string],
  body: string,
  fact: string,
  scene: (x: number, y: number, w: number, h: number) => void,
): void {
  fillRect(x, y, w, h, WHITE);
  // border
  fillRect(x, y, w, 2, INK);
  fillRect(x, y + h - 2, w, 2, INK);
  fillRect(x, y, 2, h, INK);
  fillRect(x + w - 2, y, 2, h, INK);
  // kicker bar
  fillRect(x + 2, y + 2, w - 4, 34, kickerColor);
  drawText(kicker, x + 14, y + 12, 2, WHITE);
  // headline, scale 4
  let hy = y + 48;
  for (const hl of headline) {
    drawText(hl, x + 14, hy, 4, INK);
    hy += 34;
  }
  // body, scale 2, wrapped to 4 lines
  const lines = wrap(body, w - 28, 2, 4);
  let by = hy + 12;
  for (const ln of lines) {
    drawText(ln, x + 14, by, 2, INK);
    by += 18;
  }
  // fact line, red bullet
  fillCircle(x + 18, by + 10, 4, RED);
  drawText(fact, x + 30, by + 3, 2, RED);
  // scene strip at the foot
  const sy = y + h - 104 - 12;
  fillRect(x + 14, sy - 2, w - 28, 2, INK);
  scene(x + 14, sy, w - 28, 104);
}

function main(): void {
  fillRect(0, 0, W, H, PAPER);

  // ---- masthead
  fillRect(0, 0, W, 118, NAVY);
  drawTextCentered("THE WORLD IN ONE DAY", W / 2, 22, 2, WHITE);
  drawTextCentered("SATURDAY 21 NOVEMBER 2026", W / 2, 52, 4, WHITE);
  fillRect(0, 102, W, 6, RED);
  // small globe pictograms flanking the masthead date
  const globe = (cx: number): void => {
    fillCircle(cx, 59, 30, [147, 197, 253]);
    line(cx, 29, cx, 89, NAVY);
    line(cx - 30, 59, cx + 30, 59, NAVY);
    line(cx - 14, 33, cx - 14, 85, NAVY);
    line(cx + 14, 33, cx + 14, 85, NAVY);
    line(cx - 30, 45, cx + 30, 45, NAVY);
    line(cx - 30, 73, cx + 30, 73, NAVY);
  };
  globe(84);
  globe(940);

  // ---- deck: the day in two lines
  drawTextCentered("Iran hits US bases in Bahrain — Russia strikes Zelensky's home city", W / 2, 128, 2, INK);
  drawTextCentered("Mexico seizes its most-wanted cartel boss — climate talks stall in Antalya", W / 2, 148, 2, INK);

  // ---- four lead stories, 2 x 2
  panel(
    16, 172, 496, 352,
    "GULF — CONFLICT", RED,
    ["IRAN STRIKES US", "BASES IN BAHRAIN"],
    "Iran's Revolutionary Guards said they hit two US bases in Bahrain, at al-Riffa and Awali. Bahrain reported a fire, no injuries.",
    "US denies Iran's claim it hit an F-16",
    sceneBahrain,
  );
  panel(
    512, 172, 496, 352,
    "UKRAINE — WAR", NAVY,
    ["RUSSIAN MISSILE", "HITS KRYVYI RIH"],
    "A Russian ballistic missile hit the centre of Kryvyi Rih on Saturday, killing two — a paramedic and a 7-year-old boy — and wounding 58.",
    "58 wounded, among them six children",
    sceneKryvyi,
  );
  panel(
    16, 532, 496, 352,
    "MEXICO — JUSTICE", [20, 83, 45],
    ["FBI MOST-WANTED", "CARTEL BOSS HELD"],
    "Mexican special forces seized Fausto Isidro Meza Flores, 'Chapo Isidro', in Guasave, Sinaloa. Gunfights and roadblocks followed; 11 killed.",
    "US had put a $5m reward on his head",
    sceneMexico,
  );
  panel(
    512, 532, 496, 352,
    "BALTIC — WAR", [14, 74, 90],
    ["DRONE STRIKE", "SETS SHIP ABLAZE"],
    "Two drones hit the Russian cargo ship Sparta II in the Gulf of Finland. It caught fire and drifted into Finnish waters; the crew was evacuated.",
    "Ship under US and Ukraine sanctions",
    sceneSparta,
  );

  // ---- also on 21 November
  fillRect(16, 890, 992, 84, [239, 231, 214]);
  fillRect(16, 890, 992, 2, INK);
  fillRect(16, 972, 992, 2, INK);
  fillRect(16, 890, 2, 84, INK);
  fillRect(1006, 890, 2, 84, INK);
  drawText("ALSO ON 21 NOVEMBER", 30, 898, 2, RED);
  drawText("• COP31 climate talks run past their deadline in Antalya — still no deal", 30, 920, 2, INK);
  drawText("• EU and Indonesia sign a trade deal cutting 98.5% of tariffs on EU goods", 30, 938, 2, INK);
  drawText("• Saudi defences shoot down three Houthi missiles aimed at Riyadh", 30, 956, 2, INK);

  // ---- footer: date promise + sources
  drawTextCentered("Every event above happened, or was first reported, on 21 November 2026.", W / 2, 984, 2, GREY);
  drawTextCentered("Sources: Al Jazeera, BBC, Reuters, AP, ISW, DW, Euronews.", W / 2, 1002, 2, GREY);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/entry.png`, encodePNG());
}

main();
