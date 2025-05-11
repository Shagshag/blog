import { QuartzEmitterPlugin } from "../types"

const defaultOption = "🪴"

export const FaviconEmoji: QuartzEmitterPlugin<String> = (opts) => {
  const emoji = opts || defaultOption

  return {
    name: "FaviconEmoji",
    async *emit() {},
    externalResources: () => {
      return {
        additionalHead: [
          <link
            rel="icon"
            href={`data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`}
          />,
        ],
      }
    },
  }
}
