# Analyse des articles — conformité à la théorie, 13 août 2026

Examen des **105 articles** de `src/content/articles/` : sont-ils bien écrits, et
disent-ils la même chose que la théorie qu'ils servent ?

Complète `AUDIT-THEORIE-2026-08-13.md` (contradictions, duplications) et
`AUDIT-TECHNIQUE-2026-08-13.md` (perf, SEO, sécurité).

---

## Ce que révèle l'analyse

Le corpus est **globalement sain**. Les arbitrages de la théorie sont respectés
partout où je les ai testés : Davy Jones (clan + titre), le chapeau du chapitre
906 attribué à Emeth, « les dieux sont des conséquences, pas des origines », les
199 tirs restants du déluge, la silhouette du 726 classée en hypothèse
secondaire, les graphies Glénat. Aucune contradiction de fond entre articles.

Deux défauts réels sont ressortis, tous deux corrigés.

### 1. Trois articles se disaient à jour sans l'être

`reviewedUntilChapter: 1190` affiche au lecteur « cette page a été relue à la
lumière du chapitre 1190 ». Or les révélations de 1189 et 1190 n'apparaissaient
que dans **2 articles sur 105**, et restaient confinées aux fiches de chapitres.

Le cas le plus net : `vingt-rois.md` ne citait rien après le chapitre 1127, alors
que le 1189 **confirme sa thèse centrale**. La promesse de fraîcheur était donc
vide là où elle avait le plus de valeur.

| Article | Dernier chapitre cité | Révélation manquante |
| --- | --- | --- |
| `vingt-rois` | 1127 | Les armes des Chevaliers Divins **sont** celles des rois fondateurs (Gram → Shepherd, Longinus → Limosives), rendues aux familles et utilisables via l'*Omen* |
| `chevaliers-divins` | 1183 | Idem — « les épées d'Imu » s'avère littéral |
| `imu-nerona` | 1187 | Imu **admet** avoir pris de nombreuses coïncidences pour le destin, et avoir fait dissimuler le nom de Roger parce qu'il était un « D. » |

**Corrigé.** Les trois articles intègrent ces éléments, avec leurs `sources` mises
à jour.

Un point mérite d'être signalé, parce qu'il va contre l'intérêt immédiat de la
théorie : dans `chevaliers-divins`, j'ai écrit que le chapitre 1189 **affaiblit**
un argument existant. Si les armes des fondateurs datent du Siècle oublié, elles
relèvent de ce que le Rio Ponéglyphe est censé raconter — et la surprise de
Scopper Gaban, qui sert de preuve dans cet article, devient plus coûteuse à
expliquer. L'hypothèse reste tenable, elle n'est plus aussi économique. Un audit
qui ne relèverait que les confirmations ne servirait à rien.

### 2. Seize articles affirmaient sans jamais se contredire

C'est le vrai problème éditorial du corpus. Sur 56 articles interprétatifs,
**19 n'avaient aucune section de limites** — ils enchaînaient les arguments et
concluaient, sans jamais donner prise à l'objection.

Or c'est précisément ce qui distingue cette théorie d'une spéculation ordinaire.
Le reste du site le fait très bien : `joy-boy`, `nika`, `imu-nerona` exposent
leurs faiblesses. Les articles qui ne le faisaient pas étaient les plus
vulnérables — souvent les plus spectaculaires, comme `davy-jones` (1236 mots) ou
`lili-vivi-et-les-poneglyphes` (1134 mots), qui se terminaient sur une conclusion
affirmative sans contrepoids.

**Corrigé** : 16 articles ont reçu une section rédigée pour leur thèse propre —
pas un paragraphe générique recopié. Exemples d'objections ajoutées :

- `davy-jones` — « Davy Jones » chez Imu peut n'être qu'une insulte mythologique ;
  le découpage clan/titre n'est formulé par aucun texte.
- `deluge-all-blue` — le décompte des 199 tirs suppose trois choses non établies
  (un mètre par tir, Mother Flame réutilisable, cible à 200 m).
- `ryuma` — Ushimaru ressemble aussi à Ryuma, ce qui affaiblit l'idée d'un
  individu unique ; et le corps de Ryuma existe, daté.
- `la-prescience-et-imu` — les prédictions de Shirley **ne sont pas** infaillibles
  (elle se trompe sur l'auteur de la destruction de l'île des Hommes-Poissons),
  ce qui fragilise le modèle utilisé.
- `theorie-complete` — l'inversion explique beaucoup, « ce qui est aussi sa
  faiblesse » : une hypothèse qui absorbe tout devient difficile à réfuter.

### 3. Garde-fou automatique

`validate.mjs` refuse désormais tout article `hypothese-centrale`,
`hypothese-secondaire`, `interpretation` ou `nouvelle-piste` dépourvu de section
de limites. Comme `validate.mjs` s'exécute maintenant en tête du script `build`,
un article qui affirme sans se contredire **ne peut plus être déployé**.

J'avais aussi écrit une règle vérifiant la cohérence entre `reviewedUntilChapter`
et les `sources` citées. **Je l'ai retirée** : elle produisait 28 signalements
dont la plupart étaient légitimes — relire une page à la lumière d'un chapitre
sans avoir à la modifier est un travail réel. Une règle qui crie au loup 28 fois
finit par être désactivée.

---

## Corrigé depuis (second passage)

### 4. Dix-sept articles sans aucun lien entrant

**Rectification d'un chiffre de ce rapport.** J'avais annoncé 38 orphelins : le
compte ne portait que sur les liens en corps de texte et ignorait le champ
`related`, pourtant rendu au lecteur par `RelatedArticles.astro`. Le nombre réel
d'articles que **rien** ne référence était de **17** : `kaido`, `davy-jones`,
`lodestar`, `zou-minks`, `poseidon`, `all-blue`, `gunko`, `chambre-fleurie`,
`jour-du-serment`, `one-piece-histoire`, `tequila-wolf`, `zoro`, `grand-line`,
`blue-star`, `imu-avenir`, `road-poneglyphes`, `lili-vivi-et-les-poneglyphes`.

Tous reçoivent désormais des liens depuis les fiches qui traitent réellement du
sujet. Vérifié sur le HTML généré : 1 à 4 liens contextuels dans `<main>` par
article, hors sidebar. `validate.mjs` refuse maintenant tout article que rien ne
référence.

### 5. Un bug du validateur, révélé au passage

`parseFrontmatter` (dans `validate.mjs`) ne lisait pas les listes YAML étalées
sur plusieurs lignes — la forme utilisée par une quarantaine d'articles :

```yaml
related:
  [
    "joy-boy",
  ]
```

Leur champ `related` était donc vu comme **vide**, et les références qu'il
contenait n'étaient jamais validées. Corrigé. Cela a mis au jour trois défauts
latents : 7 fichiers avec une clé `related` **dupliquée** (la seconde écrasant
silencieusement la première), 3 listes contenant des doublons, et des références
jamais contrôlées.

### 6. Propagation des chapitres vers les articles

`scripts/impact-chapitre.mjs` (`npm run impact 1191`) liste, à la sortie d'un
chapitre, les articles à relire. Le recoupement de termes est **pondéré par leur
rareté** : un mot présent dans 90 % du corpus (« Luffy », « Ponéglyphes »,
« limites ») ne discrimine rien et est écarté. Sur le chapitre 1190, la sortie
tient en 7 pistes exploitables au lieu des 77 d'une version naïve.

Le script signale en particulier les articles dont le `reviewedUntilChapter` est
supérieur ou égal au chapitre alors qu'ils ne le citent nulle part — exactement
le défaut relevé au point 1.

---

## Points restants, non corrigés

Ils demandent un arbitrage éditorial qui vous revient.

**Dix articles canon sont très courts** (114 à 174 mots) : `gunko`, `red-line`,
`road-poneglyphes`, `rocks-xebec`, `lodestar`, `nefertari-vivi`, `grand-line`,
`blue-star`. Ce sont des fiches de référence, le format se défend ; mais à ce
volume elles apportent peu par rapport au glossaire.

**Une formulation ambiguë dans `luffy.md`** (l. 51) : « Imu conserverait une trace
matérielle du Joy Boy qu'il craint », à propos du chapeau géant. Le paragraphe
suivant corrige en attribuant le chapeau à Emeth, donc le raisonnement est juste,
mais un lecteur pressé lira une contradiction avec l'arbitrage retenu. Je ne l'ai
pas modifiée : la reformuler touche à un passage argumentatif dense, autant que
ce soit vous qui tranchiez.

**Les fiches chapitres restent des silos.** 1189 et 1190 sont bien documentés dans
`src/content/chapters/`, mais rien ne pousse leur contenu vers les articles
concernés. Le problème se reposera au chapitre 1191 (prévu le 23/08/2026). Une
piste : lister, à chaque sortie, les articles dont les `sources` recoupent les
thèmes du chapitre.

---

## Vérifications passées sans remarque

- **Arbitrages de la théorie** : tous respectés (voir plus haut).
- **Graphies figées** : aucune violation. `Chamrock` et `Ponéglyphe` remontés par
  une première passe étaient des faux positifs (graphie voulue, insensibilité à
  la casse).
- **Liens internes** : aucun lien mort, `validate.mjs` couvre les 120 fichiers.
- **Structure** : l'écart apparent à la structure canonique (92/105) est
  trompeur — le corpus utilise des variantes légitimes (« Présentation
  canonique », « Limites et objections », « Points encore à expliquer »). En
  raisonnant par rôle de section plutôt que par titre littéral, seuls les
  19 articles sans limites posaient réellement problème.
- **Statuts éditoriaux** : cohérents avec le contenu — 48 canon, 25 hypothèses
  centrales, 15 secondaires, 8 interprétations, 8 nouvelles pistes, 1 fait
  observé.
