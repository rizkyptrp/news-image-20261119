// The World Today — Thursday 19 November 2026.
// A make.fun news-image entry: a Node program (stdlib only) that draws a
// 1024x1024 newspaper front page summing up the day's world news and writes
// it to /output/entry.png. It ships its own PNG encoder and its own 5x7
// bitmap font. No network, no randomness, no assets: two runs produce
// byte-identical output.
//
// The six stories (all verified against reputable reporting on 19 Nov 2026):
//   1. Grand Theft Auto VI launches worldwide (AP) — first players in
//      New Zealand at midnight local time, back to Vice City after 13 years.
//   2. The ICJ delivers its ruling today in The Gambia v. Myanmar, on
//      whether Myanmar committed genocide against the Rohingya.
//   3. House Democrats nominate Hakeem Jeffries for Speaker, 251-11 —
//      in line to be the first Black Speaker (full House vote 3 January).
//   4. Trump, Xi and Putin meet in Shenzhen today on the APEC sidelines,
//      the first three-way talks, with nuclear arms on the agenda.
//   5. Cyclone Akvan, a severe cyclonic storm, bears down on India's east
//      coast; landfall forecast for Friday between Narsapur and Puri.
//   6. NASA marks Voyager 1 reaching one light-day from Earth today —
//      a radio signal now takes a full day to reach the probe.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// Colour palette: warm newsprint paper, dark ink, a restrained red accent.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];
const PAPER: RGB = [246, 241, 231];
const CARD: RGB = [255, 253, 246];
const INK: RGB = [25, 25, 25];
const GREY: RGB = [92, 88, 80];
const RED: RGB = [166, 25, 46];
const BLUE: RGB = [29, 78, 137];
const TEAL: RGB = [15, 118, 110];
const GOLD: RGB = [199, 149, 44];
const NAVY: RGB = [16, 32, 64];
const RULE: RGB = [25, 25, 25];

// ---------------------------------------------------------------------------
// CRC32 (IEEE) and a minimal PNG encoder: signature, IHDR, one IDAT, IEND.
// Scanlines use filter 0. Output is fully deterministic.
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(pixels: Uint8Array, width: number, height: number): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter: none
    raw.set(pixels.subarray(y * width * 3, (y + 1) * width * 3), rowStart + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 bits ("1" = ink). Uppercase,
// digits and the punctuation the page needs. Written by hand for this entry.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "·": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
};

// ---------------------------------------------------------------------------
// Pixel canvas and drawing primitives.
// ---------------------------------------------------------------------------
const pxbuf = new Uint8Array(W * H * 3);

function fillAll(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    pxbuf[i * 3] = c[0];
    pxbuf[i * 3 + 1] = c[1];
    pxbuf[i * 3 + 2] = c[2];
  }
}

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  pxbuf[i] = c[0];
  pxbuf[i + 1] = c[1];
  pxbuf[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c);
  }
}

function hline(x0: number, x1: number, y: number, c: RGB): void {
  if (x1 < x0) [x0, x1] = [x1, x0];
  fillRect(x0, y, x1 - x0 + 1, 1, c);
}

function vline(x: number, y0: number, y1: number, c: RGB): void {
  if (y1 < y0) [y0, y1] = [y1, y0];
  fillRect(x, y0, 1, y1 - y0 + 1, c);
}

// Bresenham line.
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
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

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = -half; x <= half; x++) setPx(cx + x, cy + y, c);
  }
}

// Small deterministic pseudo-random helper (fixed seed per call site) so
// star fields and lit windows are stable across runs.
function detRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Text. The font is uppercase-only; input is uppercased and a few
// characters are normalised to glyphs that exist.
// ---------------------------------------------------------------------------
function normalise(s: string): string {
  return s
    .toUpperCase()
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"');
}

function textWidth(s: string, scale: number): number {
  const t = normalise(s);
  if (t.length === 0) return 0;
  return t.length * 6 * scale - scale;
}

function drawText(
  s: string,
  x: number,
  y: number,
  scale: number,
  c: RGB,
  align: "l" | "c" | "r" = "l",
): void {
  const t = normalise(s);
  let startX = x;
  if (align === "c") startX = x - Math.floor(textWidth(t, scale) / 2);
  if (align === "r") startX = x - textWidth(t, scale);
  let cx = startX;
  for (const ch of t) {
    const glyph = FONT[ch] ?? FONT[" "];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === "1") {
          fillRect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

// Greedy word wrap. Returns the lines that fit inside maxWidth pixels.
function wrapText(s: string, maxWidth: number, scale: number): string[] {
  const words = normalise(s).split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (textWidth(trial, scale) <= maxWidth || cur === "") {
      cur = trial;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function drawPara(
  s: string,
  x: number,
  y: number,
  maxWidth: number,
  scale: number,
  c: RGB,
  linePitch: number,
): number {
  const lines = wrapText(s, maxWidth, scale);
  lines.forEach((ln, i) => drawText(ln, x, y + i * linePitch, scale, c));
  return y + lines.length * linePitch;
}

// ---------------------------------------------------------------------------
// Story illustrations. Each draws inside a box (x, y, w, h) on its own
// tinted panel. Simple flat shapes: skyline, scales, capitol dome, flags,
// cyclone spiral, spacecraft.
// ---------------------------------------------------------------------------
const SUNSET: RGB[] = [
  [43, 27, 77],
  [92, 48, 110],
  [168, 62, 110],
  [226, 96, 127],
  [242, 166, 90],
  [255, 210, 122],
];

function drawSkyline(x: number, y: number, w: number, h: number): void {
  // Sunset bands.
  const bandH = Math.ceil(h / SUNSET.length);
  SUNSET.forEach((c, i) => fillRect(x, y + i * bandH, w, bandH + 1, c));
  // Low sun.
  fillCircle(x + Math.floor(w * 0.72), y + Math.floor(h * 0.52), 16, [255, 243, 196]);
  // Building silhouettes.
  const dark: RGB = [36, 21, 54];
  const heights = [0.62, 0.45, 0.78, 0.52, 0.9, 0.58, 0.4, 0.72, 0.5, 0.66];
  const bw = Math.floor(w / heights.length);
  const rnd = detRand(20261119);
  heights.forEach((f, i) => {
    const bx = x + i * bw + 2;
    const bh = Math.floor(h * f);
    fillRect(bx, y + h - bh, bw - 4, bh, dark);
    // A few lit windows, deterministic.
    for (let wy = y + h - bh + 8; wy < y + h - 6; wy += 12) {
      for (let wx = bx + 5; wx < bx + bw - 8; wx += 10) {
        if (rnd() < 0.3) fillRect(wx, wy, 4, 5, [255, 210, 122]);
      }
    }
  });
  // Palm silhouettes at the left and right edges.
  const palm = (px: number) => {
    line(px, y + h, px + 2, y + h - 34, dark);
    line(px + 2, y + h - 34, px - 12, y + h - 42, dark);
    line(px + 2, y + h - 34, px + 16, y + h - 42, dark);
    line(px + 2, y + h - 34, px - 6, y + h - 48, dark);
    line(px + 2, y + h - 34, px + 10, y + h - 48, dark);
  };
  palm(x + 14);
  palm(x + w - 20);
}

function drawScales(x: number, y: number, w: number, h: number): void {
  const cx = x + Math.floor(w / 2);
  const top = y + 8;
  const bottom = y + h - 10;
  vline(cx, top, bottom, INK); // pole
  hline(cx - 34, cx + 34, top + 10, INK); // beam
  fillRect(cx - 3, top + 6, 7, 7, INK); // finial
  // Two pans, hung from the beam ends.
  for (const side of [-1, 1]) {
    const px = cx + side * 34;
    line(px, top + 10, px - 12, top + 34, INK);
    line(px, top + 10, px + 12, top + 34, INK);
    line(px - 12, top + 34, px + 12, top + 34, INK);
    fillRect(px - 13, top + 34, 27, 3, INK);
  }
  fillRect(cx - 22, bottom, 44, 5, INK); // base
  hline(x + 6, x + w - 6, bottom + 8, GREY);
}

function drawCapitol(x: number, y: number, w: number, h: number): void {
  const cx = x + Math.floor(w / 2);
  const base = y + h - 12;
  // Steps.
  fillRect(cx - 42, base, 84, 4, INK);
  fillRect(cx - 36, base - 5, 72, 5, INK);
  // Columns.
  for (const off of [-30, -18, -6, 6, 18, 30]) {
    fillRect(cx + off - 3, base - 34, 6, 29, INK);
  }
  fillRect(cx - 38, base - 38, 76, 4, INK);
  // Dome: stacked shrinking bars make a smooth-ish dome, with a drum
  // under it so it reads as a capitol dome rather than a bowl.
  const domeTop = y + 6;
  for (let i = 0; i < 13; i++) {
    const half = Math.floor(20 * Math.sqrt(1 - (i / 13) * (i / 13)));
    fillRect(cx - half, domeTop + i * 2, half * 2, 2, INK);
  }
  fillRect(cx - 16, domeTop + 26, 32, 6, INK); // drum
  fillRect(cx - 2, domeTop - 4, 4, 6, INK); // lantern
  // Flag on top.
  line(cx + 1, domeTop - 12, cx + 1, domeTop - 4, INK);
  fillRect(cx + 1, domeTop - 12, 12, 6, RED);
}

function drawFlags(x: number, y: number, w: number, h: number): void {
  const flagW = 52;
  const flagH = 34;
  const fy = y + Math.floor((h - flagH) / 2) + 4;
  const starts = [x + 8, x + Math.floor(w / 2) - Math.floor(flagW / 2), x + w - 8 - flagW];
  // Poles.
  starts.forEach((fx) => vline(fx - 2, fy - 10, fy + flagH + 4, INK));
  // United States: stripes and blue canton.
  const us = starts[0];
  for (let i = 0; i < 7; i++) {
    fillRect(us, fy + i * 5, flagW, 5, i % 2 === 0 ? RED : CARD);
  }
  fillRect(us, fy, 22, 18, BLUE);
  // China: red field, one large and four small gold stars (dots).
  const cn = starts[1];
  fillRect(cn, fy, flagW, flagH, RED);
  fillCircle(cn + 12, fy + 11, 4, GOLD);
  for (const [sx, sy] of [
    [26, 6],
    [32, 10],
    [32, 17],
    [26, 21],
  ]) {
    fillRect(cn + sx, fy + sy, 3, 3, GOLD);
  }
  // Russia: white, blue, red horizontal bands.
  const ru = starts[2];
  fillRect(ru, fy, flagW, 12, CARD);
  fillRect(ru, fy + 12, flagW, 11, BLUE);
  fillRect(ru, fy + 23, flagW, 11, RED);
  // Thin outlines so the white band reads on the light panel.
  [us, cn, ru].forEach((fx) => {
    hline(fx, fx + flagW - 1, fy, INK);
    hline(fx, fx + flagW - 1, fy + flagH - 1, INK);
    vline(fx, fy, fy + flagH - 1, INK);
    vline(fx + flagW - 1, fy, fy + flagH - 1, INK);
  });
}

function drawCyclone(x: number, y: number, w: number, h: number): void {
  const cx = x + Math.floor(w * 0.42);
  const cy = y + Math.floor(h * 0.46);
  // Spiral arms: points on an Archimedean spiral, thickening outward.
  for (let a = 0; a < Math.PI * 5; a += 0.12) {
    const r = 3 + a * 3.4;
    const px = Math.floor(cx + r * Math.cos(a));
    const py = Math.floor(cy + r * Math.sin(a) * 0.8);
    fillRect(px - 1, py - 1, 3, 3, TEAL);
  }
  fillCircle(cx, cy, 5, CARD);
  // Coastline and sea at the bottom.
  fillRect(x, y + h - 16, w, 16, [216, 201, 163]);
  hline(x, x + w - 1, y + h - 16, INK);
  // Rain slashes on the right.
  for (let i = 0; i < 6; i++) {
    const rx = x + w - 34 + i * 6;
    line(rx, y + 14 + (i % 3) * 8, rx - 4, y + 26 + (i % 3) * 8, BLUE);
  }
}

function drawVoyager(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, NAVY);
  const rnd = detRand(19770905);
  for (let i = 0; i < 26; i++) {
    const sx = x + Math.floor(rnd() * w);
    const sy = y + Math.floor(rnd() * h);
    fillRect(sx, sy, 2, 2, [255, 255, 255]);
  }
  // Dashed trajectory from Earth (bottom left) to the probe (top right).
  const ex = x + 16;
  const ey = y + h - 14;
  const tx = x + w - 30;
  const ty = y + 16;
  for (let t = 0; t <= 20; t++) {
    if (t % 2 === 0) {
      const px = Math.floor(ex + ((tx - ex) * t) / 20);
      const py = Math.floor(ey + ((ty - ey) * t) / 20);
      fillRect(px, py, 3, 3, GOLD);
    }
  }
  fillCircle(ex, ey, 7, [90, 160, 220]); // Earth
  // The probe: gold record disc and dish.
  fillCircle(tx, ty, 12, GOLD);
  fillCircle(tx, ty, 5, [120, 80, 10]);
  line(tx - 10, ty + 10, tx - 22, ty + 20, [255, 255, 255]);
  line(tx - 22, ty + 20, tx - 14, ty + 22, [255, 255, 255]);
}

// ---------------------------------------------------------------------------
// Page layout: masthead, lead story, five story cards, footer.
// ---------------------------------------------------------------------------
const MARGIN = 28;
const PAGE_W = W - MARGIN * 2;

function rule(x0: number, x1: number, y: number, thickness: number): void {
  fillRect(x0, y, x1 - x0 + 1, thickness, RULE);
}

interface Story {
  kicker: string;
  headline: string;
  caption: string;
  tint: RGB;
  icon: (x: number, y: number, w: number, h: number) => void;
}

function drawCard(
  s: Story,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  fillRect(x, y, w, h, CARD);
  // Thin border.
  hline(x, x + w - 1, y, INK);
  hline(x, x + w - 1, y + h - 1, INK);
  vline(x, y, y + h - 1, INK);
  vline(x + w - 1, y, y + h - 1, INK);
  const pad = 14;
  const innerW = w - pad * 2;
  // Icon panel.
  const iconH = 92;
  fillRect(x + 1, y + 1, w - 2, iconH, s.tint);
  s.icon(x + 1, y + 1, w - 2, iconH);
  hline(x + 1, x + w - 2, y + iconH + 1, INK);
  // Kicker, headline, caption.
  let cy = y + iconH + 14;
  drawText(s.kicker, x + pad, cy, 2, RED);
  cy += 20;
  const headScale = w > 400 ? 3 : 2;
  const headPitch = headScale === 3 ? 24 : 18;
  cy = drawPara(s.headline, x + pad, cy, innerW, headScale, INK, headPitch);
  cy += 6;
  drawPara(s.caption, x + pad, cy, innerW, 2, GREY, 17);
}

function drawPage(): void {
  fillAll(PAPER);

  // ---- Masthead -----------------------------------------------------------
  drawText("THE WORLD TODAY", Math.floor(W / 2), 26, 6, INK, "c");
  fillRect(MARGIN, 96, PAGE_W, 4, RED);
  drawText("THURSDAY 19 NOVEMBER 2026", Math.floor(W / 2), 112, 3, INK, "c");
  rule(MARGIN, MARGIN + PAGE_W - 1, 146, 2);

  // ---- Lead story: GTA VI launches ---------------------------------------
  let ly = 162;
  drawText("VICE CITY · AFTER 13 YEARS", MARGIN, ly, 2, RED);
  ly += 24;
  drawText("GRAND THEFT AUTO VI", MARGIN, ly, 4, INK);
  ly += 34;
  drawText("LAUNCHES WORLDWIDE", MARGIN, ly, 4, INK);
  ly += 36;
  drawSkyline(MARGIN, ly, PAGE_W, 168);
  ly += 176;
  drawText(
    "ROCKSTAR RETURNS TO VICE CITY — FIRST PLAYERS IN NEW ZEALAND AT MIDNIGHT.",
    MARGIN,
    ly,
    2,
    GREY,
  );
  ly += 22;
  rule(MARGIN, MARGIN + PAGE_W - 1, ly, 2);

  // ---- Five story cards ----------------------------------------------------
  const stories: Story[] = [
    {
      kicker: "THE HAGUE",
      headline: "WORLD COURT RULES ON MYANMAR",
      caption:
        "Judges decide today if Myanmar committed genocide against the Rohingya.",
      tint: [232, 226, 210],
      icon: drawScales,
    },
    {
      kicker: "WASHINGTON",
      headline: "JEFFRIES IN LINE TO BE FIRST BLACK SPEAKER",
      caption:
        "House Democrats pick him 251-11. The full House votes on 3 January.",
      tint: [214, 226, 238],
      icon: drawCapitol,
    },
    {
      kicker: "SHENZHEN",
      headline: "TRUMP, XI AND PUTIN MEET TODAY",
      caption:
        "First three-way talks at APEC, with nuclear arms on the agenda. No deal expected.",
      tint: [232, 222, 214],
      icon: drawFlags,
    },
    {
      kicker: "BAY OF BENGAL",
      headline: "CYCLONE AKVAN BEARS DOWN ON INDIA",
      caption:
        "Severe storm, winds to 110 km/h. Landfall due Friday between Narsapur and Puri. Red alert on the coast.",
      tint: [206, 228, 228],
      icon: drawCyclone,
    },
    {
      kicker: "DEEP SPACE",
      headline: "VOYAGER 1, ONE LIGHT-DAY FROM EARTH",
      caption:
        "NASA marks the milestone today. A radio signal now takes a full day to reach the probe, 16 billion miles away.",
      tint: [16, 32, 64],
      icon: drawVoyager,
    },
  ];

  const cardTop = ly + 14;
  const cardH = 248;
  const gap = 16;
  const narrowW = Math.floor((PAGE_W - gap * 2) / 3);
  const wideW = Math.floor((PAGE_W - gap) / 2);
  stories.slice(0, 3).forEach((s, i) => {
    drawCard(s, MARGIN + i * (narrowW + gap), cardTop, narrowW, cardH);
  });
  const row2 = cardTop + cardH + gap;
  stories.slice(3).forEach((s, i) => {
    drawCard(s, MARGIN + i * (wideW + gap), row2, wideW, cardH);
  });

  // ---- Footer ---------------------------------------------------------------
  const footY = row2 + cardH + 12;
  drawText(
    "SOURCES: AP, REUTERS, NASA, IMD, ICJ",
    Math.floor(W / 2),
    footY,
    2,
    GREY,
    "c",
  );
}

// ---------------------------------------------------------------------------
// Entry point: draw the page and write entry.png to the output directory.
// ---------------------------------------------------------------------------
function main(): void {
  drawPage();
  const png = encodePng(pxbuf, W, H);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.png"), png);
}

main();
