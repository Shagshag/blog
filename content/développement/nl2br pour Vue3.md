---
publish: true
modified: 2025-05-10T10:08
tags:
  - javascript
  - vue3
---

J’ai voulu utiliser [nl2br pour vue.js](https://github.com/inouetakuya/vue-nl2br/) mais il n’est pas compatible avec Vue3.

Voici mon adaptation

```javascript
// Adapted from https://github.com/inouetakuya/vue-nl2br/
{
    props: {
        tag: {
            type: String,
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
        className: {
            type: String,
            required: false,
        },
    },
    setup(props) {
        return () =>
            Vue.h(
                props.tag,
                {
                    'class': props.className
                },
                props.text.split('\n').reduce((accumulator, string) => {
                    if (!Array.isArray(accumulator)) {
                        return [accumulator, Vue.h('br'), string]
                    }
                    return accumulator.concat([Vue.h('br'), string])
                })
            );
    },
};
```

Fichier disponible sur [Github](https://gist.github.com/Shagshag/19c83d4168579e35f22ea44be5536fd4)
