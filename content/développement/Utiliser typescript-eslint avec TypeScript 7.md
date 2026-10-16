---
publish: true
title: Utiliser typescript-eslint avec TypeScript 7
description: Faire tourner typescript-eslint dans un projet qui utilise TypeScript 7, avec un alias npm vers le paquet de compatibilité TypeScript 6.
created: 2026-10-17T12:00:00
modified: 2026-10-17T12:00
tags:
  - typescript
  - eslint
---

_Also available in [[Using typescript-eslint with TypeScript 7|English]]._

En ajoutant ESLint à un projet qui utilise TypeScript 7 (`"typescript": "^7.0.2"`), `npm install --save-dev eslint typescript-eslint @eslint/js` échoue :

```
npm error ERESOLVE unable to resolve dependency tree
npm error Found: typescript@7.0.2
npm error Could not resolve dependency:
npm error peer typescript@">=4.8.4 <6.1.0" from typescript-eslint@8.71.2
```

Avec `--legacy-peer-deps` l'installation passe, mais `eslint .` s'arrête tout de suite :

```
Error: typescript-eslint does not support TS 7.0.
```

Ce n'est pas un warning. Les trois points d'entrée (`typescript-eslint`, `@typescript-eslint/eslint-plugin` et `@typescript-eslint/parser`) contiennent un `if (versionMajor >= 7)` qui lève une exception dès l'import, avant qu'une règle ne s'exécute. `typescript-eslint` fait un `require("typescript")` pour utiliser l'API JS du compilateur, et TypeScript 7.0 est livré sans cette API.

## Ce qui marche

Le [billet d'annonce de TypeScript 7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0) explique comment faire cohabiter TypeScript 7 avec le paquet `@typescript/typescript6` pour les outils qui ont encore besoin de l'API. Avec npm, ça passe par un alias du nom `typescript` lui-même, et un second alias pour garder TypeScript 7 côté `tsc` :

```json
"devDependencies": {
  "typescript": "npm:@typescript/typescript6@^6.0.2",
  "@typescript/native": "npm:typescript@^7.0.2",
  "eslint": "^10.13.0",
  "typescript-eslint": "^8.71.2",
  "@eslint/js": "^10.0.1"
}
```

`require("typescript")` résout alors vers la 6.0.2 et `npx tsc --version` affiche toujours `7.0.2`. L'installation se fait sans `--legacy-peer-deps` et `npm ls typescript --all` ne montre plus de `invalid`.

Dans mon projet, `tsc --noEmit` reste propre, les tests Vitest passent, et les règles qui demandent le typechecker (`recommendedTypeChecked`) fonctionnent aussi.

## Ce qui ne marche pas

Mon premier réflexe a été un `overrides` npm limité aux paquets `typescript-eslint`, avec `"typescript": "^6.0.0"`. Avec `--legacy-peer-deps`, npm ne crée pas de copie imbriquée. Il garde un seul `typescript@7.0.2` à la racine et le marque `invalid` partout. Sans le flag, l'installation s'arrête sur un ERESOLVE, parce que npm compare le `typescript` de la racine au peer réécrit par l'override.

Un alias sous un autre nom (`"typescript-6": "npm:typescript@^6.0.0"`) ne change rien non plus. `typescript-eslint` fait `require("typescript")` en littéral, il ne regarde jamais un paquet qui s'appelle autrement.

## Support natif

L'issue [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) suit le support de TypeScript 7. Elle est ouverte et verrouillée. Fin septembre 2026, un mainteneur y annonce une PR prête pour relecture interne pour un support natif avec TypeScript 7.1. Cette note devrait donc devenir inutile à ce moment-là.

Testé avec Node 26.5.0, npm 12.2.0, TypeScript 7.0.2 et typescript-eslint 8.71.2.
