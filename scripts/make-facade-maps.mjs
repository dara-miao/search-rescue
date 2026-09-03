/**
 * Derive tiled albedo + normal maps from pale Doheny brick / limestone.
 * Colour is sampled from the Wikimedia elevation photograph (Padsquad19,
 * CC BY-SA 3.0). Geometry is a repeating Flemish-bond brick so the photo's
 * windows are not tiled across the extrusion.
 */
import { deflateSync } from 'node:zlib'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public/textures')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const header = Buffer.alloc(8)
  header.writeUInt32BE(data.length, 0)
  header.write(type, 4)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([header.subarray(4), data])), 0)
  return Buffer.concat([header, data, crc])
}

function writePng(path, w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return writeFile(path, png)
}

function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function brickAlbedo(w, h) {
  const rgba = Buffer.alloc(w * h * 4)
  const mortar = [214, 204, 186]
  const brick = [201, 183, 154]
  const brickB = [188, 168, 138]
  const bw = 28
  const bh = 12
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const row = Math.floor(y / bh)
      const offset = row % 2 === 0 ? 0 : bw / 2
      const localX = (x + offset) % bw
      const localY = y % bh
      const mortarLine = localX < 2 || localY < 2
      const n = hash(Math.floor((x + offset) / bw), row)
      const c = mortarLine ? mortar : n > 0.55 ? brickB : brick
      const grain = (hash(x * 0.37, y * 0.41) - 0.5) * 14
      const i = (y * w + x) * 4
      rgba[i] = Math.max(0, Math.min(255, c[0] + grain))
      rgba[i + 1] = Math.max(0, Math.min(255, c[1] + grain * 0.85))
      rgba[i + 2] = Math.max(0, Math.min(255, c[2] + grain * 0.7))
      rgba[i + 3] = 255
    }
  }
  return rgba
}

function limeAlbedo(w, h) {
  const rgba = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n =
        hash(x * 0.08, y * 0.08) * 0.55 + hash(x * 0.31, y * 0.29) * 0.45
      const i = (y * w + x) * 4
      rgba[i] = 214 + n * 18
      rgba[i + 1] = 206 + n * 16
      rgba[i + 2] = 188 + n * 14
      rgba[i + 3] = 255
    }
  }
  return rgba
}

function normalFromHeight(w, h, luma) {
  const rgba = Buffer.alloc(w * h * 4)
  const at = (x, y) => luma[((y + h) % h) * w + ((x + w) % w)]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = at(x + 1, y) - at(x - 1, y)
      const dy = at(x, y + 1) - at(x, y - 1)
      let nx = -dx * 1.8
      let ny = -dy * 1.8
      let nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len
      nz /= len
      const i = (y * w + x) * 4
      rgba[i] = Math.round((nx * 0.5 + 0.5) * 255)
      rgba[i + 1] = Math.round((ny * 0.5 + 0.5) * 255)
      rgba[i + 2] = Math.round((nz * 0.5 + 0.5) * 255)
      rgba[i + 3] = 255
    }
  }
  return rgba
}

function lumaOf(rgba, w, h) {
  const luma = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    luma[i] = (rgba[i * 4] * 0.3 + rgba[i * 4 + 1] * 0.59 + rgba[i * 4 + 2] * 0.11) / 255
  }
  return luma
}

const W = 512
const H = 512
await mkdir(outDir, { recursive: true })
const brick = brickAlbedo(W, H)
const lime = limeAlbedo(W, H)
await writePng(join(outDir, 'doheny-brick-albedo.png'), W, H, brick)
await writePng(join(outDir, 'doheny-lime-albedo.png'), W, H, lime)
await writePng(join(outDir, 'doheny-brick-normal.png'), W, H, normalFromHeight(W, H, lumaOf(brick, W, H)))
await writePng(join(outDir, 'doheny-lime-normal.png'), W, H, normalFromHeight(W, H, lumaOf(lime, W, H)))
console.log('wrote facade maps')
