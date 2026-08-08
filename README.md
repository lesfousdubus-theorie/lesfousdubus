# Les Fous du Bus

> **Le Siècle oublié est le présent**  
> Wiki éditorial pour la théorie des Fous du Bus sur *One Piece*.

**Statut : V1 publique en développement**  
Site déployé et largement construit : https://lesfousdubus.sbs

---

## Navigation réelle du site

- **Commencer**
  - Présentation
  - Résumé de la théorie
  - Théorie complète (22 chapitres)
  - Carte mentale
  - Lexique essentiel

- **Monde et destinations**
- **Histoire, temps et Ponéglyphes**
- **Figures principales**
- **Personnages et identités**
- **Armes antiques**
- **Technologies et pouvoirs**
- **Peuples, royaumes et témoins**
- **Dieux et croyances**
- **Transmission et mémoire**
- **Gouvernement mondial**
- **Guerre finale**

- **Chapitres récents**
  - Analyses chapitre par chapitre

- **Explorer**
  - Carte mentale, Chronologie, Graphe des correspondances, etc.

- **Aide**
  - À propos, FAQ, Glossaire, Crédits

---

## Architecture actuelle de la sidebar (structure cible)

```
Commencer
├── Présentation
├── Résumé de la théorie
├── Théorie complète
├── Carte mentale
└── Lexique essentiel

Monde et destinations
Histoire, temps et Ponéglyphes
Figures principales
Personnages et identités
├── ... 
├── Princesse Shirahoshi
└── Rocks D. Xebec
Armes antiques
Technologies et pouvoirs
Peuples, royaumes et témoins
Dieux et croyances
├── ...
└── ↳ Voir Nika   (lien contextuel)
Transmission et mémoire
Gouvernement mondial
├── ...
├── Chevaliers Divins
└── ...
Guerre finale

Chapitres récents
Aide
```

**Ajustements seulement** (pas de refonte) :
- + Princesse Shirahoshi
- + Rocks D. Xebec
- + Chevaliers Divins
- (éventuellement + Gunko)

Nika n’apparaît qu’une fois en tant que fiche principale (Figures principales). Un lien « ↳ Voir Nika » est ajouté dans Dieux et croyances pour éviter le doublon visuel.

---

## Principes éditoriaux

- **Une page canonique par sujet** : chaque sujet possède une fiche neutre (intitulé = nom propre). Les thèses de la théorie sont développées dans des dossiers d’analyse rattachés (`parent`).
- **Système de niveau de certitude** : badges CANON / NOYAU DE LA THÉORIE / CONSÉQUENCE DE LA THÉORIE / HYPOTHÈSE / HYPOTHÈSE RÉCENTE / RÉFUTÉ.
- **Distinction claire** : Ce que le manga établit ≠ Interprétation ≠ Hypothèse des Fous du Bus.

---

## 22 chapitres de la théorie complète

La page **Théorie complète** est la source éditoriale de vérité (22 chapitres).

Parcours alternatif : 19 dossiers (encyclopédique fiche par fiche).

---

## Analyses de chapitres disponibles

- 1180 → Imu / Omen / Mother Flame / Uranus
- 1181 → Silhouette Joy Boy-Roger + idéologie d’Imu
- 1182 → Zaza + volonté des Zoans + création des Fruits
- 1183 → Brook / Dōzan + Chevaliers Divins / Rumbar
- 1184 → Brook possible compositeur de Binks no Sake
- 1186 → Fruits du Démon (apparition récente) + géants + Domi Reversi
- 1187 → Imu appelle Luffy Joy Boy + Luffy refuse + Joy Boy = conséquence
- 1188 → Préscience + communication entre époques + Roger / Joy Boy + Joy Boy n’est pas un titre

**1185** : aucune transcription source disponible (géré explicitement).

---

## Explorer — outils déjà disponibles

- Carte mentale
- Chronologie (La mémoire de l’avenir)
- Graphe des correspondances (« Qui est qui ? »)
- Comparaison Luffy / Joy Boy / Nika
- Schéma des Ponéglyphes
- Carte Blue Star
- Peuples et missions
- Guerre finale (schéma)
- Fresque d’Elbaf
- Double chronologie
- Road Ponéglyphes / temps
- Pluton
- Déluge / Red Line / All Blue
- Omen / Mother Flame / Imu

**Améliorations prévues** (pas de nouvelles pages) :
- nœuds cliquables
- légende Canon / Théorie / Spéculation
- meilleure version mobile
- chemin sélectionné mis en surbrillance
- explication inline
- version HTML lisible sans JS
- terminologie alignée sur la théorie complète

---

## Fonctionnalités restantes (P2+)

- Standardisation complète de toutes les fiches (même architecture)
- Passe « CANON » exhaustive sur chaque section « Ce que le manga établit »
- Provenance précise des sources dans chaque article
- Amélioration des outils Explorer (sans en créer de nouveaux)
- Refonte légère de la page Prédictions (formulaires + statut + indices)
- Mise à jour systématique via les chapitres (théorie complète = source unique)

---

## SEO / robots / llms

- `public/llms.txt` et `llms-full.txt` générés automatiquement (`npm run llms`)
- Balises de nature (canon, core-theory, secondary-theory, speculative)
- Open Graph images générées
- Robots et sitemap gérés via Astro

---

## Processus de mise à jour après chaque chapitre

1. Créer / mettre à jour la fiche dans `src/content/chapters/XXXX.md`
2. Renseigner `effect`, `themes`, `updatedArticles`
3. Mettre à jour les articles concernés
4. Ajuster la théorie complète si nécessaire
5. Mettre à jour les prédictions
6. Régénérer `llms.txt` + rebuild

**Règle** : quand une fiche contredit la théorie complète, c’est la fiche qu’il faut corriger.

---

## Licence & attribution

Projet de fans non officiel.  
Théorie originale : Mont Corvo / Fous du Bus.  
Contenus *One Piece* : droits réservés à Eiichiro Oda, Shueisha et ayants droit.

Le code et les textes originaux du site sont sous licence CC0 (sauf éléments One Piece).

---

**Pour contribuer** : ouvrir une Issue ou Pull Request.  
Le site est statique (Astro). Tout le contenu éditorial vit dans `src/content/`.