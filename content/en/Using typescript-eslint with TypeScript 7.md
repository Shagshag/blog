---
publish: true
title: Using typescript-eslint with TypeScript 7
description: Running typescript-eslint in a project that uses TypeScript 7, with an npm alias to the TypeScript 6 compatibility package.
lang: en
created: 2026-10-17T12:00:00
modified: 2026-10-17T12:00
tags:
  - typescript
  - eslint
---

_Disponible aussi en [[Utiliser typescript-eslint avec TypeScript 7|Français]]._

When adding ESLint to a project that uses TypeScript 7 (`"typescript": "^7.0.2"`), `npm install --save-dev eslint typescript-eslint @eslint/js` fails:

```
npm error ERESOLVE unable to resolve dependency tree
npm error Found: typescript@7.0.2
npm error Could not resolve dependency:
npm error peer typescript@">=4.8.4 <6.1.0" from typescript-eslint@8.71.2
```

With `--legacy-peer-deps` the install goes through, but `eslint .` stops right away:

```
Error: typescript-eslint does not support TS 7.0.
```

This is not a warning. The three entry points (`typescript-eslint`, `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser`) contain an `if (versionMajor >= 7)` that throws as soon as the package is imported, before any rule runs. `typescript-eslint` does a `require("typescript")` to use the compiler's JS API, and TypeScript 7.0 ships without that API.

## What works

The [TypeScript 7 announcement post](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0) explains how to run TypeScript 7 alongside the `@typescript/typescript6` package for tools that still need the API. With npm, this is done through an alias of the `typescript` name itself, plus a second alias to keep TypeScript 7 for `tsc`:

```json
"devDependencies": {
  "typescript": "npm:@typescript/typescript6@^6.0.2",
  "@typescript/native": "npm:typescript@^7.0.2",
  "eslint": "^10.13.0",
  "typescript-eslint": "^8.71.2",
  "@eslint/js": "^10.0.1"
}
```

`require("typescript")` then resolves to 6.0.2 and `npx tsc --version` still prints `7.0.2`. The install works without `--legacy-peer-deps` and `npm ls typescript --all` no longer shows any `invalid`.

In my project, `tsc --noEmit` stays clean, the Vitest tests pass, and the rules that need the typechecker (`recommendedTypeChecked`) work too.

## What doesn't work

My first reflex was an npm `overrides` limited to the `typescript-eslint` packages, with `"typescript": "^6.0.0"`. With `--legacy-peer-deps`, npm doesn't create a nested copy. It keeps a single `typescript@7.0.2` at the root and marks it `invalid` everywhere. Without the flag, the install stops on an ERESOLVE, because npm compares the root `typescript` with the peer rewritten by the override.

An alias under another name (`"typescript-6": "npm:typescript@^6.0.0"`) changes nothing either. `typescript-eslint` has a literal `require("typescript")`, it never looks at a package named differently.

## Native support

The issue [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) tracks TypeScript 7 support. It is open and locked. In late September 2026, a maintainer announced a PR ready for internal review for native support with TypeScript 7.1. This note should become useless by then.

Tested with Node 26.5.0, npm 12.2.0, TypeScript 7.0.2 and typescript-eslint 8.71.2.
