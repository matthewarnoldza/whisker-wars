#!/usr/bin/env node
/**
 * Image optimization script for Whisker Wars
 *
 * Converts every PNG under public/images (EXCEPT public/images/logos, which is
 * left untouched because the favicon references a PNG there) into a resized
 * WebP, then deletes the source PNG.
 *
 * Sizing rules (never upscales):
 *   - backgrounds/  -> fit within a 1920x1920 box (longest edge <= 1920px)
 *   - everything else -> fit within an 832x1280 box (character / event art)
 *
 * Encoding: WebP quality 80.
 *
 * Idempotent: if a target .webp already exists it is skipped, and any leftover
 * source .png is removed. Safe to re-run and safe to run on future art drops.
 *
 * Usage:
 *   node scripts/optimize-images.mjs
 */

import { readdir, stat, rm, access } from 'fs/promises'
import { join, extname, relative, sep } from 'path'

const IMAGE_DIR = 'public/images'
const SKIP_DIRS = new Set(['logos'])
const QUALITY = 80
const CHAR_BOX = { w: 832, h: 1280 }
const BG_LONGEST_EDGE = 1920

async function getPngFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip the logos directory entirely (relative to IMAGE_DIR top level)
      if (dir === IMAGE_DIR && SKIP_DIRS.has(entry.name)) continue
      files.push(...(await getPngFiles(fullPath)))
    } else if (extname(entry.name).toLowerCase() === '.png') {
      files.push(fullPath)
    }
  }
  return files
}

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

// Top-level category under public/images (e.g. "cats", "events") for grouping.
function categoryOf(file) {
  const rel = relative(IMAGE_DIR, file)
  return rel.split(sep)[0] || '(root)'
}

async function run() {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.error('sharp is not installed. Run: npm install sharp --save-dev')
    process.exit(1)
  }

  const files = await getPngFiles(IMAGE_DIR)
  console.log(`Found ${files.length} PNG(s) to process (excluding ${[...SKIP_DIRS].join(', ')})\n`)

  // stats[category] = { beforeBytes, afterBytes, converted, skipped }
  const stats = {}
  const bump = (cat) => (stats[cat] ??= { beforeBytes: 0, afterBytes: 0, converted: 0, skipped: 0 })

  let totalBefore = 0
  let totalAfter = 0
  let converted = 0
  let skipped = 0

  for (const pngPath of files) {
    const cat = categoryOf(pngPath)
    const s = bump(cat)
    const webpPath = pngPath.replace(/\.png$/i, '.webp')

    // Idempotent: a WebP already exists -> skip encoding, clean up stray PNG.
    if (await exists(webpPath)) {
      const webpInfo = await stat(webpPath)
      s.afterBytes += webpInfo.size
      s.skipped += 1
      totalAfter += webpInfo.size
      skipped += 1
      await rm(pngPath, { force: true })
      continue
    }

    const info = await stat(pngPath)
    s.beforeBytes += info.size
    totalBefore += info.size

    const isBackground = cat === 'backgrounds'
    const resizeOpts = isBackground
      ? { width: BG_LONGEST_EDGE, height: BG_LONGEST_EDGE, fit: 'inside', withoutEnlargement: true }
      : { width: CHAR_BOX.w, height: CHAR_BOX.h, fit: 'inside', withoutEnlargement: true }

    await sharp(pngPath).resize(resizeOpts).webp({ quality: QUALITY }).toFile(webpPath)

    const webpInfo = await stat(webpPath)
    s.afterBytes += webpInfo.size
    s.converted += 1
    totalAfter += webpInfo.size
    converted += 1

    await rm(pngPath, { force: true })
    console.log(
      `  ${relative(IMAGE_DIR, pngPath)}: ${(info.size / 1024).toFixed(0)}KB -> ${(webpInfo.size / 1024).toFixed(0)}KB`
    )
  }

  const mb = (b) => (b / 1024 / 1024).toFixed(1)
  console.log('\nPer-directory summary (before PNG -> after WebP):')
  for (const cat of Object.keys(stats).sort()) {
    const { beforeBytes, afterBytes, converted: c, skipped: sk } = stats[cat]
    console.log(
      `  ${cat.padEnd(14)} ${mb(beforeBytes).padStart(6)}MB -> ${mb(afterBytes).padStart(6)}MB  ` +
        `(${c} converted${sk ? `, ${sk} already webp` : ''})`
    )
  }
  console.log(
    `\nTotals: ${mb(totalBefore)}MB PNG -> ${mb(totalAfter)}MB WebP  ` +
      `(${converted} converted, ${skipped} skipped)`
  )
  console.log('Done.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
