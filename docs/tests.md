# Vérifications du projet

Les commandes ci-dessous sont manuelles. Aucun workflow de tests ou de déploiement
GitHub n’est versionné ; `npm run deploy` ne remplace pas ces vérifications.

## Compilation et régressions

```bash
npm run lint
npm test
npm run build:next
npm run typecheck
```

`npm test` couvre la configuration locale idempotente, le contrat audio typé,
les places et migrations D1, la géométrie, les rigs, les mouvements, les trajets,
les autorisations de modération et les régressions statiques. Les tests D1 créent
leur propre stockage temporaire ; ils ne migrent ni la base locale courante ni
la base distante. `npm run test:crew` limite l’exécution aux personnages et à
l’occupation. `npm run build` construit aussi l’adaptateur Cloudflare, sans
déployer ; `npm run build:next` vérifie l’application Next.js seule.

Les tests de contrat audio vérifient l’ordre des priorités, les payloads et la
distribution synchrone entre racines, ainsi que le nettoyage des abonnements.
Les tests d’autorisation exécutent les véritables handlers dans workerd :
modération activée, absente, trop faible ou configurée avec la clé des quotas,
suppression personnelle et limites IP/visiteur inchangées.

## Navigateur

Installer Chrome ou Chromium séparément ; npm ne télécharge pas le navigateur.
Les scripts attendent `/usr/bin/google-chrome` par défaut. Définir `CHROME_PATH`
si nécessaire. Les exemples de variables ci-dessous utilisent Bash ; adapter
la syntaxe d’environnement au terminal utilisé.

Dans un premier terminal, après `npm run setup:local` et les migrations locales :

```bash
npm run build:next
npm run start
```

Dans un second terminal :

```bash
# Remplacer le chemin si nécessaire
CHROME_PATH=/usr/bin/chromium npm run test:ui
CHROME_PATH=/usr/bin/chromium npm run test:comfort
```

`test:ui` peut également utiliser le serveur `npm run dev`, mais les mesures de
chargement doivent utiliser une compilation de production. `test:comfort`
exige cette compilation dans `.next/` et le serveur correspondant, car il bloque
volontairement un de ses vrais chunks pour vérifier la récupération.

Variables prises en charge :

| Variable | Usage |
| --- | --- |
| `BASE_URL` | Serveur local de test, par défaut `http://localhost:3000`. Ne pas cibler le site public avec la suite générale. |
| `CHROME_PATH` | Chemin de l’exécutable Chrome/Chromium, y compris avec espaces si correctement cité. |
| `CDP_PORT` | Port de débogage à libérer avant exécution : 9222 pour `test:ui`, 9444 pour `test:comfort` par défaut. |
| `BUS_VISUAL_OUTPUT` | Répertoire des captures des scénarios qui les produisent ; `test:comfort` utilise `/tmp/lesfousdubus-comfort` par défaut. |
| `BUS_CAMERA_CHECKS` | Scénario ciblé de `test:ui`, listé ci-dessous. |

La suite générale `test:ui` utilise un profil de navigateur neuf et crée une
inscription locale temporaire pour certains parcours, supprimée dans le
nettoyage. Une interruption brutale peut laisser ce profil dans la base locale :
utiliser une base de test, sans données personnelles à préserver. Les scènes
à fixtures remplacent les requêtes dans le navigateur avant la navigation.
`test:comfort` utilise exclusivement des visiteurs et lecteurs simulés.

## Scénarios ciblés

Exemple : `BUS_CAMERA_CHECKS=party npm run test:ui`.

| Valeur | Contrôles |
| --- | --- |
| Aucune | Enchaîne `camera`, `characters` puis `ui` dans trois processus Chrome neufs, pour libérer les ressources WebGL entre ces contrôles. |
| `camera` | Gestes, zoom, cadrage, portes, embarquement, sortie et LED. |
| `ui` | Parcours responsive, profils, fenêtres, médias et repli sans WebGL, sans rejouer la longue inspection caméra/personnages. |
| `crew-seats` | Populations de 0, 2, 4 et 60 visiteurs, banquettes, vrais occupants, rangées, manifeste et espaces devant les télés. |
| `extensions` | Portes des longues cabines, chemin vers la porte proche et expressions des personnages. |
| `hands` | Mains des guides, supports et tableau de bord. |
| `door-confetti` | Raccords de porte et couverture des confettis. |
| `party` | Fête, réactions individuelles, seuil de huit secondes, boucles, reprise audio, erreurs et animations réduites. |
| `playback-zoom` | Dézoom/rezoom souris/tactile, bande de carrosserie et commandes médias pendant les trajets. |
| `door-music` | Porte, volume initial et mémorisé, tampon et erreurs de lecture. |
| `led` | Liste et départ aléatoire des destinations, animation réduite. |
| `characters` | Vérifications visuelles ciblées des personnages. |
| `performance` | Court échantillon de rendu et résolution adaptative ; aucune garantie de fluidité physique. |
| `music-live` | Diagnostic facultatif avec la vraie API YouTube, soumis à sa disponibilité. |

Pour les lecteurs réels en local, utiliser `localhost` : des vérifications
antérieures sur `127.0.0.1` ont reçu des refus de YouTube. Ne pas assimiler un
lecteur simulé à un test d’autoplay ou de disponibilité des médias réels.

## Portée des résultats

Le transport CDP, les délais et les assertions navigateur sont partagés dans
`scripts/browser-helpers.mjs` par les suites UI et confort.

Les tests exécutent des calculs et géométries réels, ainsi que des parcours dans
le navigateur. Certaines régressions statiques inspectent encore le code et les
outils 3D observent des fibres React privées dans leurs pages isolées. Ils sont
sensibles aux refactors et mises à jour : confirmer les comportements avant
d’adapter ces assertions, sans ajouter d’API de débogage au produit.

Le [test de charge isolé](test-charge-local.md) fournit des latences API locales,
sans CDN ni preuve de capacité Cloudflare. Le [protocole mobile](validation-mobile.md)
définit les essais sur appareil, chauffe et longue session qui complètent
l’émulation et le rendu logiciel. Un plafond de 60 images/s n’est pas une mesure
de 60 images/s réellement atteintes.
