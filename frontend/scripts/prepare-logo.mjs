// Crops the (transparent) brand logo to its ink and writes a full logo plus a header mark without the tagline.
// Usage: node scripts/prepare-logo.mjs [source.png] [out.png]
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const src = process.argv[2] ?? 'scripts/logo-source.png'
const out = process.argv[3] ?? 'src/assets/maahir-logo.png'
const dataUrl = `data:image/png;base64,${readFileSync(src).toString('base64')}`

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
const result = await page.evaluate(async (url) => {
  const img = new Image()
  img.src = url
  await img.decode()
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const px = ctx.getImageData(0, 0, c.width, c.height).data
  const inked = (x, y) => px[(y * c.width + x) * 4 + 3] > 60

  const rows = Array.from({ length: c.height }, (_, y) => {
    let n = 0
    for (let x = 0; x < c.width; x++) if (inked(x, y)) n++
    return n
  })
  const bands = []
  rows.forEach((n, y) => {
    if (!n) return
    const last = bands[bands.length - 1]
    if (last && y - last[1] <= 4) last[1] = y
    else bands.push([y, y])
  })

  const pad = 4
  const crop = (y0, y1) => {
    let x0 = c.width
    let x1 = 0
    for (let y = y0; y <= y1; y++)
      for (let x = 0; x < c.width; x++)
        if (inked(x, y)) {
          x0 = Math.min(x0, x)
          x1 = Math.max(x1, x)
        }
    const w = x1 - x0 + 1 + pad * 2
    const h = y1 - y0 + 1 + pad * 2
    const o = document.createElement('canvas')
    o.width = w
    o.height = h
    o.getContext('2d').drawImage(c, x0 - pad, y0 - pad, w, h, 0, 0, w, h)
    return { png: o.toDataURL('image/png'), w, h }
  }

  const top = bands[0][0]
  const bottom = bands[bands.length - 1][1]
  // The mark stops above the hairline rule, which sits just above the tagline band.
  const markEnd = bands.length >= 3 ? bands[bands.length - 2][0] - 1 : bottom
  return { full: crop(top, bottom), mark: crop(top, markEnd), bands }
}, dataUrl)
await browser.close()

const save = (file, img) => {
  writeFileSync(file, Buffer.from(img.png.split(',')[1], 'base64'))
  console.log(`wrote ${file} ${img.w}x${img.h}`)
}
save(out, result.full)
save(out.replace(/\.png$/, '-mark.png'), result.mark)
console.log('bands', JSON.stringify(result.bands))
