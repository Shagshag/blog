#!/usr/bin/env node
// Cleans up the URLs Quartz generates from file names: accented characters
// (é, à, ç...) get transliterated to ASCII instead of ending up percent-encoded
// in the URL, and punctuation that breaks link auto-detection in many editors
// (backticks, quotes, commas, parens...) becomes a separator instead of being
// left in the slug as-is.
//
// This can't be done through a plugin: the function responsible,
// `slugifyPath` (@quartz-community/utils), is called directly by the core
// engine (quartz/processors/parse.ts, quartz/build.ts,
// quartz/plugins/emitters/assets.ts) rather than through any
// transformer/filter/emitter hook a plugin could override.
//
// It also has to patch *every* copy of the function, not just the package in
// the root node_modules:
//  - `npx quartz plugin install` runs a separate `npm install` inside each
//    plugin's own directory (.quartz/plugins/<name>/node_modules), so every
//    plugin gets its own independent copy of @quartz-community/utils.
//  - Several plugins (crawl-links, alias-redirects, canvas-page,
//    note-properties, obsidian-flavored-markdown,
//    obsidian-plugin-excalidraw...) are bundled with tsup and inline their
//    *own* copy of slugifyPath directly into their dist/*.js output instead
//    of importing the external package at runtime.
//  - @quartz-community/utils itself ships two bundled entry points
//    (dist/index.js and dist/path.js) that each independently inline the
//    function rather than one importing from the other.
// crawl-links matters most here: it uses its copy's `transformInternalLink`
// to resolve `[[wikilinks]]` to hrefs. If that copy kept the old "dirty"
// slugifier while page slugs used a clean one, every internal link to a note
// with accents/punctuation in its title would silently 404. So this patches
// every matching file it can find under node_modules/@quartz-community and
// .quartz/plugins, keyed off the function's distinctive body rather than a
// fixed file location, and leaves `slugifyPathPreserveCase` (a differently
// named function used by alias-redirects to auto-generate redirect pages
// from old URLs to the new canonical ones) untouched on purpose.
//
// Re-run after `npm ci` (via the "postinstall" script) and after
// `npx quartz plugin install`/`update` (via the "install-plugins" script) so
// the fix survives reinstalls. Safe to re-run: patching an already-patched
// file is a no-op.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

// Matches `function slugifyPath(<param>) { ... }` but not
// `function slugifyPathPreserveCase(...)` -- the required `(` right after
// the name excludes the longer, differently-suffixed function name.
const FUNCTION_RE = /function slugifyPath\((\w+)\)\s*\{[\s\S]*?\n\}/
const MARKER = "patched by scripts/patch-slugify.mjs"

function buildPatchedBody(param) {
  return `function slugifyPath(${param}) {
  // ${MARKER} -- see that file for why.
  return ${param}
    .split("/")
    .map((segment) =>
      segment
        .normalize("NFD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .replace(/&/g, "-and-")
        .replace(/%/g, "-percent")
        .replace(/[\`'\\u2018\\u2019"\\u201c\\u201d,;:()[\\]{}!?#<>|*]/g, "-")
        .replace(/\\s+/g, "-")
        .toLowerCase()
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .join("/")
    .replace(/\\/$/, "")
}`
}

function* walk(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.name === ".git") continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full)
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      yield full
    }
  }
}

function findCandidateFiles() {
  const roots = [
    path.join(ROOT, "node_modules/@quartz-community"),
    path.join(ROOT, ".quartz/plugins"),
  ]
  const files = []
  for (const root of roots) {
    if (!existsSync(root)) continue
    for (const file of walk(root)) files.push(file)
  }
  return files
}

function patchFile(file) {
  const original = readFileSync(file, "utf-8")
  if (!FUNCTION_RE.test(original)) return "no-match"
  if (original.includes(MARKER)) return "already-patched"

  const patched = original.replace(FUNCTION_RE, (_match, param) => buildPatchedBody(param))
  writeFileSync(file, patched)
  return "patched"
}

export function patchSlugify() {
  const files = findCandidateFiles()

  if (files.length === 0) {
    console.log("[patch-slugify] No installed plugins/utils found, nothing to do.")
    return
  }

  const counts = { patched: 0, "already-patched": 0, "no-match": 0 }
  for (const file of files) {
    counts[patchFile(file)]++
  }

  console.log(
    `[patch-slugify] scanned ${files.length} files: ${counts.patched} patched, ` +
      `${counts["already-patched"]} already up to date`,
  )
}

// Also runnable directly: `node scripts/patch-slugify.mjs`. Importing this
// module (e.g. from quartz/cli/handlers.js, so every `quartz build` re-patches
// freshly installed/updated plugins right before they're loaded) runs it too
// -- that's intentional, the patch is idempotent and cheap.
patchSlugify()
