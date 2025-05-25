---
date: 2025-05-11T16:00:01+02:00
publish: true
tags:
  - Quartz
  - favicon
  - TypeScript
---
Maintenant que [_quelques_ navigateurs supportent le SVG](https://caniuse.com/link-icon-svg) pour les [favicons](https://fr.wikipedia.org/wiki/Favicon), on peut utiliser les emoji directement avec cette balise :

```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎯</text></svg>">
```

Source : https://css-tricks.com/emoji-as-a-favicon/

C'est gadget et surement pas une bonne idée de l'utiliser alors que Safari ne le gère pas encore mais pour mon site ça sera très bien 😎.

Comme aujourd'hui je m'amuse avec [Quartz](https://quartz.jzhao.xyz/) pour générer ce site, j'en ai fait un plugin :

```tsx
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
```

Disponible sur [Github](https://github.com/Shagshag/blog/commit/c46748f948676844f2f10f58f4f0c27f4eef1980)