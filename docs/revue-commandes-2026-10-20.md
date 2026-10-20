# Revue des commandes — 20 octobre 2026

## Conclusion

L’interface est utilisable sur ordinateur, mais elle présente trop de commandes
de même importance en permanence. Sur téléphone, la superposition de groupes en
haut et en bas réduit fortement la place laissée au bus. Réduire la taille des
boutons aggraverait leur utilisation : il faut surtout choisir ce qui reste
visible et regrouper le reste.

Le choix du personnage est maintenant accessible avant la montée. Ce choix
reste local tant que l’utilisateur ne monte pas : il ne crée pas d’inscription,
survit au rechargement et accompagne ensuite l’embarquement. Sur téléphone, le
mode immersif conserve une cible de 44 px avec son pictogramme, son nom
accessible et son infobulle ; son libellé reste affiché sur les écrans larges.

## Méthode et limites

Comparaison du site publié au commit `1a2f878` et de la correction locale,
avec une scène 3D réelle et des réponses API et YouTube simulées. Aucun
passager de test n’a été inscrit dans la base publique. Relevés après
stabilisation à 1440 × 900, 393 × 852, 320 × 568 et 667 × 375, dehors,
à bord et en vue libre.

Le nombre de boutons inclut les boutons désactivés encore visibles. Il ne
représente pas autant de tâches distinctes : accélérer et ralentir sont deux
cibles, par exemple. Les surfaces mesurées sont l’union des rectangles des
groupes d’interface, limitée à l’écran. Elles incluent les espaces internes
aux groupes et ne mesurent pas des pixels opaques. Ce diagnostic de mise en
page ne remplace pas des observations d’utilisateurs.

La version publiée avant cette correction affichait 15 boutons dehors et
23 à bord. L’accès permanent au personnage porte l’accueil à 16 boutons.

Mesures à bord, après cette correction :

| Écran | Boutons visibles | Surface des groupes | Bande centrale entre les groupes du haut et du bas |
| --- | ---: | ---: | ---: |
| Ordinateur 1440 × 900 | 23 | 15,7 % | 586 px |
| Téléphone 393 × 852 | 23 | 37,6 % | 390 px |
| Petit téléphone 320 × 568 | 23 | 58,6 % | 106 px |
| Téléphone paysage 667 × 375 | 23 | 44,0 % | 86 px |

La bande centrale est une mesure de hauteur libre entre les groupes ; elle
ne signifie pas que toute la scène hors de cette bande est cachée.

Dehors, après la correction, ces surfaces sont respectivement de 12,1 %,
34,8 %, 57,5 % et 41,5 %. Sur petit téléphone en portrait, le personnage et
le mode immersif tiennent avec la théorie sur une seule ligne d’actions.
En paysage, l’ajout du personnage impose une ligne supplémentaire dans le
groupe supérieur : c’est une raison de prioriser le regroupement proposé.

## Problèmes et priorités

1. **Accueil et personnage.** Le bouton était conditionné à la présence à bord.
   Son ouverture avant la montée aurait également inscrit un visiteur sans
   séparation du brouillon local. Ces deux points sont corrigés ensemble.
2. **Hiérarchie à bord.** « Sortir » est la grande action jaune, alors que la TV
   est un petit bouton mêlé aux commandes de phares et de klaxon. La découverte
   de la théorie et l’exploration méritent davantage de présence que la sortie.
3. **Profil dispersé.** Personnage et gestion de place sont en haut ; prénom et
   commentaire en bas. Un même ensemble « Mon profil » doit réunir ces éléments.
4. **Musique fragmentée.** Lecture, détails/progression et volume occupent trois
   accès. Conserver un bouton de lecture immédiat, accompagné d’un accès aux
   détails et au volume dans le même panneau audio.
5. **Réglages constamment présents.** Jour/nuit, phares, vitesse, klaxon et fête
   prennent de la place pendant toute la visite. Un panneau « Commandes » permet
   de les rendre disponibles sans leur donner la même importance que l’entrée.
   Leur fréquence réelle d’usage reste à vérifier auprès des visiteurs.
6. **Ambiguïté de « Ma place ».** L’un des accès gère l’inscription ; l’autre,
   en vue libre, remet la caméra au siège. Utiliser « Mon profil » pour la gestion
   et « Revenir à mon siège » pour la caméra.
7. **Commandes contextuelles.** Les flèches de rangée restent visibles mais
   désactivées en vue libre. Les masquer dans ce mode et afficher le retour au
   siège à proximité des commandes de vue.
8. **Informations secondaires.** L’ancienneté de la théorie a presque le même
   poids que les passagers et répète le mot « théorie ». Placer la date et le
   compteur détaillé dans les informations de la théorie.
9. **Accès clavier.** Le bouton d’entrée arrive tard dans l’ordre des commandes
   du document. Faire suivre le focus à la hiérarchie des actions et conserver
   des indicateurs de focus visibles.

## Organisation proposée

Sur téléphone, garder une barre inférieure à quatre entrées :

| État | Action principale | Personnage et profil | Audio | Réglages |
| --- | --- | --- | --- | --- |
| Dehors | Entrer | Personnage | Musique | Commandes |
| À bord | TV | Mon profil, ouvert sur le personnage | Musique | Commandes |

En haut : deux accès compacts, « La théorie » et « Passagers ». Environ six
points d’entrée permanents constituent ici une cible de conception, pas une
limite universelle. La silhouette du bus et la télévision doivent rester les
éléments visuels dominants.

| Panneau | Contenu |
| --- | --- |
| Personnage / Mon profil | Aperçu et choix du personnage en premier, prénom, commentaire, gestion de place et suppression confirmée |
| Musique | Lecture directe depuis la barre ; titre, progression et volume à l’ouverture des détails |
| Commandes — Vue | Vue libre, retour au siège ou recentrage selon l’état, mode immersif, pause du décor |
| Commandes — Bus et ambiance | Jour/nuit/automatique, phares, vitesse, klaxon et fête |
| Commandes — Sortie | Sortir du bus, avec rappel que l’inscription est conservée |
| La théorie | Dossier, vidéo d’origine, date et ancienneté |

Le panneau Commandes doit rester simple, sans sous-menus en cascade. Il ne
doit pas figer la scène lorsqu’on utilise le klaxon, les phares ou la fête :
on doit voir et entendre l’effet. Une action ponctuelle peut fermer le panneau
pour libérer la vue. Les flèches de rangée peuvent apparaître temporairement
pendant la navigation assise.

Sur ordinateur, conserver la même organisation logique avec davantage de
commandes exposées si l’espace le permet : profil en haut, audio dans un groupe
cohérent, actions liées à la visite en bas et ambiance dans un panneau dédié.
Le regroupement sert autant la compréhension que le gain de surface.

## À préserver

- L’entrée jaune est claire et doit rester immédiatement identifiable dehors.
- Les cibles d’environ 44 px sont adaptées au tactile ; ne pas les rétrécir.
- La musique doit démarrer par un clic direct, avec préparation dès l’arrivée.
- Le choix du personnage doit rester accessible avant et après la montée.
- La sortie ordinaire et la suppression de l’inscription doivent rester distinctes.
- Le mode immersif doit rester facile à quitter et compléter une interface
  normale plus calme.
- Conserver l’identité bleue et jaune et le caractère ludique du bus, en donnant
  moins de poids visuel aux réglages secondaires.

## Périmètre livré

Cette correction rend le personnage accessible dès l’arrivée et adapte son
enregistrement à ce parcours. Elle compacte légèrement les accès du haut sur
mobile pour absorber ce nouvel accès. La réorganisation générale décrite ici
est une proposition ; les panneaux et la nouvelle barre n’ont pas été implémentés.
