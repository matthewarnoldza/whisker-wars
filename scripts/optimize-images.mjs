#!/usr/bin/env node
/**
 * Image optimization script for Whisker Wars
 *
 * Resizes large PNGs to max 800px wide (sufficient for game cards)
 * and creates WebP versions for modern browsers.
 *
 * Usage:
 *   npm install sharp --save-dev   # one-time setup
 *   node scripts/optimize-images.mjs
 *
 * After running, update <img> tags to use <picture> with WebP sources.
 */

import { readdir, stat } from 'fs/promises'
import { join, extname } from 'path'

const IMAGE_DIR = 'public/images'
const MAX_WIDTH = 800
const QUALITY = 80

async function getFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await getFiles(fullPath))
    } else if (['.png', '.jpg', '.jpeg'].includes(extname(entry.name).toLowerCase())) {
      files.push(fullPath)
    }
  }
  return files
}

async function run() {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.error('sharp is not installed. Run: npm install sharp --save-dev')
    process.exit(1)
  }

  const files = await getFiles(IMAGE_DIR)
  console.log(`Found ${files.length} images to optimize`)

  let totalBefore = 0
  let totalAfter = 0

  for (const file of files) {
    const info = await stat(file)
    totalBefore += info.size

    const img = sharp(file)
    const meta = await img.metadata()

    // Resize if wider than MAX_WIDTH
    if (meta.width && meta.width > MAX_WIDTH) {
      await img
        .resize(MAX_WIDTH, null, { withoutEnlargement: true })
        .png({ quality: QUALITY, compressionLevel: 9 })
        .toFile(file + '.tmp')

      const { rename } = await import('fs/promises')
      await rename(file + '.tmp', file)
      console.log(`  Resized: ${file} (${meta.width}→${MAX_WIDTH}px)`)
    }

    // Create WebP version
    const webpPath = file.replace(/\.(png|jpg|jpeg)$/i, '.webp')
    await sharp(file)
      .resize(MAX_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(webpPath)

    const webpInfo = await stat(webpPath)
    totalAfter += webpInfo.size
    console.log(`  WebP: ${webpPath} (${(info.size / 1024).toFixed(0)}KB → ${(webpInfo.size / 1024).toFixed(0)}KB)`)
  }

  console.log(`\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB`)
  console.log('Done! Update your components to use <picture> with WebP sources.')
}

run().catch(console.error)
