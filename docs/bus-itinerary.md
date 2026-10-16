# Girouette Grand Line Express

La matrice de LED déroule exactement les 28 étapes mises à jour par l'utilisateur,
de Shells Town à Laugh Tale, avec « Grand Line » entre les cycles. À chaque arrivée
sur le site, une étape est choisie au hasard et affichée depuis son premier caractère.
Le défilement continue dans l'ordre demandé, passe de Laugh Tale à Shells Town,
puis revient au point de départ choisi. Le choix reste stable pendant la visite,
y compris lors d'un recentrage ou d'un embarquement.
La liste se trouve dans `src/lib/bus-destinations.ts`.

Il s'agit de l'itinéraire choisi pour le bus, pas d'une affirmation selon laquelle
Luffy aurait déjà visité tous ces endroits. Lodestar et Laugh Tale sont inclus
comme destinations souhaitées. Les accents sont conservés dans la liste source ;
la police de LED affiche les noms en capitales sans accents.

La recherche préalable a consulté les récaps du [site officiel One Piece](https://one-piece.com/story/index.html),
notamment [Egghead et Elbaf](https://one-piece.com/story/egghead/index.html).
La liste explicite de l'utilisateur fait foi pour le panneau.

L'affichage utilise une police bitmap 5×7 sur une matrice de 72×9 points : une
seule texture, aucun éclairage supplémentaire, environ 18 mises à jour par
seconde. Avec `prefers-reduced-motion`, le nom choisi au départ reste affiché sans défilement.

L'entrée se trouve sur le côté droit, derrière l'essieu avant. La carrosserie,
les vitres, le plancher et le châssis comportent une véritable ouverture. Kamal et
Kyta sont assis côte à côte, chacun près d'un bord du pare-brise, devant le vestibule. Les
rangées commencent à Z = −1,55 m ; leurs indices et la capacité logique du bus
sont conservés.

L'embarquement dure environ dix secondes : le bus freine devant le passager,
s'arrête, ouvre les portes, déploie les marches à plat et le laisse monter puis s'asseoir. La
caméra observe depuis l'extérieur puis glisse directement jusqu'à ses yeux dès
qu'il est assis, sans refaire l'entrée par la porte. À l'intérieur, la vue démarre
à la première personne. Le bouton « Vue libre » permet d'explorer en laissant
le personnage assis ; « Revenir à ma place » ramène directement aux yeux.
La sortie
inverse cette mise en scène et dure environ treize secondes. Le personnage
conserve son apparence pendant la marche et en vue subjective ; il n'est pas
dupliqué sur son siège. Les décors et les roues partagent l'arrêt et le redémarrage.
Le mode d'animations réduites utilise une transition courte de 0,6 seconde.
