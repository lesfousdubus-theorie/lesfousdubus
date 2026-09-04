# 🏴‍☠️ Les Fous du Bus · Grand Line Express

Application 3D immersive Next.js / Three.js célébrant la théorie One Piece des Fous du Bus.

## 🚌 Fonctionnalités

- **Bus 3D temps réel & Chapeau de Luffy** : Combi bleu arborant le chapeau de paille emblématique de Luffy modélisé selon des proportions Mugiwara fidèles (calotte bulbeuse, ruban écarlate, bord évasé).
- **Passagers assis 3D & Allongement procédural** : Le bus démarre vide (0 passager) et accueille un nouveau passager assis (archétypes d'équipage One Piece) à chaque montée d'utilisateur, s'allongeant automatiquement au fur et à mesure que les rangées se remplissent.
- **Télévision 3D & Synchronisation Plein Écran** : Écran suspendu dans le couloir (répliqué toutes les 5 rangées quand le bus est long) diffusant la vidéo YouTube avec contrôles épurés, synchro temporelle bidirectionnelle en plein écran et son spatialisé de loin lorsque l'on sort du bus.
- **Cycle Jour / Nuit & Phares automatiques** : Défilement des royaumes de Grand Line (Alabasta, Water Seven, Skypiea, Pays des Wa, Île de Drum) avec allumage automatique des phares volumétriques la nuit et contrôle manuel.
- **Persistance réelle** : Compteur de passagers persisté via PostgreSQL / Drizzle ORM avec incrément unitaire strict à chaque montée.

## 🚀 Démarrage

```bash
# Installation des dépendances
npm install

# Lancer en développement
npm run dev

# Vérification TypeScript & Linter
npm run typecheck
npm run lint

# Build de production
npm run build
```

## 🛠️ Stack technique

- **Framework** : Next.js (App Router, Turbopack)
- **3D & Rendu** : Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei`
- **Styles** : Tailwind CSS
- **Base de données** : Drizzle ORM, PostgreSQL
