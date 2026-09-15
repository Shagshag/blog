import { FilePath, FullSlug, endsWith, getFileExtension, stripSlashes } from "./path"

/**
 * Reproduces exactly what `slugifyFilePath` used to output before
 * scripts/patch-slugify.mjs started transliterating accents and cleaning up
 * punctuation (see that script and quartz/plugins/emitters/redirects.ts,
 * which uses this to 301 a page's old published URL to its new clean one).
 * This is a historical snapshot, not meant to track future changes to the
 * current slugifier.
 */
function legacySlugifySegment(s: string): string {
  return s
    .replace(/\s/g, "-")
    .replace(/&/g, "-and-")
    .replace(/%/g, "-percent")
    .replace(/\?/g, "")
    .replace(/#/g, "")
    .replace(/[<>:"|*]/g, "")
    .toLowerCase()
}

export function legacySlugifyFilePath(fp: FilePath, excludeExt?: boolean): FullSlug {
  const stripped = stripSlashes(fp)
  const ext = getFileExtension(stripped)
  const withoutFileExt = stripped.replace(new RegExp(`${ext ?? ""}$`), "")
  const finalExt = excludeExt || [".md", ".html", undefined].includes(ext) ? "" : (ext ?? "")

  let slug = withoutFileExt.split("/").map(legacySlugifySegment).join("/").replace(/\/$/, "")

  if (endsWith(slug, "_index")) {
    slug = slug.replace(/_index$/, "index")
  }

  const segments = slug.split("/")
  if (segments.length >= 2 && segments[segments.length - 1] === segments[segments.length - 2]) {
    segments[segments.length - 1] = "index"
    slug = segments.join("/")
  }

  return (slug + finalExt) as FullSlug
}
