# Audit de l’interface — 5 octobre 2026

## Base vérifiée et revue de la PR

Au début de la revue, `main` local et `origin/main` pointaient sur
`55e7840c50b17a595fa70cd0ed0b960416e24b52`, sans modification locale.
La PR #3, `fix/ui-ux-bus-2026-10-02`, est restée séparée : aucune fusion ni
reprise globale. Les corrections ont été faites sur cette base `main`.

La PR ajoute 29 fichiers modifiés, dont des menus d’aide et de réglages,
un nouvel état sonore et des dépendances de test. Ces ajouts élargissent
le produit sans être nécessaires aux défauts observés. Sa mise en mémoire
du commentaire à la montée efface aussi le brouillon enregistré, car cette
réponse API omet les commentaires. Le correctif actuel conserve ce texte.
Les idées utiles de gestion du clavier, du viewport mobile et des gestes
ont été examinées individuellement et adaptées au code existant.

## Diagnostic visuel

Le bus et ses paysages donnent au site une identité claire. La multiplication
des surfaces translucides et des textes minuscules nuisait néanmoins à la
lisibilité sur des décors lumineux. La correction renforce les fonds des zones
de lecture, les libellés et l’espacement, en gardant les commandes existantes.

## Défauts observés et corrigés

12 groupes de défauts : 5 de priorité haute, 7 de priorité moyenne.

| Priorité | Défaut et conséquence | Correction |
| --- | --- | --- |
| Haute | Titre et sous-titre superposés à des paysages changeants ; titre comprimé sur tablette. | Fond bleu foncé à 95 %, texte agrandi, disposition sous le compteur entre 640 et 1023 px. |
| Haute | Onglets tronqués sur téléphone et en paysage à 667 px. | Quatre colonnes sur mobile, libellés courts jusqu’à 1024 px, hauteur minimale de 44 px. |
| Haute | Commandes intérieures trop serrées, texte et icônes dépassant des boutons. | Espacements adaptés, icônes décoratives masquées dans la rangée compacte sur téléphone, noms accessibles complets. |
| Haute | Fenêtres susceptibles de dépasser l’espace disponible avec le clavier mobile. | Hauteur et décalage issus du viewport visible, cartes à hauteur maximale et défilement interne, marges des encoches. |
| Haute | Navigation clavier incluant les éléments cachés ; restauration du focus lors d’une transition entre fenêtres. | Gestion commune du focus, exclusion des éléments invisibles/inertes, verrouillage du fond compté et retour au déclencheur visible. |
| Moyenne | Formulaire changeant de titre à la saisie ; suppression proposée sans donnée ; erreurs natives parfois en anglais. | Titre basé sur la valeur enregistrée, suppression conditionnelle, validation française associée au champ, note de visibilité pour le commentaire. |
| Moyenne | Enregistrements concurrents et fermeture du formulaire pendant une requête. | Verrou synchrone, état d’enregistrement distinct de la montée, champs et fermeture désactivés, requête annulée au démontage. |
| Moyenne | Liste occupant une grande fenêtre vide ; « 1 passagers » et métadonnées trop discrètes. | Hauteur selon le contenu, singulier correct et contraste renforcé. |
| Moyenne | Changement d’onglet effaçant la lecture et les cartes ouvertes ; fiche passager sans retour à sa liste. | Conservation du défilement par onglet et des panneaux de texte ; bouton de retour vers le manifeste chargé. Le lecteur vidéo est démonté en quittant son onglet. |
| Moyenne | Bus coupé par le cadrage portrait ; aucun retour après zoom ou regard vers le ciel. | Distance extérieure adaptée au ratio de l’écran, bouton de recentrage et conservation du zoom relatif au redimensionnement. |
| Moyenne | Pointeurs intérieurs enregistrés même sans appui, risquant de fausser un geste à deux doigts ; TV éteinte interceptant les gestes ; animation derrière les fenêtres. | Suivi des seuls pointeurs actifs, remise à zéro à la perte du geste, propriété `pointerEvents` sur le conteneur transformé de la TV, pause du rendu et du son TV pour toutes les fenêtres. |
| Moyenne | Mode sans WebGL laissant des commandes inutilisables et peu d’accès au contenu. | Commandes 3D masquées, lecture de la théorie, lien vidéo et tentative de rechargement accessibles. |

Pour le titre, le contraste calculé avec un décor entièrement blanc derrière
le fond à 95 % est de 11,32:1 pour le jaune et 16,34:1 pour le blanc.
Ce calcul porte sur ces couleurs précises ; il ne constitue pas une certification
de tous les états du site. Les préférences de réduction des animations couvrent
également le HUD et les fenêtres.

## Vérifications locales

- TypeScript, ESLint et compilation Next.js de production.
- Tests D1 sur une base temporaire, disposition TV, essuie-glaces, géométrie
  de la face avant et régressions existantes.
- Parcours navigateur sur 320×568, 393×852, 568×320, 667×375, 740×360,
  844×390, 768×1024, 1366×768 et 1920×1080 : débordements, collisions,
  cibles tactiles, centrage et libellés intérieurs.
- Onglets, position de lecture, carte ouverte, validation et sauvegarde du
  profil de test local, fermeture et retour du focus, trajet liste → fiche → liste.
- Simulation d’un appareil sans WebGL : masquage des commandes et ouverture
  du dossier depuis l’écran de repli.
- Vérification interactive du rendu sur mobile, tablette et paysage ; rotation
  à travers la TV éteinte et recentrage sur l’écran.

Le passager créé par le test navigateur est supprimé dans son nettoyage.
Les contrôles restent locaux ; aucun workflow de test GitHub n’a été ajouté.

## Suite de l’architecture

Le gestionnaire de focus partagé remplace celui dupliqué dans la théorie.
Le suivi du viewport est isolé dans `useVisualViewport.ts`. Les autres fichiers
restent dans leurs dossiers de responsabilité ; aucun nouveau menu ni système
de réglages n’est nécessaire à ces corrections.

Les mesures GPU sur appareils réels et les extractions de responsabilités
restent les pistes de l’audit technique. Cette revue UI n’établit pas une hausse
universelle des FPS. Le plafond de 60 FPS et le DPR adaptatif sont conservés.
