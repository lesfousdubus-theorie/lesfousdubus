# Validation mobile sur appareil

Les contrôles émulés sont reproductibles dans Chromium ; ils ne remplacent pas
Safari sur iPhone ni un Android physique. Au 18 octobre 2026, aucun téléphone
n’était connecté à cet environnement de travail. La chauffe, l’autonomie et la
fluidité sur appareil restent donc à mesurer.

Sur la version publiée correspondant au commit à vérifier, ouvrir une nouvelle
session sur Safari iPhone puis Chrome Android, idéalement sur un appareil de
milieu de gamme. Noter le modèle, le système, le navigateur, le réseau et le
commit. Désactiver le cache pour le premier passage seulement.

1. En réseau mobile, vérifier que « Lire la théorie » est accessible pendant
   l’attente. Ouvrir le lien : les 21 sections et les questions doivent être
   lisibles. Avec JavaScript désactivé, cette page doit encore fonctionner.
2. Entrer dans le bus. Vérifier que la télé attend l’arrivée en première personne,
   que la musique de fond se coupe à la lecture, puis reprend progressivement à
   la pause. Refaire après une sortie et une nouvelle entrée.
3. Lancer la fête : les danses commencent à huit secondes, s’arrêtent au retour
   au début de la musique et reprennent à huit secondes. Arrêter la fête, tester
   le volume et recharger pour vérifier sa mémorisation.
4. Ouvrir « Aide », figer le défilement, fermer : décor stable, télévision active,
   entrée et sortie encore possibles. Explorer, revenir à sa place, pincer pour
   zoomer, tourner le téléphone. Vérifier les commandes en portrait et paysage.
5. Garder le bus ouvert dix minutes, avec plusieurs entrées, fêtes et lectures.
   Relever les freezes, pertes de contexte graphique, consommation mémoire et
   chauffe. Passer un moment dans un autre onglet puis revenir : le site doit
   reprendre et les lecteurs retrouver un état cohérent.
6. Bloquer une requête du moteur 3D ou couper le réseau pendant un chargement
   neuf : vérifier le message et le lien de lecture, puis rétablir le réseau et
   utiliser « Réessayer le chargement ».

Conserver les observations et les éventuelles erreurs, sans assimiler le nombre
d’images par seconde d’un rendu logiciel sur ordinateur à celui du téléphone.
