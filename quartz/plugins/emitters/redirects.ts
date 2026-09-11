import { FilePath, joinSegments } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import fs from "fs"

/**
 * Emits a Netlify-compatible `_redirects` file at the root of the output
 * directory so hosts that support it (Netlify, Cloudflare Pages, Sevalla, ...)
 * can serve `foo.html` at the extensionless URL `foo` via a server-side
 * rewrite (status 200) rather than a redirect. This is required because
 * Quartz computes CSS/JS `<link>`/`<script>` paths as relative to the page
 * being a *file* (e.g. `../component-x.css`); a host-side redirect to a
 * trailing-slash "pretty" URL (e.g. `foo/`) makes the browser treat the page
 * as a directory one level deeper, breaking every relative asset path.
 * A 200 rewrite keeps the URL — and thus the relative-path depth — unchanged.
 */
export const Redirects: QuartzEmitterPlugin = () => ({
  name: "Redirects",
  async *emit(ctx) {
    const dest = joinSegments(ctx.argv.output, "_redirects") as FilePath
    await fs.promises.writeFile(dest, "/*  /:splat.html  200\n")
    yield dest
  },
  async *partialEmit() {},
})
