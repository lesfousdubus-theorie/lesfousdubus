/**
 * Données encyclopédiques de la Théorie des Fous du Bus.
 * Utilisées pour le rendu SSR sémantique (SEO) et le lecteur modal interactif.
 */

export interface FAQItem {
  question: string;
  answer: string;
}

export const CENTRAL_THESIS = {
  title: "Le Siècle Oublié est le Présent",
  subtitle: "Depuis le premier chapitre, Luffy et ses compagnons vivraient l’histoire que les Ponéglyphes attribuent au Siècle Oublié.",
  overview:
    "Dans la lecture du Mont Corvo, les récits considérés comme des vestiges du passé décriraient en réalité le présent et l’avenir des personnages. Luffy serait Joy Boy et Nika, Vivi serait Lili, Zoro serait Ryuma et Barbe Noire deviendrait Davy D. Jones. Les Ponéglyphes transmettraient cette histoire depuis le futur. Laugh Tale serait Roadstar dans le futur, et Roger aurait voyagé jusqu’à cette autre époque. La vidéo laisse ouverte la mécanique exacte reliant cette histoire aux traces du passé.",
  mangaReadings: [
    {
      author: "Gol D. Roger",
      chapter: "Chapitres 967–968",
      text: "Roger découvre le trésor de Joy Boy, rit et regrette de ne pas avoir vécu à son époque. Son équipage constate ensuite être arrivé trop tôt.",
      relevance: "La théorie relit cette avance comme un indice sur une histoire encore à venir.",
    },
    {
      author: "Silvers Rayleigh",
      chapter: "Chapitre 507",
      text: "Rayleigh affirme que l’équipage de Roger connaît l’histoire et invite Robin à poursuivre son voyage : sa conclusion pourrait être différente de la leur.",
      relevance: "Le Mont Corvo rapproche ce dialogue de la différence entre connaître l’histoire et la vivre.",
    },
    {
      author: "Docteur Vegapunk",
      chapter: "Chapitre 1113",
      text: "Vegapunk annonce que le monde va sombrer dans l’océan.",
      relevance: "La théorie rattache cette annonce au Déluge qu’elle situe dans la guerre à venir.",
    },
  ],
};

export const CORE_PILLARS = [
  {
    icon: "⌛",
    title: "Laugh Tale n'existe pas encore",
    subtitle: "Une coordonnée temporelle, non spatiale",
    description:
      "Laugh Tale serait Roadstar dans le futur. Les Road Ponéglyphes permettraient d’atteindre le bon lieu à la bonne époque ; Roger aurait voyagé vers ce futur, où Red Line aurait disparu et où All Blue existerait.",
  },
  {
    icon: "📜",
    title: "Les Ponéglyphes : mémoire de l'avenir",
    subtitle: "Des stèles forgées dans le futur",
    description:
      "Robin écrirait le récit, Momonosuke le graverait et Vivi disperserait les stèles. Les Ponéglyphes seraient des messages venus du futur, destinés à préparer les peuples au jour du serment.",
  },
  {
    icon: "👑",
    title: "Joy Boy = Monkey D. Luffy",
    subtitle: "Le nom de règne du libérateur",
    description:
      "Joy Boy et Nika seraient deux noms de la légende que Luffy est en train de devenir. Sa victoire sur Kaido marque, dans la théorie, la naissance de Joy Boy et l'éveil du guerrier libérateur.",
  },
  {
    icon: "⚔️",
    title: "Les Armes Antiques sont modernes",
    subtitle: "Poséidon, Pluton et Uranus",
    description:
      "Poséidon serait Shirahoshi. Pluton réunirait Water Seven, les géants de la Galley-La, Zunesha, Kaido et Big Mom. Uranus serait alimentée par la Mother Flame de Vegapunk ; la vidéo propose notamment Imu comme incarnation de cette arme.",
  },
  {
    icon: "🏴‍☠️",
    title: "Davy D. Jones = Marshall D. Teach",
    subtitle: "Le dernier survivant du clan Davy",
    description:
      "Teach aurait survécu au massacre de son clan à God Valley. En renversant Imu et en prenant le Trône Vacant, il accomplirait la promesse de sa lignée et deviendrait le roi du monde connu sous le nom de Davy D. Jones.",
  },
  {
    icon: "🌊",
    title: "Le Déluge serait encore à venir",
    subtitle: "Une conséquence de la guerre future",
    description:
      "La grande guerre ferait monter les eaux de 200 mètres. Cette catastrophe annoncée par Vegapunk serait donc un événement à venir, et non la trace d'une guerre déjà terminée il y a huit siècles.",
  },
];

/** Résumé éditorial de la vidéo du Mont Corvo ; les repères suivent son sommaire. */
export const FULL_THEORY_SECTIONS = [
  {
    icon: "🧭",
    sourceSeconds: 0,
    title: "Laugh Tale : le bon lieu, mais dans le futur",
    summary:
      "Laugh Tale serait Roadstar dans le futur, à une époque où Red Line n’existerait plus et où All Blue réunirait les mers. Les Road Ponéglyphes donneraient aussi une coordonnée temporelle. Selon cette lecture, Roger aurait donc voyagé dans le futur pour l’atteindre.",
  },
  {
    icon: "👑",
    sourceSeconds: 1522,
    title: "Joy Boy serait Monkey D. Luffy",
    summary:
      "Joy Boy ne serait pas un héros disparu, mais la légende que Luffy devient. Sa victoire sur Kaido marque sa naissance symbolique, avant la libération du monde et la création du One Piece.",
  },
  {
    icon: "☀️",
    sourceSeconds: 3071,
    title: "Nika, Joy Boy et Luffy ne feraient qu'un",
    summary:
      "La foi des peuples opprimés aurait donné corps au dieu libérateur. Luffy deviendrait Nika parce que les hommes croient en lui, de la même façon que le One Piece continue d'exister parce que son nom et sa promesse sont transmis.",
  },
  {
    icon: "🧜‍♀️",
    sourceSeconds: 4387,
    title: "Poséidon serait Shirahoshi",
    summary:
      "La promesse de Joy Boy serait celle de Luffy et des Mugiwara à Shirahoshi : l’emmener à la surface. Le Ponéglyphe serait une demande écrite à la fin de l’aventure puis envoyée dans le passé, pour que le royaume Ryugu construise et protège Noah jusqu’au jour du serment.",
  },
  {
    icon: "🏴‍☠️",
    sourceSeconds: 4877,
    title: "Barbe Noire deviendrait Davy D. Jones",
    summary:
      "Teach serait le dernier survivant du clan Davy, sauvé à God Valley. En renversant Imu et en prenant le Trône Vacant, il accomplirait la promesse de sa lignée et deviendrait le roi du monde appelé Davy D. Jones.",
  },
  {
    icon: "🌺",
    sourceSeconds: 5246,
    title: "Nefertari Vivi deviendrait Lili",
    summary:
      "Vivi quitterait le trône d'Alabasta pour reprendre la mer, tandis que Koza gouvernerait le royaume. Elle disperserait ensuite les Ponéglyphes et écrirait à ses ancêtres de les protéger jusqu'à l'aube nouvelle.",
  },
  {
    icon: "🤖",
    sourceSeconds: 5625,
    title: "Emeth viendrait du futur",
    summary:
      "Emeth serait le Battle Franky 39, construit dans le futur par Franky et les satellites de Vegapunk. Ses souvenirs de Joy Boy seraient ceux de Luffy à la fin de l’aventure. Envoyé environ 200 ans dans le passé, il emporterait un nœud contenant le Haki futur de Luffy, qui sauverait ainsi ses compagnons sur Egghead.",
  },
  {
    icon: "⚔️",
    sourceSeconds: 6725,
    title: "Zoro deviendrait Ryuma",
    summary:
      "Zoro serait lui-même Ryuma, et le dragon de sa légende serait Kaido, qu’il a blessé au-dessus de la capitale des Fleurs. Après avoir réalisé son rêve, il confierait ses trois sabres à Tashigi et reprendrait Shusui à Wano. La vidéo envisage aussi son renvoi dans le passé pour expliquer la dépouille de Ryuma rencontrée à Thriller Bark.",
  },
  {
    icon: "🦩",
    sourceSeconds: 7144,
    title: "Le roi Donquixote serait Doflamingo",
    summary:
      "Le tyran des récits vieux de 900 ans reproduit précisément le système de Doflamingo : les Tontattas travaillent en secret pendant que Dressrosa profite de leur esclavage. L'histoire présente serait devenue celle de l'ancien roi.",
  },
  {
    icon: "📜",
    sourceSeconds: 7510,
    title: "Robin écrirait le Rio Ponéglyphe",
    summary:
      "Robin découvrirait qu'elle étudie sa propre écriture. Elle composerait le récit, Momonosuke apprendrait à le graver dans un alliage encore inconnu, puis les stèles seraient envoyées dans le passé pour transmettre cette histoire.",
  },
  {
    icon: "👒",
    sourceSeconds: 7800,
    title: "Le chapeau géant appartiendrait à Emeth",
    summary:
      "À l'image d'Ace offrant un chapeau à Oars Jr., Luffy et Usopp fabriqueraient un chapeau de paille géant pour Emeth. Perdu lors de son arrivée à Mary Geoise 200 ans plus tôt, il aurait été conservé par Imu.",
  },
  {
    icon: "📖",
    sourceSeconds: 8047,
    title: "Usopp écrirait le Halley",
    summary:
      "Le texte prophétique et la fresque d'Elbaf raconteraient la guerre à venir. Sous le nom de Louis Arnot, Usopp serait l'auteur du Halley et du culte de Nika, devenant enfin le grand guerrier qui inspire les géants.",
  },
  {
    icon: "🐉",
    sourceSeconds: 8552,
    title: "Loki deviendrait Nidhogg",
    summary:
      "Loki réunit les attributs du dieu de la guerre d'Elbaf : la forme de dragon, le marteau Ragnir et Ratatosk. Comme Luffy avec Nika, il deviendrait lui-même la figure mythologique décrite par son peuple.",
  },
  {
    icon: "🌊",
    sourceSeconds: 8880,
    title: "Le Déluge serait encore à venir",
    summary:
      "La guerre finale annoncée par Vegapunk, Oden, Barbe Blanche et les géants ferait monter les eaux de 200 mètres. Les immenses ponts construits par le Gouvernement seraient une préparation à cette catastrophe connue d'Imu.",
  },
  {
    icon: "🐟",
    sourceSeconds: 9360,
    title: "All Blue serait une mer encore à créer",
    summary:
      "La destruction de Red Line réunirait les quatre mers et ferait naître All Blue. Sanji réaliserait son rêve en participant à sa création, tandis que Luffy deviendrait le premier pirate à naviguer sur cette nouvelle mer : le pirate originel de la légende de Joy Boy.",
  },
  {
    icon: "🔨",
    sourceSeconds: 9544,
    title: "La Galley-La serait l’équipage de Loki",
    summary:
      "Les géants congelés de Punk Hazard seraient les compagnons de Loki, qu’il aurait protégés grâce à Ragnir et Ratatosk. Une fois libérés, ils rejoindraient la Galley-La d’Iceberg pour transformer Water Seven en Pluton. La rumeur entendue par les Rocks annoncerait donc leur avenir.",
  },
  {
    icon: "🚢",
    sourceSeconds: 9926,
    title: "Pluton serait une création collective",
    summary:
      "Iceberg et les géants de la Galley-La transformeraient Water Seven en navire de guerre. Avec Zunesha, ils ouvriraient les frontières de Wano et libéreraient Kaido et Big Mom de la chambre magmatique. C’est l’alliance de ce navire, des géants et des deux Empereurs qui formerait Pluton, plutôt qu’un navire déjà achevé sous Wano.",
  },
  {
    icon: "🔥",
    sourceSeconds: 10532,
    title: "Vegapunk aurait créé l'énergie d'Uranus",
    summary:
      "Mother Flame serait une invention moderne détournée par le Gouvernement. Uranus pourrait être Imu lui-même utilisant cette énergie pour frapper depuis le ciel, ce qui expliquerait pourquoi cette puissance n'a pas été employée auparavant.",
  },
  {
    icon: "👁️",
    sourceSeconds: 10864,
    title: "Imu enquêterait sur un futur annoncé",
    summary:
      "Imu connaîtrait les figures annoncées par les textes, mais chercherait encore leur identité et leur époque. La vidéo relit ses photos de Luffy, Teach, Shirahoshi et Vivi comme une enquête, et propose des méprises entre Xebec et Teach, puis entre Titi et Vivi.",
  },
  {
    icon: "♟️",
    sourceSeconds: 11585,
    title: "Les Vingt Rois seraient les familles du pouvoir actuel",
    summary:
      "La vidéo relie les rois des textes aux familles du Gorosei et des Chevaliers Divins. Sous les ordres d’Imu et de Garling, les Chevaliers reprendraient les royaumes de leurs familles pour former les armées opposées à la coalition de Joy Boy.",
  },
  {
    icon: "🐘",
    sourceSeconds: 11902,
    title: "Zunesha se souviendrait du futur",
    summary:
      "Comme Emeth, Zunesha pourrait venir du futur et avoir rencontré Luffy avant d’être envoyé dans le passé. Le Mont Corvo présente cette possibilité comme une piste : la cause de sa condamnation et le fonctionnement exact de ces déplacements restent inexpliqués.",
  },
  {
    icon: "📚",
    sourceSeconds: 12213,
    title: "Le One Piece serait l'histoire que nous lisons",
    summary:
      "Le One Piece serait littéralement l’histoire que nous lisons depuis le tome 1, complétée à la fin lorsque la conclusion rejoindra l’introduction. Luffy chercherait ainsi son propre trésor : l’aventure et les rencontres qu’il est en train de vivre.",
  },
] as const;

export const THEORY_FAQ: FAQItem[] = [
  {
    question: "D'où vient ce site et qui sont les Fous du Bus ?",
    answer:
      "Ce site est un projet créé pour le fun autour de la théorie diffusée par Le Mont Corvo : « Le Siècle Oublié est le Présent ». Les « Fous du Bus » sont les personnes qui choisissent de monter à bord pour participer à la théorie, qu'elles y croient déjà ou qu'elles veuillent simplement suivre l'aventure.",
  },
  {
    question: "Quel est le but de ce site ?",
    answer:
      "Le but est de donner vie à une véritable théorie de One Piece dans une expérience interactive créée pour le fun. En cliquant pour entrer, le visiteur monte réellement dans le bus, rejoint le compteur partagé et fait grandir le véhicule. La télévision permet ensuite de regarder la vidéo complète du Mont Corvo à bord.",
  },
  {
    question: "Qu'est-ce que la Théorie des Fous du Bus en résumé ?",
    answer:
      "C'est la thèse selon laquelle le Siècle Oublié de One Piece ne s'est pas déroulé il y a 800 ans dans un passé lointain, mais se déroule en direct dans le présent depuis le chapitre 1. Les Ponéglyphes sont des stèles venues du futur, Joy Boy est le nom de règne que portera Luffy, et Laugh Tale est une coordonnée temporelle (Roadstar dans le futur).",
  },
  {
    question: "Que signifie l’arrivée « trop tôt » de Roger dans la théorie ?",
    answer:
      "Dans cette lecture, Roger aurait voyagé vers le futur pour atteindre Laugh Tale, c’est-à-dire Roadstar à l’époque de Joy Boy. Les 25 ans évoqués dans la vidéo relient son voyage à l’époque de l’aventure : ils ne signifient pas que Luffy naîtrait 25 ans après son arrivée.",
  },
  {
    question: "Pourquoi aucune arme ne peut détruire un Ponéglyphe ?",
    answer:
      "La théorie relie leur indestructibilité à un alliage futur mis au point grâce à Vegapunk et au savoir du clan Kozuki. Robin créerait leur langue et écrirait le récit, Momonosuke apprendrait à les graver auprès de Sukiyaki, et Vivi/Lili les disperserait. Le moyen exact de leur envoi dans le passé reste à expliquer.",
  },
  {
    question: "Comment Barbe Noire est-il lié à Davy D. Jones ?",
    answer:
      "Selon la théorie, Teach est le dernier survivant du clan Davy après God Valley. Imu aurait confondu Rocks D. Xebec avec la figure annoncée sur les Ponéglyphes, alors que c'est son fils Teach qui accomplirait la promesse de la lignée : renverser Imu, prendre le Trône Vacant et devenir Davy D. Jones.",
  },
  {
    question: "Qu'est-ce que le trésor One Piece selon cette théorie ?",
    answer:
      "Selon cette lecture, le One Piece serait le récit complet de l’aventure de Luffy : l’histoire que nous lisons depuis le tome 1. Roger l’aurait découverte avant qu’elle soit vécue par Luffy et ses compagnons.",
  },
];
