---
publish: true
title: A solarpunk garden for your GitHub profile, generated daily from your contributions
lang: en
created: 2026-10-08T23:58:00
modified: 2026-10-09T00:05
tags:
  - github
  - python
  - svg
  - solarpunk
---

_solarpunk: soft colors, nature and gentle technology, the opposite of cyberpunk's dark neon_

_disponible aussi en [[Un jardin solarpunk pour son profil GitHub, généré chaque jour à partir de ses contributions|Français]]._

I turned my GitHub contribution graph into an isometric garden. One tile per day, a plant that grows with the number of contributions, seasons that follow the calendar, and a small gardener walking around today's tile. It is a plain SVG with CSS and SMIL animations, regenerated every day by a GitHub Action. Python standard library only, no dependencies, MIT license: [Shagshag/garden-graph](https://github.com/Shagshag/garden-graph).

I built it with Claude Code. I decided what the garden should look like and judged every render by eye. The assistant wrote most of the code and ran the command-line checks.

![The one-year view, light version on the upper right and dark version on the lower left](medias/2026/10/garden-year-split.gif)

> Note: you can see the animated SVG in the [README of the repository](https://github.com/Shagshag/garden-graph/blob/main/README.md), or open the raw files in the [assets folder](https://github.com/Shagshag/garden-graph/tree/main/assets).

This article shows how to put the same garden on your own profile, and how to adapt it to where you live.

### 🌱 Where the idea came from

I started from Giorgi Kobaidze's article [I turned my GitHub profile into a cyberpunk console, with a city built from my contributions](https://dev.to/georgekobaidze/i-turned-my-github-profile-into-a-cyberpunk-console-with-a-city-built-from-my-contributions-h4c). I took the general shape of the project from it. A daily GitHub Action calls the GraphQL API, a Python script writes an SVG, the isometric view is drawn from the back to the front (no 3D engine), the animations are CSS inside the SVG, and the workflow commits only if the files changed. The article also explained that `contributionsCollection` covers one year per request (see the [GraphQL reference](https://docs.github.com/en/graphql/reference/users)), and that you ask for more with one aliased field per year. I do it slightly differently, see the annex.

That inspiration was cyberpunk: a city, dark, neon. I wanted something fresher and more pleasant. I am also making a solarpunk restoration game, so the colors are soft and close to nature, and the wind turbines recall the gentle energy side of the theme.

### 🌳 What's in the garden

Each day is a tile. The plant on it depends on how active that day was compared with your other active days (quartiles): bare soil for no contribution, then a sprout, a flower, a tree, and for the busiest quarter a wind turbine with a solar panel. Days that have not happened yet are packed earth. The season follows the date, and every file exists in a light and a dark version.

Three views are generated: the current year folded in two half-years (big tiles, easy to read), an overview of the last five years, and a view made for phones.

![The five-year overview, light version on the upper right and dark version on the lower left](medias/2026/10/garden-split.gif)

![The mobile view, light version on the upper right and dark version on the lower left](medias/2026/10/mobile-garden-year-split.gif)

### 🪏 Setting it up on your profile

1. Get the files into your own repository: either fork it, or create `<your-login>/<your-login>` (the repository GitHub uses for your profile README) and copy the files in. Enable GitHub Actions.
2. Open `.github/workflows/garden.yml` and pick your climate and language:

```yaml
env:
  GARDEN_CLIMATE: temperate-north  # see the table below
  GARDEN_LANG: fr                  # fr (the default), en, ja or hi
  GITHUB_TOKEN: ${{ secrets.GH_STATS_TOKEN || secrets.GITHUB_TOKEN }}
```

3. Run the **Update garden** workflow once from the Actions tab.

After that it runs every day at 05:17 UTC (`17 5 * * *`) and commits only when something changed. That makes one commit per day, and a run takes about 15 seconds.

By default the garden is drawn for the owner of the repository, so a fork shows its own owner's garden, not mine. Set `GITHUB_LOGIN` only to show someone else's contributions. To also count your private contributions, add a secret `GH_STATS_TOKEN` (a token with `read:user`) and enable "Private contributions" in your profile settings. `GARDEN_YEARS` (5 by default) sets the number of years in the overview.

### 🏡 Adapting the garden to where you live

A contribution graph does not know about seasons, and most people do not live in four neat ones. The first version was written for the northern hemisphere, so it was wrong in Australia. A six-month shift fixed that but only covered temperate climates, so I moved to a `GARDEN_CLIMATE` setting.

I looked at where GitHub accounts are to decide which climates to offer. In the official [Octoverse 2025 post](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/), the United States comes first with 28 million developers, India second with 21.9 million, and Brazil is fourth with 6.89 million. China is also in the top ten. That gave seven climates:

| `GARDEN_CLIMATE`  | Seasons                                                            | For                                                      |
| ----------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| `temperate-north` | spring, summer, autumn, winter                                     | North America, Europe                                    |
| `temperate-south` | the same, shifted by six months                                    | southern Australia, New Zealand, Argentina, South Africa |
| `monsoon`         | cool, hot, monsoon, post-monsoon                                   | India, Bangladesh, Sri Lanka, Nepal                      |
| `tropical-south`  | wet (Nov to Apr), dry (May to Oct)                                 | central Brazil, Indonesia, southern Africa               |
| `tropical-north`  | wet (May to Oct), dry (Nov to Apr)                                 | the Sahel, Central America, mainland Southeast Asia      |
| `china-southeast` | mild winter, spring rains, humid summer and typhoons, clear autumn | Guangdong, Fujian, Hong Kong                             |
| `japan`           | sakura, spring, tsuyu, summer, autumn, winter                      | Honshu                                                   |

The months are averages. A specific region (the east coast of India, Kerala) can have its rains at other dates, so a climate is an approximation. In Japan a month can be cut in two, because tsuyu runs until mid-July.

If your region is not in the list, you add a climate in `render.py`: one entry in `CLIMATES` (which season each month belongs to, and the order of the legend) and one entry in `PALETTE` for each new season (ground color, leaves, flower colors, and whether the trees carry blossoms or fruit, or there are puddles or snow). For example, the two-season tropics of the northern hemisphere are:

```python
"tropical-north": (_months(wet="5 6 7 8 9 10", dry="11 12 1 2 3 4"), ("wet", "dry")),
```

The drawing code does not test season names, it reads the palette, so nothing else has to change.

![The monsoon climate](medias/2026/10/climate-monsoon-light.png)
![The japan climate](medias/2026/10/climate-japan-light.png)

The monsoon climate, then the japan climate.

Languages work the same way. `GARDEN_LANG` takes `fr`, `en`, `ja` or `hi`. The texts in `i18n.py` are complete sentence templates with placeholders (`{login}`, `{total}`, `{first}`, `{last}`), not words glued together, because word order and punctuation change between languages. To add a language, copy an entry of `STRINGS` and translate it. Numbers follow local usage, including the Indian grouping (12,34,567).

### 🥗 Putting it in your README

Embed the year view in your profile README with `<picture>`, which serves a light and a dark image. The switch with `<source media="(prefers-color-scheme: dark)">` comes from Kera Cudmore's [GitHub README images based on prefers-color-scheme](https://dev.to/keracudmore/github-readme-images-based-on-prefers-color-scheme-5cp8) and from the "Adding an image to suit your visitors" section of the [GitHub quickstart for writing on GitHub](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/quickstart-for-writing-on-github).

```html
<picture>
  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="assets/garden-mobile-dark.svg">
  <source media="(max-width: 600px)" srcset="assets/garden-mobile-light.svg">
  <source media="(prefers-color-scheme: dark)" srcset="assets/garden-year-dark.svg">
  <img alt="Garden of my contributions" src="assets/garden-year-light.svg">
</picture>
```

The order matters, the first match wins.

### 📱 Three views, three sizes

The part about phones is mine. Neither of the two sources above deals with it. On GitHub the 1000 px image is displayed a bit smaller, and the tiles of the five-year overview end up under 20 px wide, which is hard to read for a single day. That is why the one-year view exists, folded in two half-years so the tiles are about twice as big.

On a phone it is worse: the image is shrunk to about a third of its size and the title falls to around 8 px. The third view, `garden-mobile-*.svg`, has a narrow canvas, a bigger text and the legend under the garden. The first two `<source>` lines above pick it with a `max-width` media query combined with the color scheme.

If you also embed the five-year overview, it is too fine for a phone. An `<img>` cannot be hidden, so on a phone the repository replaces it with `blank.svg`, an SVG of one pixel. That is a workaround. The README of the repository does it with a second `<picture>`:

```html
<picture>
  <source media="(max-width: 600px)" srcset="assets/blank.svg">
  <source media="(prefers-color-scheme: dark)" srcset="assets/garden-dark.svg">
  <img alt="The same garden over the last five years" src="assets/garden-light.svg">
</picture>
```

### 🐛 Problems along the way

Two things broke along the way, and only one of them was a real bug.

The wind turbines first turned with a CSS animation, which broke as soon as the plants were scaled. They now use SVG's own animation. Screenshots are frozen, so the movement was checked by advancing the virtual time of a headless browser.

The gardener walks a few tiles around today's tile. The first version walked a fixed distance, so at the start and end of the year he left the field, since the first and last weeks can be partial.

![Wile E. Coyote falling](medias/2026/10/wile-e-coyote-3018138172.gif)

The walk is now limited to the tiles that exist on his row, and its duration follows the distance so the speed stays the same. It was checked on January 1st, January 10th, December 20th and December 31st.

### 🐞 Similar projects

I am not the first to draw contributions as a garden. [a104437ana/sakura-garden](https://github.com/a104437ana/sakura-garden) draws them as flowers in an SVG for a README, and [qrstajalli/BranchOut](https://github.com/qrstajalli/BranchOut) turns the last year into a pixel-art garden. garden-graph differs by its isometric view, the seven climates, the four languages, and the phone view.

### 🐌 Limits and where it stands

- The Japanese and Hindi texts have not been reviewed by a native speaker.
- The fonts are not embedded in the SVG, so Japanese and Hindi need a matching font on the viewer's machine.
- I tested on github.com (the repository page and my profile page), not in the GitHub mobile app and not on other sites.
- On a phone, the combination of mobile and dark follows the system theme, not necessarily the theme chosen inside GitHub.
- The tiles stay small on a phone, because the width is fixed.
- The months of each climate are averages, so a climate is an approximation by region.

Remaining work: a review of the Japanese and Hindi texts, embedded fonts, and a test in the GitHub mobile app.

### 🧮 Annex: fetching several years in one request

Giorgi's article gets the list of active years with `contributionYears`, then builds one aliased field per year. garden-graph does the same with one difference: the number of years is fixed (`GARDEN_YEARS`, 5 by default), so there is no first query. `fetch.py` takes the current year and goes back from there, then sends a single request:

```python
fields = "".join(
    f'y{y}: contributionsCollection(from: "{y}-01-01T00:00:00Z", to: "{y}-12-31T23:59:59Z") {{'
    "contributionCalendar { weeks { contributionDays { date contributionCount } } } } "
    for y in years
)
```

Each field asks for one calendar year, from January 1st to December 31st, so it stays under the limit of one year. The API refuses a longer range.

A GitHub calendar is made of whole weeks. The first and last week of a year can hold days of the previous or the next year, so the same date can come back in two fields. The script keeps a date only if it belongs to the year of its field and is not in the future, and stores it by date:

```python
for y in years:
    for week in user[f"y{y}"]["contributionCalendar"]["weeks"]:
        for d in week["contributionDays"]:
            if d["date"].startswith(str(y)) and d["date"] <= date.today().isoformat():
                counts[d["date"]] = d["contributionCount"]
```

The result goes into `data/contributions.json`. If the API does not answer, the script prints a message and keeps the previous file, so the garden is still drawn from the last data it had.

### 🌻 Sources

- Giorgi Kobaidze, [I turned my GitHub profile into a cyberpunk console, with a city built from my contributions](https://dev.to/georgekobaidze/i-turned-my-github-profile-into-a-cyberpunk-console-with-a-city-built-from-my-contributions-h4c)
- Kera Cudmore, [GitHub README images based on prefers-color-scheme](https://dev.to/keracudmore/github-readme-images-based-on-prefers-color-scheme-5cp8) (July 2025)
- GitHub Docs, [Quickstart for writing on GitHub](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/quickstart-for-writing-on-github)
- GitHub Docs, [GraphQL reference, Users](https://docs.github.com/en/graphql/reference/users) (`contributionsCollection`)
- GitHub, [Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/)
- [a104437ana/sakura-garden](https://github.com/a104437ana/sakura-garden), [qrstajalli/BranchOut](https://github.com/qrstajalli/BranchOut)
- [Shagshag/garden-graph](https://github.com/Shagshag/garden-graph) (MIT)
