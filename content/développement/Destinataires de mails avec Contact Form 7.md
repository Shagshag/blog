---
publish: true
modified: 2025-05-10T10:07
tags:
  - contact_form_7
  - wordpress
---

Ça n’a rien de nouveau mais je ne m’en souviens jamais donc voici comment avoir un destinataire du mail envoyé par contact form 7 en fonction du choix fait par l’utilisateur dans le formulaire.

Mettre un champ `select` dans le formulaire avec comme choix `"Texte à afficher|e-mail destinataire"`

```
[select your-recipient "CEO|ceo@example.com"
                    "Sales|sales@example.com"
                    "Support|support@example.com"]
```

Dans l’onglet e-mail, mettre `[your-recipient]` comme destinataire.

Si on veut la valeur choisie dans le corps du mail, il faut mettre `[_raw_{field name}]` soit ici `[_raw_your-recipient]`

Source : https://contactform7.com/selectable-recipient-with-pipes/
