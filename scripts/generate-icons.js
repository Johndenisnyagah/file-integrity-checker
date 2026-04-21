/**
 * Generates assets/icon.png and assets/icon.ico from scratch
 * using only Node.js built-ins (zlib + fs).
 * Run once: node scripts/generate-icons.js
 */
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(__dirname, '../assets')
mkdirSync(assetsDir, { recursive: true })

// ── CRC32 (needed for PNG chunks) ─────────────────────────────────────────────
const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[i] = c
}
function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([t, data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// ── Draw a simple shield icon ─────────────────────────────────────────────────
// Colours: bg #0d0d0d, shield fill #3ecf8e, shield stroke #2a9e68
const BG  = [0x0d, 0x0d, 0x0d]
const SHD = [0x3e, 0xcf, 0x8e]
const STR = [0x2a, 0x9e, 0x68]

function inShield(x, y, size) {
  const cx = size / 2, cy = size / 2
  const w = size * 0.58, h = size * 0.70
  const left = cx - w / 2, right = cx + w / 2
  const top = cy - h / 2

  // Top rectangle portion
  const midY = top + h * 0.55
  if (y < top || x < left || x > right) return false
  if (y < midY) return true
  // Bottom triangular taper
  const t = (y - midY) / (h * 0.45)
  const halfW = (w / 2) * (1 - t)
  return x >= cx - halfW && x <= cx + halfW
}

function inShieldStroke(x, y, size, thick) {
  return inShield(x, y, size) && !inShield(x - thick, y - thick, size)
    // rough stroke: near border
}

function createPNG(size) {
  const pixels = Buffer.alloc(size * size * 3)
  const thick = Math.max(1, Math.round(size * 0.04))

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inside = inShield(x, y, size)
      // stroke = inside but near edge
      let stroke = false
      if (inside) {
        for (let dy = -thick; dy <= thick; dy++) {
          for (let dx = -thick; dx <= thick; dx++) {
            if (!inShield(x + dx, y + dy, size)) { stroke = true; break }
          }
          if (stroke) break
        }
      }
      const col = inside ? (stroke ? STR : SHD) : BG
      const i = (y * size + x) * 3
      pixels[i] = col[0]; pixels[i+1] = col[1]; pixels[i+2] = col[2]
    }
  }

  // Build PNG raw data: filter(0) + RGB row per scanline
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0
    pixels.copy(raw, y * (1 + size * 3) + 1, y * size * 3, (y + 1) * size * 3)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Write PNG ─────────────────────────────────────────────────────────────────
const png256 = createPNG(256)
const png32  = createPNG(32)
writeFileSync(join(assetsDir, 'icon.png'), png256)
console.log('✓ assets/icon.png (256×256)')

// ── Wrap PNG in ICO (Vista+ format: ICO entry with embedded PNG) ──────────────
function createIco(pngBufs) {
  // pngBufs: array of { size, buf }
  const count = pngBufs.length
  const headerSize = 6 + count * 16
  let offset = headerSize

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)      // reserved
  header.writeUInt16LE(1, 2)      // type = ICO
  header.writeUInt16LE(count, 4)  // image count

  const dirs = []
  for (const { size, buf } of pngBufs) {
    const dir = Buffer.alloc(16)
    dir[0] = size >= 256 ? 0 : size   // width (0 = 256)
    dir[1] = size >= 256 ? 0 : size   // height
    dir[2] = 0   // color count
    dir[3] = 0   // reserved
    dir.writeUInt16LE(1, 4)            // planes
    dir.writeUInt16LE(32, 6)           // bit count (hint only)
    dir.writeUInt32LE(buf.length, 8)   // image size
    dir.writeUInt32LE(offset, 12)      // image offset
    offset += buf.length
    dirs.push(dir)
  }

  return Buffer.concat([header, ...dirs, ...pngBufs.map((p) => p.buf)])
}

const ico = createIco([
  { size: 256, buf: png256 },
  { size: 32,  buf: png32  },
])
writeFileSync(join(assetsDir, 'icon.ico'), ico)
console.log('✓ assets/icon.ico (256×256, 32×32)')
