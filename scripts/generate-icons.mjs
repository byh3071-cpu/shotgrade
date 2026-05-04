import { writeFileSync } from "node:fs"
import { deflateSync } from "node:zlib"
import { Buffer } from "node:buffer"

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type)
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, c])
}

function makePng(size) {
  // Background #0a0a0a, foreground coffee #d4a574 — circle filling 80% of canvas.
  const BG = [0x0a, 0x0a, 0x0a]
  const FG = [0xd4, 0xa5, 0x74]
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.4

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const rowLen = size * 3
  const raw = Buffer.alloc(size * (1 + rowLen))
  for (let y = 0; y < size; y++) {
    const off = y * (1 + rowLen)
    raw[off] = 0
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5
      const dy = y - cy + 0.5
      const inside = dx * dx + dy * dy <= r * r
      const [R, G, B] = inside ? FG : BG
      raw[off + 1 + x * 3] = R
      raw[off + 1 + x * 3 + 1] = G
      raw[off + 1 + x * 3 + 2] = B
    }
  }
  const idat = deflateSync(raw)
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

writeFileSync("public/icon-192.png", makePng(192))
writeFileSync("public/icon-512.png", makePng(512))
console.log("generated public/icon-192.png and public/icon-512.png")
