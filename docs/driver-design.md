# Kamal et Kyta : références des personnages

Les personnages gardent le style carré des passagers. Les formes du visage,
les oreilles, les cheveux et les vêtements sont construits en petits volumes
simples, avec deux coiffures distinctes, le front dégagé, des yeux bleus et aucun
micro ni barbe. Le clic affiche leur réplique sans déclencher de son.

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

Les faces regardent vers **-Z**. Les iris, pupilles et reflets doivent être
progressivement plus avancés dans ce sens pour éviter qu'une couche en masque
une autre. Les vêtements évitent les faces coplanaires. La réduction des
animations désactive les mouvements décoratifs des deux personnages.
