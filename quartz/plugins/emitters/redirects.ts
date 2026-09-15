import { FilePath, FullSlug, joinSegments } from "../../util/path"
import { legacySlugifyFilePath } from "../../util/legacySlug"
import { QuartzEmitterPlugin } from "../types"
import fs from "fs"

/**
 * Sevalla's _redirects parser requires both columns to be URL-encoded (see
 * https://docs.sevalla.com/static-sites/redirects) and matches against the
 * *encoded* request path as sent by the browser -- not the decoded one. Plain
 * `encodeURIComponent` over-escapes: it also encodes characters like `,` and
 * `'` that browsers themselves leave literal in a path (they're valid
 * sub-delimiters there), which would make our rule's `from` never match a
 * real request. `encodeURI` mirrors what a browser actually sends: it leaves
 * `/`, `,`, `'`, `(`, `)` etc. alone and only escapes what's actually illegal
 * in a URL (spaces, backticks, non-ASCII...).
 */
function encodePathForRedirects(slug: FullSlug): string {
  return encodeURI(slug)
}

/**
 * One rule per line, first match wins. `from`/`to` never contain raw spaces
 * (slugs use `-` as a separator), so a single space is enough to delimit the
 * three columns even though both can contain other punctuation.
 */
function redirectsFileContents(legacyRules: Array<[from: FullSlug, to: FullSlug]>): string {
  const specificRules = legacyRules.map(
    ([from, to]) => `/${encodePathForRedirects(from)} /${encodePathForRedirects(to)} 301`,
  )
  const catchAllRule = "/*  /:splat.html  200"
  return [...specificRules, catchAllRule].join("\n") + "\n"
}

/**
 * Emits a Netlify-compatible `_redirects` file at the root of the output
 * directory so hosts that support it (Netlify, Cloudflare Pages, Sevalla, ...)
 * can:
 *
 * 1. 301 a page's *old* published URL to its current one, for every page
 *    whose slug no longer matches what `slugifyFilePath` used to produce
 *    before scripts/patch-slugify.mjs (see quartz/util/legacySlug.ts) —
 *    e.g. accented characters that used to end up percent-encoded, or
 *    punctuation that's now cleaned up instead of left as-is. These rules
 *    must come before the catch-all below since Netlify-style _redirects
 *    matching is first-match-wins.
 * 2. Serve `foo.html` at the extensionless URL `foo` via a server-side
 *    rewrite (status 200) rather than a redirect. This is required because
 *    Quartz computes CSS/JS `<link>`/`<script>` paths as relative to the
 *    page being a *file* (e.g. `../component-x.css`); a host-side redirect
 *    to a trailing-slash "pretty" URL (e.g. `foo/`) makes the browser treat
 *    the page as a directory one level deeper, breaking every relative
 *    asset path. A 200 rewrite keeps the URL — and thus the relative-path
 *    depth — unchanged.
 */
export const Redirects: QuartzEmitterPlugin = () => ({
  name: "Redirects",
  async *emit(ctx, content) {
    const legacyRules: Array<[FullSlug, FullSlug]> = []
    for (const [, file] of content) {
      const relativePath = file.data.relativePath as FilePath | undefined
      const slug = file.data.slug as FullSlug | undefined
      if (!relativePath || !slug) continue

      const legacySlug = legacySlugifyFilePath(relativePath)
      if (legacySlug !== slug) {
        legacyRules.push([legacySlug, slug])
      }
    }

    const dest = joinSegments(ctx.argv.output, "_redirects") as FilePath
    await fs.promises.writeFile(dest, redirectsFileContents(legacyRules))
    yield dest
  },
  async *partialEmit() {},
})
