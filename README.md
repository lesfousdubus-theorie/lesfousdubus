# 🚌 Les Fous du Bus · L'Expérience One Piece

> *Bienvenue à bord du minibus pirate le plus fou de Grand Line, en route vers Laugh Tale !*

---

## 🏴‍☠️ Qu'est-ce que c'est ?

**Les Fous du Bus** est une expérience interactive accessible directement depuis votre navigateur. Elle célèbre la grande théorie de la communauté One Piece : **« Le Siècle Oublié est le Présent ! »**.

Vous découvrez un minibus orné du célèbre chapeau de paille géant de Monkey D. Luffy, voyageant le long de la route de Grand Line à travers des paysages mythiques (le désert d'Alabasta, les canaux de Water Seven, les îles célestes de Skypiea, les cerisiers du Pays des Wa et les neiges de Drum).

---

## ✨ Ce que vous pouvez faire sur le site

### 🚪 1. Monter à bord du bus
Cliquez sur le gros bouton jaune **« Entrer dans le bus »** pour vous asseoir à l'intérieur aux côtés des autres nakamas.
- Le bus accueille les vrais visiteurs du site en direct : chaque nouvel arrivant ajoute un passager assis !
- Lorsque de nouveaux passagers arrivent, **le bus s'allonge automatiquement** sous vos yeux pour faire de la place à tout le monde.
- Chaque passager peut ajouter un nom/pseudo et un commentaire, puis consulter les autres passagers depuis la liste à bord.

### 📺 2. Regarder la vidéo sur la télé du bus
- Avant la première montée, le lecteur est préchargé mais reste en pause.
- **Dès que vous montez dans le bus**, la télévision suspendue au plafond s'allume et lance automatiquement la vidéo de la théorie avec le son à bord.
- Vous pouvez cliquer sur l'écran pour mettre en pause ou passer en **Plein écran** à tout moment. Après être redescendu, la TV peut continuer à jouer à volume réduit et reste activable/désactivable depuis l'extérieur.

### ⚡ 3. Accélérer et ralentir le bus (Mode Boost !)
En bas à droite de l'écran, vous disposez de deux boutons pour régler la vitesse du bus :
- **⚡ Accélérer** : faites rugir le moteur et augmentez la vitesse du voyage jusqu'au mode **Turbo Boost** (le décor défile plus vite et les roues tournent à toute allure) !
- **🐢 Ralentir** : réduisez l'allure pour profiter calmement du paysage.
- **Astuce bonus** : accédez directement à `/boost` dans votre navigateur pour démarrer l'aventure à pleine vitesse !

### 🎨 4. Les 5 phrases cultes taguées sur la carrosserie
Tournez autour du bus pour admirer les cinq slogans de la théorie tagués au spray sur la carrosserie :
1. **« Le siècle oublié c'est le présent »**
2. **« Barbe Noire est Davy Jones »**
3. **« Luffy est Nika et Joy Boy »**
4. **« Les ponéglyphes viennent du futur »**
5. **« Tout est une question de timing »**

### 💡 5. Klaxonner et allumer les phares
- Cliquez sur **Klaxonner** pour faire retentir le célèbre *TUUUT !* avec rebond du chapeau de paille.
- Cliquez sur **Phares** pour allumer de puissants faisceaux lumineux.

### 🌙 6. Passer du Jour à la Nuit
Un cycle jour/nuit automatique fait voyager le bus du grand soleil jusqu'à la nuit étoilée. Vous pouvez aussi changer manuellement entre **Jour** et **Nuit** d'un simple clic sur le bouton en bas à gauche.

### 📜 7. Découvrir le dossier complet de la théorie
Cliquez sur le bouton **« 📜 La Théorie »** en haut à gauche pour ouvrir le dossier complet expliquant la thèse centrale, la vidéo du Mont Corvo et la FAQ sur l'origine du site et du convoi des Fous du Bus.

---

## 🎮 Comment naviguer sur le site ?

### Avec la souris ou au doigt (sur smartphone / tablette) :
- **Faire pivoter la vue** : cliquez et glissez pour tourner à 360° autour du minibus.
- **Zoomer / Dézoomer** : utilisez la molette de votre souris (ou écartez deux doigts sur mobile).
- **Dans le bus** : glissez votre souris pour regarder autour de vous dans la cabine, et utilisez les flèches **◀ Rangée ▶** pour vous déplacer d'avant en arrière le long de l'allée.

### Raccourcis clavier (sur ordinateur) :
- **À l’extérieur, `+` ou `Flèche Haut`** : Accélérer le bus
- **À l’extérieur, `-` ou `Flèche Bas`** : Ralentir le bus
- **À l’intérieur, flèches directionnelles** : Regarder autour de soi
- **À l’intérieur, `+` / `-`** : Zoomer / dézoomer
- **`B`** : Activer / désactiver le Turbo Boost
- **`H`** : Klaxonner (*Honk*)
- **`L`** : Allumer / éteindre les phares (*Lights*)
- **`Échap`** : Quitter le plein écran

---

## 🛠️ Pour les curieux (lancer le site sur sa machine)

Si vous souhaitez faire tourner le site en local sur votre ordinateur :

```bash
# 1. Installer exactement les versions du dépôt
npm ci

# 2. Initialiser la base D1 locale (une seule fois)
npm run db:migrate:local

# 3. Lancer le serveur local
npm run dev
```

Ouvrez ensuite [http://localhost:3000](http://localhost:3000) dans votre navigateur web préféré !

Avant de proposer une modification, vérifiez-la localement :

```bash
npm run typecheck
npm run lint
npm test
npm run build:next
```

`npm test` utilise une base D1 temporaire pour ses scénarios de places et ne
modifie pas les passagers de la base locale. Le test visuel `npm run test:ui`
nécessite que `npm run dev` tourne dans un autre terminal.

## Déploiement Cloudflare

Le rate limiting utilise un secret HMAC côté Worker. Il doit être créé une fois
avant le premier déploiement :

```bash
openssl rand -hex 32 | npx wrangler secret put RATE_LIMIT_SECRET
```

Pour les previews Cloudflare locales, copiez `.dev.vars.example` vers
`.dev.vars`, puis renseignez `RATE_LIMIT_SECRET` avec une valeur aléatoire. Le
fichier `.dev.vars` et ses variantes par environnement sont ignorés par Git.

Déployez ensuite uniquement avec la commande suivante :

```bash
npm run deploy
```

Cette commande vérifie d'abord que le secret existe sur le Worker, construit
l'application, applique les migrations D1 distantes, puis déploie le Worker. Cet
ordre évite qu'une version de l'API utilise un schéma qui n'a pas encore été
migré. Pour initialiser la base D1 locale, utilisez
`npm run db:migrate:local`.
