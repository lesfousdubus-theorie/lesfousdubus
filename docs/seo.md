# Référencement et données structurées

L’accueil présente l’expérience interactive et donne accès à la théorie dans
une modale. L’ancienne page de lecture dédiée a été supprimée et renvoie une 404.
Le chargement affiche uniquement le gouvernail animé ; un échec donne accès au
bouton de nouvelle tentative. Aucun article invisible destiné uniquement aux
moteurs n’est ajouté à l’accueil.

## Contenu de la théorie

La modale utilise `TheorySummary` et les données de `src/lib/theory-data.ts`.
Les points courts sont regroupés par thème. Les liens vers X sont conservés
sous les points concernés ; le lien vers la vidéo complète apparaît dans les
sources générales. Les incertitudes et les spoilers restent signalés.

Après une modification éditoriale, lancer `npm run content:sync` pour régénérer
`public/llms.txt` et `public/llms-full.txt` depuis ces mêmes données.
`npm run content:check` vérifie leur synchronisation ; ce contrôle fait aussi
partie de `npm run test:seo`.

## Métadonnées

L’accueil possède son adresse canonique et son image Open Graph/Twitter.
Le sitemap contient uniquement son URL. `SITE_UPDATED_AT` dans `src/lib/schema-ld.ts`
doit être actualisé lors d’une modification significative ; il ne doit pas
prendre la date de chaque requête ou compilation.
L’ancienne adresse `/sitemap-index.xml`, encore enregistrée dans Google,
redirige de façon permanente vers `/sitemap.xml`.

Les scripts JSON-LD sont placés sur la page qu’ils décrivent :

- accueil : `WebSite` et `VideoObject`, pour la vidéo disponible dans le bus
  et dans le panneau de la théorie ;
- erreur 404 : aucun article ni vidéo déclarés.

Le site ne déclare plus de balisage `Article` pour la page supprimée.

## Vidéo

`THEORY_VIDEO_UPLOAD_DATE` reprend l’horodatage fourni par les métadonnées de
[la vidéo YouTube](https://www.youtube.com/watch?v=SgJ25zjMJyo), vérifié le
24 octobre 2026 : `2026-04-10T03:00:56-07:00`, soit `2026-04-10T10:00:56Z`.
Il comprend l’heure et le fuseau attendus par le type `DateTime`.

La vidéo est attribuée à Mont Corvo. `embedUrl` pointe vers son lecteur ;
l’adresse de la page YouTube n’est pas déclarée comme `contentUrl`, propriété
réservée à un fichier vidéo directement accessible.

## Emblème du chargement

`public/images/luffy-jolly-roger.png` reprend sans retouche le fichier de
[l’emblème de l’équipage au chapeau de paille sur Seeklogo](https://seeklogo.com/vector-logo/440813/one-piece-mugiwara-flag),
[source PNG](https://images.seeklogo.com/logo-png/44/1/one-piece-mugiwara-flag-logo-png_seeklogo-440813.png).
Il est préchargé et affiché au centre du gouvernail avec un masque circulaire.
Le gouvernail tourne ; l’emblème reste droit. La préférence de réduction des
animations désactive la rotation.

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
