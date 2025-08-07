---
{"date":"2025-06-03T10:13:21+02:00","publish":true,"tags":["css","javascript"],"created":"2025-06-03T10:13","updated":"2025-06-03T10:33:56.550+02:00","PassFrontmatter":true}
---

Pour accéder à [une variable CSS](https://developer.mozilla.org/fr/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties#manipulation_des_variables_en_javascript) définie comme suit :
```css
:root {
  --secondary-color: #336699;
}
```

On peut utiliser le JavaScript suivant :
```javascript
let secondaryColor = window.getComputedStyle(document.documentElement).getPropertyValue('--secondary-color')
```

Si elle est surchargée dans un élément
```css
h2 {
  --secondary-color: #669933;
}
```

Il faut aller la chercher dans le style de l'élément :
```javascript
let secondaryColor = window.getComputedStyle(document.querySelector('h2')).getPropertyValue('--secondary-color')
```

Source : https://developer.mozilla.org/fr/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties#manipulation_des_variables_en_javascript