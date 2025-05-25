---
date: 2020-07-07T17:54:59+02:00
tags:
  - contact_form_7
  - javascript
  - popup_maker
  - wordpress
publish: true
---

[Popup Maker](https://wppopupmaker.com/) peut [réagir aux validations des formulaires](https://docs.wppopupmaker.com/article/224-close-popup-and-create-cookie-after-contact-form-7-submission) de [Contact Form 7](https://contactform7.com/). Enfin il devrait parce que ça ne fonctionne plus.

Je ne sais pas à quel moment Contact Form 7 a changé le nom de ses événements : <span class="lang:default decode:true  crayon-inline">wpcf7:mailsent</span> est devenu <span class="lang:default decode:true  crayon-inline ">wpcf7mailsent</span>

Pour remédier à ça, il faut ajouter au JavaScript du site

```javascript
jQuery(document).on('wpcf7mailsent', '.wpcf7', function (e, t) {
	var event = new CustomEvent( 'wpcf7:mailsent', {
		bubbles: true,
		detail: e.detail
	} );
	e.target.dispatchEvent(event);
});
```

comme cela les 2 événements sont envoyés.