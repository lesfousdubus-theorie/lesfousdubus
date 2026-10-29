# Référencement et données structurées

L’accueil présente l’expérience interactive ; `/theorie` contient la lecture
complète rendue sur le serveur, accessible sans JavaScript. Le panneau de théorie
propose un vrai lien vers cette page. Le chargement affiche uniquement le
gouvernail animé ; un échec donne accès au bouton de nouvelle tentative. Aucun article
invisible destiné uniquement aux moteurs n’est ajouté à l’accueil.

## Contenu de la théorie

La modale et `/theorie` utilisent le même composant `TheorySummary` et les données
de `src/lib/theory-data.ts`. Les points courts sont regroupés par thème ; les
références détaillées restent dans les liens d’approfondissement. Les pistes de
FoudubusTV sont attribuées, avec leurs incertitudes et les spoilers signalés.

Après une modification éditoriale, lancer `npm run content:sync` pour régénérer
`public/llms.txt` et `public/llms-full.txt` depuis ces mêmes données.
`npm run content:check` vérifie leur synchronisation ; ce contrôle fait aussi
partie de `npm run test:seo`.

## Métadonnées

Les deux pages possèdent leur propre adresse canonique. La page de lecture
définit aussi son titre, sa description et son image Open Graph/Twitter.
Le sitemap contient les deux URL. `SITE_UPDATED_AT` dans `src/lib/schema-ld.ts`
doit être actualisé lors d’une modification significative ; il ne doit pas
prendre la date de chaque requête ou compilation.
L’ancienne adresse `/sitemap-index.xml`, encore enregistrée dans Google,
redirige de façon permanente vers `/sitemap.xml`.

Les scripts JSON-LD sont placés sur la page qu’ils décrivent :

- accueil : `WebSite` et `VideoObject`, pour la vidéo disponible dans le bus
  et dans le panneau de la théorie ;
- `/theorie` : `Article`, avec cette URL comme `mainEntityOfPage` ;
- erreur 404 : aucun article ni vidéo déclarés.

Le 26 mai 2024 correspond à la première vidéo de la théorie, pas à la
publication de l’article de ce site. La date de publication de l’article
n’est pas déclarée faute d’horodatage public vérifié.

## Vidéo

`THEORY_VIDEO_UPLOAD_DATE` reprend l’horodatage fourni par les métadonnées de
[la vidéo YouTube](https://www.youtube.com/watch?v=SgJ25zjMJyo), vérifié le
24 octobre 2026 : `2026-04-10T03:00:56-07:00`, soit `2026-04-10T10:00:56Z`.
Il comprend l’heure et le fuseau attendus par le type `DateTime`.

La vidéo est attribuée à Mont Corvo. `embedUrl` pointe vers son lecteur ;
l’adresse de la page YouTube n’est pas déclarée comme `contentUrl`, propriété
réservée à un fichier vidéo directement accessible. La page de lecture n’intègre
pas de lecteur et n’annonce donc pas de `VideoObject`.

## Validation

`npm run test:seo` contrôle les données et la redirection du point d’entrée
Worker. Avec `BASE_URL`, il contrôle les réponses réellement servies, sans
inscrire de passager. Le serveur de production et le paquet Cloudflare doivent
être reconstruits après les changements.

Après publication, vérifier les réponses publiques puis lancer la validation
des deux avertissements `uploadDate` dans la Search Console. L’état « validation
commencée » ne signifie pas que Google a terminé sa nouvelle exploration.
L’indexation des vidéos et la validité de leur balisage sont deux rapports
distincts : un élément valide ne garantit pas une présence dans les résultats
vidéo, ni une position dans les résultats de recherche.

Références : [données vidéo Google](https://developers.google.com/search/docs/appearance/structured-data/video),
[sitemaps Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[point d’entrée OpenNext personnalisé](https://opennext.js.org/cloudflare/howtos/custom-worker).
