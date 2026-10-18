# Test de charge isolé de l’API

Lancer depuis la racine du dépôt, avec les dépendances installées et Node.js 22 :

```bash
BUS_LOAD_OUTPUT=/tmp/fdb-api-load-results node scripts/benchmark-server-load.mjs
```

Le dossier choisi reçoit `server-load.json`. Sans `BUS_LOAD_OUTPUT`, un dossier
horodaté est créé dans le répertoire temporaire du système. Aucun serveur Next.js
existant n’est nécessaire.

Le test compile les routes `bus-entries` et `health` actuelles, puis les exécute
avec **workerd**, via la version de Miniflare déjà installée avec Wrangler. Seul
l’accès `getCloudflareContext` est adapté pour fournir les bindings de test :
les routes, les validations, les quotas, les requêtes et les triggers SQL restent
ceux du site. Une D1 locale vide reçoit toutes les migrations versionnées puis
1 000 profils synthétiques.

Les scénarios couvrent :

- des lectures du compteur, des profils, du manifeste et des fiches avec 50,
  200 puis 500 requêtes simultanées ;
- l’inscription de 500 visiteurs, les reprises concurrentes d’une même
  inscription et une charge combinant lectures, inscriptions et modifications ;
- 500 visiteurs consultant le compteur toutes les dix secondes, répartis sur
  vingt secondes, soit environ 50 requêtes par seconde ;
- le quota de 120 inscriptions par IP, avec les refus `429` et `Retry-After` ;
- les départs et la réutilisation simultanée des places libérées.

Après les mutations, le test contrôle les statistiques, les indices de siège
uniques et les places réutilisées. Le rapport indique les latences p50/p95/p99,
le débit, les codes HTTP, l’empreinte du code compilé, la machine et le résultat
du nettoyage. Une réponse inattendue ou une incohérence fait échouer le test.

Le runner ne lit ni `wrangler.jsonc` ni `.dev.vars`, n’accepte aucune URL cible
et refuse les connexions sortantes du Worker. Les adresses IP et le secret sont
synthétiques. Il crée son propre port sur `127.0.0.1` et une base identifiée
aléatoirement, puis arrête le runtime et supprime la base dans un `finally`, y
compris après une erreur ou une interruption normale.

## Interprétation

Ce test mesure le comportement local du code et de SQLite/D1 sous concurrence.
Il **ne démontre pas une capacité de production Cloudflare**, ne mesure pas les
latences réseau mondiales, le partage d’un Worker distribué, les quotas du
compte, ni le coût réel. Les handlers API sont montés directement dans un
Worker de test ; le reste de l’adaptateur OpenNext et les fichiers du site ne
sont pas chargés. Le cache CDN/navigateur est absent : chaque lecture
atteint l’API et D1, même si l’en-tête public `Cache-Control` est conservé.
La génération de charge et le runtime partagent la même machine, ce qui
influence les latences et le débit. Aucun chiffre ne concerne le rendu 3D ou
les images par seconde des téléphones.
