# Kamal et Kyta : références des personnages

Les personnages gardent le style carré des passagers. Les formes du visage,
les oreilles, les cheveux et les vêtements sont construits en petits volumes
simples, avec deux coiffures distinctes, le front dégagé, des yeux bleus et aucun
micro ni barbe. Le clic affiche leur réplique dans la notification du site, sans
bulle au-dessus du personnage et sans déclencher de son.

Références consultées le 9 octobre 2026 :

- Photos fournies par le propriétaire du site : portraits, Manga Club et photos
  du duo. Référence principale pour les coiffures, le tee-shirt rayé clair et la
  surchemise bleue ouverte sur un tee-shirt clair.
- [Manga Club du Mont Corvo, Konbini](https://www.konbini.com/popculture/on-vous-partage-touuus-les-mangas-cites-par-le-mont-corvo-dans-leur-manga-club/).
- [Entretien avec le Mont Corvo, LVSL](https://lvsl.fr/les-mangas-nous-aident-a-grandir-entretien-avec-le-mont-corvo/)
  et sa photo de scène, pour les profils et les volumes des coiffures.
- [Photo publiée par le Mont Corvo](https://x.com/MontCorvo_Off/status/1965452365483704728),
  pour comparer les coiffures sur une autre photo du duo.

Les photos servent à guider les volumes et les couleurs ; les modèles restent
une interprétation stylisée. Les poses de conducteur et de navigateur ainsi que
les interactions sont conservées. `DriverAppearance.tsx` rassemble les visages et
les vêtements ; `BusDrivers.tsx` gère les poses, animations et répliques.

Kamal et son fauteuil sont reculés de 22 cm pour dégager le volant du torse
et des genoux. Ses mains suivent deux articulations de longueur fixe et tiennent
la jante inclinée. Les deux guides ont des mains carrées de mêmes proportions
que les autres passagers, sans doigts ni manchettes blanches ajoutées.
Kyta garde sa place devant la porte ; ses mains
reposent sur la barre jaune, espacées de 40 cm, avec la carte sur les genoux.
Le Log Pose reste au poignet. `driver-arms.ts` partage ces positions avec les
fauteuils, la barre et les contrôles de contact pendant le klaxon et la fête.

FoudubusTV occupe le fauteuil derrière Kamal, face à la télévision, comme membre
permanent chargé du relais de la théorie sur X / Twitter. Son
[profil public](https://x.com/FoudubusTV_), consulté le 12 octobre 2026, affiche
une pièce de puzzle blanche avec un chapeau de paille. `BusRelayPassenger.tsx`
reprend cet avatar en volume, sur une tenue bleue, avec un téléphone et son nom.
Le clic rappelle son rôle ; la liste de l'équipage donne accès à son compte.
Il n'est pas inscrit comme visiteur et ne prend pas une place dans la base.

Les faces regardent vers **-Z**. Les iris, pupilles et reflets doivent être
progressivement plus avancés dans ce sens pour éviter qu'une couche en masque
une autre. Les vêtements évitent les faces coplanaires. La réduction des
animations désactive les mouvements décoratifs des deux personnages.
