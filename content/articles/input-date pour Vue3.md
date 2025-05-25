---
date: 2020-11-24T09:59:37+01:00
tags:
  - javascript
  - vue3
publish: true
---

Pareil que pour [[./nl2br pour Vue3|nl2br]], j’ai voulu utiliser un champ date dans Vue3 mais [le code que j’utilisais dans vue.js](https://acdcjunior.github.io/how-bind-date-object-to-input-date-vue.js-v-model.html) ne fonctionne pas.

Voici mon adaptation

```javascript
// adapted from https://acdcjunior.github.io/how-bind-date-object-to-input-date-vue.js-v-model.html
{
    props: ['modelValue'],
    emits: ['update:modelValue'],
    setup() {
        const dateToYYYYMMDD = (d) => {
            // alternative implementations in https://stackoverflow.com/q/23593052/1850609
            try {
                return d && new Date(d.getTime()-(d.getTimezoneOffset()*60*1000)).toISOString().split('T')[0];
            } catch(e) {
                return null;
            }
        };
        return {
            dateToYYYYMMDD,
        }
    },
    template: `
      <input
        v-model="value"
        type="date"
        @input="$emit('update:modelValue', $event.target.valueAsDate)"
    />
    `,
    computed: {
      value: {
        get() {
            return this.dateToYYYYMMDD(this.modelValue);
        },
        set(value) {
        }
      }
    }
}
```

Fichier disponible sur [Github](https://gist.github.com/Shagshag/a8138286ef5011d2ce6636ec03afcfce)