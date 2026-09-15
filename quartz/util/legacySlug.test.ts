import { test, describe } from "node:test"
import assert from "node:assert"
import { legacySlugifyFilePath } from "./legacySlug"
import { FilePath } from "./path"

describe("legacySlugifyFilePath", () => {
  test("reproduces the pre-cleanup slugifier exactly", () => {
    const cases: Array<[string, string]> = [
      ["content/index.md", "content/index"],
      ["note with spaces.md", "note-with-spaces"],
      ["cool/what about r&d?.md", "cool/what-about-r-and-d"],
      // accents and punctuation are left untouched, unlike the current slugifier
      [
        "développement/`class` ou `alias`, un choix de conteneur Symfony, et un choix d'ingénierie.md",
        "développement/`class`-ou-`alias`,-un-choix-de-conteneur-symfony,-et-un-choix-d'ingénierie",
      ],
      [
        "projets/Une virgule et trois robots d’Asimov.md",
        "projets/une-virgule-et-trois-robots-d’asimov",
      ],
    ]

    for (const [input, expected] of cases) {
      assert.strictEqual(legacySlugifyFilePath(input as FilePath), expected)
    }
  })
})
