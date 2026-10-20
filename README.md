# Les Fous du Bus

Une expérience web en 3D autour de la théorie One Piece « Le Siècle Oublié est le Présent ! ».

- Explorer le bus, monter à bord et regarder la vidéo de la théorie.
- Rejoindre les autres passagers avec un avatar et un profil.
- Choisir son personnage dès l’arrivée, avant de monter dans le bus.
- Lire le dossier de la théorie et profiter de la musique et du mode fête.
- Activer le mode immersif pour masquer les commandes, puis les retrouver avec
  le bouton « Afficher les commandes » ou Échap.

Sortir conserve la place et le profil enregistrés. « Ma place » permet de
supprimer son inscription et son profil après une confirmation distincte.

## Développement

Prérequis : Node.js 22 ou plus récent et npm.

```bash
npm ci
npm run setup:local
npm run db:migrate:local
npm run dev
```

Le site est accessible sur [localhost:3000](http://localhost:3000).

Pour modifier le code, consulter la [documentation](docs/README.md) : architecture, tests et déploiement.
