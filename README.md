# Les Fous du Bus

> **La mémoire de l’avenir**  
> Wiki éditorial pour la théorie des Fous du Bus sur *One Piece*.

**Statut : V1 publique en développement**  
Site : https://lesfousdubus.sbs

Le site est statique (Astro). Le contenu éditorial vit dans `src/content/`.

---

## Par où commencer

1. [Résumé en 10 points](https://lesfousdubus.sbs/theorie/resume) — ~10 min  
2. [Frise chronologique](https://lesfousdubus.sbs/theorie/chronologie) — ~10 min  
3. [Théorie complète](https://lesfousdubus.sbs/theorie/theorie-complete) — ~45 min, 22 chapitres (source éditoriale de vérité)

---

## Navigation

**Barre supérieure :** La théorie · Dossiers · Chapitres · Explorer · Aide

**Sidebar**

```
Commencer
├── Présentation
├── Résumé de la théorie
├── Théorie complète
├── Frise chronologique
└── Carte mentale

Monde et destinations
Histoire et temporalité
Figures principales
Personnages et identités
Armes antiques
Technologies et pouvoirs
Peuples, royaumes et témoins
Dieux et croyances
Transmission et mémoire
Gouvernement mondial
Guerre finale

Chapitres récents
Aide & ressources
├── À propos
├── FAQ
├── Glossaire
├── Plan du site
└── Crédits
```

Les fiches de chaque dossier sont générées depuis `src/content/articles/`.  
Une page canonique par sujet (titre = nom propre). Les analyses se rattachent via `parent`.

---

## Principes éditoriaux

- **Une page canonique par sujet.** Les thèses se développent dans des dossiers d’analyse rattachés.
- **Le texte distingue** ce que le manga établit, ce que la théorie affirme, et ce qui reste une hypothèse. Il n’y a plus de badges de certitude dans l’interface.
- **Règle de cohérence :** si une fiche contredit la théorie complète, c’est la fiche qu’il faut corriger.

---

## Analyses de chapitres

- 1180 → Imu / Omen / Mother Flame / Uranus
- 1181 → Silhouette Joy Boy-Roger + idéologie d’Imu
- 1182 → Zaza + volonté des Zoans + création des Fruits
- 1183 → Brook / Dōzan + Chevaliers Divins / Rumbar
- 1184 → Brook possible compositeur de Binks no Sake
- 1186 → Fruits du Démon + géants + Domi Reversi
- 1187 → Imu appelle Luffy Joy Boy + Luffy refuse
- 1188 → Préscience + communication entre époques
- 1189 → Arbre d’Adam + armes des Vingt Rois + Gaban
- 1190 → Gaban vs Imu + nom de Roger falsifié

**1185** : aucune transcription source (affiché explicitement dans la liste).

Prédictions suivies : `/chapitres/predictions`.

---

## Explorer

Outils déjà en place : carte mentale, frise, correspondances, Luffy / Joy Boy / Nika, Ponéglyphes, Blue Star, peuples, guerre finale, fresque d’Elbaf, Road Ponéglyphes, Pluton, Déluge / All Blue, Omen / Mother Flame / Imu.

Améliorations prévues (sans nouvelles pages) : mobile, chemin sélectionné, légendes alignées sur la théorie complète.

---

## Développement

```bash
npm install
npm run dev
npm test
npm run build
```

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur local |
| `npm test` | Tests unitaires |
| `npm run validate` | Contrôles de contenu |
| `npm run llms` | Génère `public/llms.txt` et `llms-full.txt` |
| `npm run og` | Images Open Graph |

Après chaque chapitre One Piece :

1. Créer / mettre à jour `src/content/chapters/XXXX.md` (`effect`, `themes`, `updatedArticles`)
2. Mettre à jour les articles concernés
3. Ajuster la théorie complète si nécessaire
4. Mettre à jour les prédictions
5. Régénérer `llms.txt` + rebuild

SEO : canonical, JSON-LD, RSS, sitemap Astro, Open Graph.

---

## Licence & attribution

Projet de fans non officiel.  
Théorie originale : Mont Corvo / Fous du Bus.  
Contenus *One Piece* : droits réservés à Eiichiro Oda, Shueisha et ayants droit.

Le code et les textes originaux du site sont sous licence CC0 (sauf éléments One Piece).

**Pour contribuer** : ouvrir une Issue ou une Pull Request.