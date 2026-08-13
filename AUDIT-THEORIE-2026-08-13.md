# Audit éditorial — ce qu'il faut modifier sur le site

**Date** : 13/08/2026 · **Périmètre** : confrontation des sources éditoriales (`docs/sources/`) au contenu publié (`src/`).
**Méthode** : lecture intégrale de `theorie-originale.txt` (22 sections), `live.txt`, `les-dieux.txt` (43 sections), `voie-de-joyboy.txt`, transcriptions `chapitres/1180→1188` ; puis greps croisés, comparaison de corps d'articles, audit des frontmatters, des collections, des liens internes et des scripts.

**Chiffres de départ** : 110 articles (103 publiés, 7 drafts), 8 fiches chapitres, 32 pages `.astro`, 6+5+2+8 entrées dans `characters`/`locations`/`timelines`/`glossary`, `node scripts/validate.mjs` → 144 fichiers OK.

---

## Résumé exécutif

Le site est structurellement sain (validation OK, aucune image manquante, aucune image orpheline, aucun `parent` cassé). Les problèmes sont **éditoriaux** et se rangent en cinq familles :

| # | Famille | Gravité | Volume |
|---|---|---|---|
| A | Contradictions site ↔ source (le site dit l'inverse de la théorie) | 🔴 Critique | 6 points |
| B | Duplications de contenu (6 paires d'articles au corps **strictement identique**) | 🔴 Critique | 12 fichiers |
| C | Fraîcheur (2 chapitres de retard, artefacts périmés) | 🟠 Haute | 5 points |
| D | Contenu mort / trous de couverture | 🟠 Haute | ~15 points |
| E | Hygiène : métadonnées, orthographe, liens, UI/a11y | 🟡 Moyenne | ~25 points |

**Les 5 choses à faire en premier** : ① défusionner les 6 doublons (B1) — trois fiches `canon` publient actuellement un texte de thèse ; ② corriger `uranus.md` qui contredit frontalement la source (A1) ; ③ ajouter les chapitres 1189 et 1190 (C1) ; ④ requalifier en hypothèses les deux affirmations péremptoires de `theorie-complete.md` (A5) ; ⑤ décider du sort des 21 fichiers de contenu jamais chargés par aucune page (D1).

---

## A. Contradictions entre le site et les sources 🔴

Ce sont les seuls points qui rendent le site **faux par rapport à la théorie qu'il documente**.

### A1. `uranus.md` contredit la source
Le fichier affirme « Vegapunk n'a pas créé Uranus ». La transcription originale (section *Uranus*) pose exactement l'inverse : **Uranus = Imu**, et la **Mother Flame est une création de Vegapunk**, ce qui est le pivot de l'articulation Uranus / Lulusia / Egghead.
→ Réécrire la section « lecture des Fous du Bus » ; renseigner `sources` (actuellement `[]`).

### A2. Contradiction interne sur le Rio Ponéglyphe
`poneglyphes-futur.md` porte l'idée que **Robin invente la langue antique** (le texte est écrit dans le futur, donc sa langue aussi). `rio-poneglyphe.md` — la fiche de référence sur le sujet, 202 mots — ne la mentionne pas, et attribue implicitement la gravure au passé. La source dit : **taillé par Momonosuke, langue inventée par Robin**.
→ Aligner `rio-poneglyphe.md`, y ajouter Momonosuke et Robin, et croiser les `related`.

### A3. `kozuki-toki.md` traite Toki comme une gêne
La fiche présente Toki en « anomalie embarrassante » pour la théorie. Or `live.txt` en fait un **argument favorable** : si Toki peut envoyer des gens vers le futur, le principe d'un déplacement temporel est déjà canon, et rien n'interdit qu'elle-même vienne du futur.
→ Inverser le cadrage : de « objection à traiter » à « précédent canonique », en conservant la section Limites.

### A4. `chevaliers-divins.md` conclut sans son argument
La fiche affirme la coalition des 19/20 familles sans citer la **preuve par Gaban (ch. 1169-1170)**, qui est l'argument central de la source. Les chapitres 1169 et 1170 sont absents de son champ `sources`. Symétriquement, `vingt-rois.md` (200 mots) ne dit pas que **6 familles sur 20 restent inconnues** — c'est pourtant l'enjeu prédictif de la section.
→ Ajouter l'argument Gaban et le décompte 14 connues / 6 inconnues.

### A5. `theorie-complete.md` affirme deux hypothèses comme des faits
- l. 50 : « Poséidon = Shirahoshi, **qui naîtra dans 10 ans** » — la conséquence chronologique est présentée sans conditionnel.
- l. 64 : « Imu existe depuis 800 ans **grâce à l'opération du Ope Ope no Mi** » — présenté comme acquis, alors que la source pose le Ope Ope no Mi **et** la préscience comme deux pistes concurrentes. Cette phrase est **recopiée telle quelle** dans `src/content/characters/imu.md` l. 5.
→ Passer au conditionnel, mentionner la piste préscience (cf. `la-prescience-et-imu.md`), corriger la reprise dans `characters/imu.md`.

### A6. `TheoryMechanism.astro` désynchronisé du reste du site
Le composant pose 4 étapes dont l'étape 03 déclare le mécanisme de transmission **« non résolu »**. Mais `laugh-tale.md` (l. 141, 155) et `explorer/correspondances.astro` raisonnent déjà sur un déplacement/communication vers le futur, et `theorie-complete.md` l. 40 prend soin de dire « pas de boucle physique **généralisée** ». Trois cadrages coexistent.
→ Choisir une formulation canonique unique (proposition : « transmission d'information sans boucle physique généralisée ; plusieurs véhicules possibles : Ponéglyphes, préscience, déplacements ponctuels ») et la répliquer dans le composant, la page `explorer/memoire-avenir`, le glossaire et `theorie-complete`.

---

## B. Duplications de contenu 🔴

### B1. Six paires d'articles au corps **strictement identique** (`diff` vide)

| Fiche « neutre » | Article de thèse | Problème |
|---|---|---|
| `zoro.md` (`canon`) | `zoro-est-ryuma.md` | La fiche canon publie une thèse |
| `vegapunk.md` (`canon`) | `professeur-clover-et-ohara.md` | idem |
| `gol-d-roger.md` (`canon`) | `silhouette-scan-1181-roger.md` | idem |
| `siecle-oublie-present.md` | `les-bases-du-siecle-oublie.md` | doublon pur |
| `emeth-futur.md` | `emeth-robot-du-futur.md` | doublon pur |
| `vingt-rois-chevaliers-divins.md` | `coalition-des-20-rois.md` | doublon pur |

C'est le point le plus grave du site : **trois pages étiquetées `editorialStatus: canon` servent en réalité un texte d'interprétation**, ce qui casse la promesse éditoriale « fait établi / lecture des Fous du Bus » affichée partout ailleurs (badges, glossaire, chapitre 21 « quatre niveaux de lecture »).
→ Pour chaque paire : soit réécrire la fiche neutre en présentation factuelle (modèle : `nico-robin.md`, exemplaire), soit fusionner et rediriger.

### B2. `la-prescience-et-imu.md` ≈ `madame-shirley.md` (similarité 0,79)
Corps quasi identique ; seuls le résumé et le frontmatter diffèrent (`parent: imu-nerona` vs rien, `certainty: elevee` vs `moyenne`). Deux `certainty` différents pour le même texte est incohérent.
→ Fusionner, ou spécialiser réellement l'une (Shirley = fiche personnage, ch. 610) et l'autre (mécanisme de préscience appliqué à Imu, ch. 1188).

### B3. Quasi-doublons partiels à arbitrer
`davy-jones` / `davy-jones-fiche` / `barbe-noire-davy-jones` (trois entrées, dont deux contradictoires : l'une fait de Davy Jones **une lignée par le sang** dont Teach descend, l'autre **un titre** que l'Histoire donnera à Teach — la source dit *titre*, pas lignée) ; `poseidon` / `poseidon-fiche` / `shirahoshi` ; `lili-vivi-et-les-poneglyphes` / `vivi` / `nefertari-vivi` / `lili` ; `zunesha` / `zunesha-fiche` ; `pluton` / `pluton-fiche` / `pluton-water-seven-galley-la` / `galley-la-coincidence-impossible`.
→ Un dossier + une fiche par sujet, pas trois. **Trancher en priorité la contradiction Davy Jones lignée vs titre.**

---

## C. Fraîcheur 🟠

### C1. Deux chapitres de retard
Le site s'arrête au **1188** ; le manga en est au **1190** (paru le 06/08/2026), le 1191 est annoncé pour le **23/08/2026** (pause d'Obon). L'absence de 1185 est un choix documenté (`chapitres/index.astro` l. 93-99), pas un oubli — mais 1189 et 1190 manquent.
→ Créer `src/content/chapters/1189.md` et `1190.md`. À noter : `galley-la-coincidence-impossible.md` porte déjà `reviewedUntilChapter: 1190` et cite un thread `#ONEPIECE1190` — un article est donc **plus à jour que la collection de chapitres**, incohérence visible dans les badges.

### C2. Trois fiches chapitres sont vides
`1180.md`, `1181.md`, `1182.md` n'ont **aucun corps** (0 mot) — uniquement du frontmatter. Or les transcriptions disponibles font respectivement 885, **4 267** et 2 039 mots. Le 1181 est la transcription la plus riche du corpus (Loguetown, effet Koulechov, Schopenhauer, Bon Clay, l'idéologie d'Imu) et le site n'en publie rien.
→ Rédiger les corps ; au minimum le 1181.

### C3. Contenu des transcriptions jamais exploité
Termes présents dans les sources, absents partout dans `src/` : **Loguetown/Imu-Roger** (partiel), **effet Koulechov**, **Schopenhauer**, **Bon Clay (foreshadowing)**, **« 96 % des Fruits du Démon apparus en 62 ans »** (seul `fruits-du-demon.md` l'effleure), **la chute des géants qui coïncide avec l'apparition des Fruits**.
→ Ces éléments alimentent naturellement les fiches `imu-nerona`, `fruits-du-demon`, `gol-d-roger`, `geants`.

### C4. Artefacts générés périmés
`public/llms.txt` et `public/llms-full.txt` datent du 13/08 et s'arrêtent au 1188.
→ `npm run llms` après mise à jour du contenu (le script tourne sans réseau).

### C5. Promesse non tenue
La FAQ (l. 30-31) promet une mise à jour **à chaque chapitre**. Ni l'accueil ni `aide/a-propos` n'affichent d'indicateur « à jour jusqu'au chapitre X ».
→ Ajouter un badge global alimenté par `max(chapters)` ; sinon nuancer la FAQ.

---

## D. Contenu mort et trous de couverture 🟠

### D1. Quatre collections entières ne sont chargées par aucune page
`getCollection` n'est appelé que pour `articles`, `chapters` et `predictions`. Les collections **`characters` (6), `locations` (5), `timelines` (2), `glossary` (8)** — 21 fichiers — ne sont rendues **nulle part**. Elles contiennent pourtant du contenu propre (ex. `locations/elbaf.md` sur Usopp auteur du Harley, `timelines/present-boucle.md`) et référencent des articles via `articles:`/`relatedArticles:`.
Aggravant : la page `/aide/glossaire` maintient **41 entrées en dur dans le `.astro`**, en parallèle des 8 fichiers de `content/glossary` — dont **3 (`Déluge`, `Mother Flame`, `Volonté du D.`) n'existent que dans la collection non affichée**.
→ Décision binaire à prendre : exposer ces collections (et faire lire le glossaire depuis `content/glossary`), ou les supprimer. En l'état, c'est de la maintenance sur du contenu invisible.

### D2. Éléments de la théorie absents du site
| Élément (source) | État sur le site |
|---|---|
| **Doflamingo = roi démon Donquixote d'il y a 900 ans** (ch. 726) | Uniquement `theoryTimeline.ts` l. 550-552 — aucune fiche |
| **Chapeau de paille géant (ch. 908) = Emeth** | Le site l'attribue à **Joy Boy** (`imu-nerona.md`, `luffy.md`) → **contradiction** |
| **Gan Forr**, **dieu de la terre** (incarnation) | 1 mention chacun, sans développement |
| **Gaban** | `theoryTimeline.ts` l. 405 seulement |
| Haredas / Weather Node, Magellan, Sun Wukong, Louis Arnot, Oars Jr., Weatheria | Mentions isolées |

`theorie-complete.astro` (la démonstration principale en 22 chapitres) contient **0 occurrence** de ces neuf termes.

### D3. `explorer/correspondances.astro` est incomplet
6 paires seulement (modern / legendary / divine). Manquent des correspondances pourtant centrales : **Usopp → auteur du Halley**, **Robin → langue antique**, **Momonosuke → Rio Ponéglyphe**, **Franky → Emeth**, **Doflamingo → roi démon**, **Loki → Nidhogg**.

### D4. `les-dieux.txt` sous-exploité
La thèse « **les dieux ne sont pas des origines mais des conséquences** » / « **le Gouvernement mondial a créé Nika** » (dialectique historique, ch. 1106) est le fil conducteur de cette source. `dieux-one-piece.md` en donne une version affadie et **la formule clé n'apparaît nulle part** dans `src/`. De même, la piste **Dragon / Nami / Vivi comme incarnations possibles de Zaza** est absente de `zaza.md`, qui reste à 0 candidat.
→ Enrichir `dieux-one-piece.md`, `zaza.md`, `divinites-shandias.md`, `lunariens.md`, `gorosei.md`.

### D5. Prédictions sous-alimentées
5 prédictions, toutes `status: en-cours`, toutes `chapter: 1188`. Seule `luffy-joy-boy.md` remplit les champs riches (`formulatedSince`, `statusNote`, `confidence`, `source`, `indices`). La page `/chapitres/predictions` est donc quasi vide de substance alors que le schéma est prêt.
→ Compléter les 4 autres ; ajouter des prédictions vérifiables issues des sources (6 familles inconnues, dieu de la terre, Water Seven→Wano, All Blue post-Déluge).

---

## E. Hygiène 🟡

### E1. Métadonnées
- **7 drafts** en attente : `davy-jones`, `emeth-robot-du-futur`, `lili-vivi-et-les-poneglyphes`, `pluton`, `poseidon`, `zoro-est-ryuma`, `zunesha`. Ils sont déjà redirigés en 301 dans `public/_redirects` — mais **6 de leurs slugs restent liés en dur** depuis `theoryTimeline.ts` (l. 202, 297, 600, 664, 859, 953, 1097) et `theorie-complete.astro` (l. 294, 410, 531, 598, 612). Chaque clic déclenche une redirection inutile.
- **39 articles sans `editorialStatus`** ; **6 sans `certainty`** (`gol-d-roger`, `lili`, `nefertari-vivi`, `shirahoshi`, `teach`, `zoro`) ; **9 sans `sources`** et **9 avec `sources: []`** (`energie-antique`, `grand-line`, `mother-flame`, `shirahoshi`, `signification-d`, `teach`, `tequila-wolf`, `uranus`, `zoro`).
- `reviewedUntilChapter` : 105 fiches à 1188, `energie-antique` 1187, `fruits-du-demon` 1186, `galley-la-coincidence-impossible` **1190**. `modifications.md` et `theorie-complete.md` n'ont pas de valeur.
- **13 articles ont un `parent` d'une autre catégorie** (`domi-reversi`, `god-valley`, `jour-du-serment`, `la-prescience-et-imu`, `momonosuke`, `omen`, `poneglyphes-futur`, `professeur-clover-et-ohara`, `rio-poneglyphe`, `road-poneglyphes`, `shirahoshi`, `silhouette-scan-1181-roger`, `tequila-wolf`) → fil d'Ariane et sidebar incohérents.
- 62 articles ont un `parent` mais seuls 16 ont un `navigationType` : l'usage du champ est erratique.

### E2. Fiches trop courtes
17 fiches sous 220 mots, dont plusieurs sur des sujets majeurs : `shirahoshi` **114**, `teach` **115**, `gunko` 161, `energie-antique` 168, `signification-d` 174, `red-line` 199, `vingt-rois` 200, `rio-poneglyphe` 202, `road-poneglyphes` 203, `lodestar` 204, `rocks-xebec` 209, `nefertari-vivi` 217, `chevaliers-divins` / `grand-line` / `shimotsuki-ryuma` 218, `zunesha-fiche` 220.
→ Prioriser `shirahoshi`, `teach`, `rio-poneglyphe`, `vingt-rois`, `chevaliers-divins` : ce sont des nœuds de la démonstration.

### E3. Orthographe à normaliser
| Variantes | Occurrences | Décision à prendre |
|---|---|---|
| **Halley / Harley** | ~14 fichiers, titre « Harley » vs slug `elbaf-halley` | Nom japonais réellement ambigu → **choisir, documenter le choix, et faire une note** |
| **Mary Geoise / Marie Geoise / Mariejois** | 79 / 7 / 7 | Retenir « Mary Geoise » |
| **Wa no Kuni / Wano / Wano Kuni** | 78 / 30 / 7 | Retenir « Wa no Kuni » |
| **Icebarg / Iceburg** | 16 / 4 | Retenir « Icebarg » |
| `Poneglyphe` sans accent | 2 (dans `theorie-complete.astro` l. 182 et 190) | Corriger |
→ Ajouter une règle dans `scripts/validate.mjs` pour empêcher la régression.

### E4. Navigation et parcours
- `SidebarNav.astro` n'affiche que **2 niveaux** ; les petits-enfants des 62 articles à `parent` sont invisibles.
- `READING_PATH` (`src/utils/parcours.ts`) = 19 slugs, tous des fiches neutres : **aucune analyse-clé** n'est dans le parcours de lecture recommandé.
- `theorie-complete` est `sidebarHidden: true` mais reçoit **19 liens entrants** (Navbar l. 39, SidebarNav l. 80, `siteNavigation.ts` l. 119, 7 `related` d'articles, et les 4 collections mortes) : la page la plus liée du site est masquée de la navigation latérale.
- `modifications.md` (journal manuel 1180→1188, `sidebarHidden` + `searchHidden`) fait doublon avec `/chapitres/modifications` généré automatiquement par `getRecentArticleUpdates`.

### E5. UI / UX / a11y — reliquat des audits internes
Non traité depuis `AUDIT-UI-UX-A11Y-2026-FRAIS.md` (08/08) : tokens `--text-muted` / `--border` non définis · `outline:none` sur `.sidebar-filter__input` · Lightbox sans focus trap ni `role="dialog"` · ancre erronée « Gouvernement et guerre finale » sur l'accueil · lien dupliqué dans « Légende des badges » · breadcrumb faux sur `/404` et footer absent de `404.astro` · deux FAB superposés sur mobile · `aria-activedescendant` mal ciblé · iframe YouTube sans `title` FR · `R2Image` width/height facultatifs (CLS).
Depuis `ANALYSE-UI-UX-2026.md` : ancre sans `scroll-smooth` sur `/dossiers` · Manrope et Fraunces trop proches · pas de favicon SVG *(à vérifier : `public/favicon.svg` existe désormais)* · pas de preview de description sur `ArticleListItem` / `CategoryCard` · hovers uniformes · pas de page 500.

---

## Plan d'exécution suggéré

**Lot 1 — Vérité éditoriale (bloquant)** : A1 → A6, B1, B2, B3-Davy Jones.
**Lot 2 — Fraîcheur** : C1 (1189 + 1190), C2 (corps 1180-1182), C4 (`npm run llms`), C5 (badge global).
**Lot 3 — Décision structurelle** : D1 (exposer ou supprimer les 4 collections + unifier le glossaire), E4 (liens vers slugs redirigés, sidebar 3 niveaux, `READING_PATH`).
**Lot 4 — Complétude** : D2, D3, D4, D5, E2.
**Lot 5 — Hygiène** : E1, E3 (+ règle dans `scripts/validate.mjs`), E5.

> Prérequis technique : `node_modules` est absent du checkout. `node scripts/validate.mjs` fonctionne tel quel, mais `npm install` est nécessaire avant `build`, `check`, `test` et `test:e2e`.
