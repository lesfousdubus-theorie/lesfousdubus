/**
 * Données encyclopédiques de la Théorie des Fous du Bus.
 * Utilisées pour le rendu SSR sémantique (SEO) et le lecteur modal interactif.
 */

export interface TheoryChapter {
  id: string;
  number: number;
  title: string;
  summary: string;
  badge: "Thèse centrale" | "Canon & Manga" | "Extension" | "Projection";
  keyPoints: string[];
  mangaReferences?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export const SIMPLE_EXPLANATION = {
  headline: "Et si le Siècle Oublié n'avait pas encore eu lieu ?",
  intro: "La théorie des Fous du Bus propose que la grande guerre racontée par les Ponéglyphes soit celle que Luffy et ses alliés sont sur le point de vivre.",
  points: [
    {
      icon: "⏳",
      title: "Le Siècle Oublié est le Présent",
      text: "Les figures attribuées à un passé vieux de 800 ans seraient les personnages actuels, en train d'écrire l'histoire qui deviendra ensuite une légende.",
    },
    {
      icon: "👑",
      title: "Luffy deviendrait Joy Boy et Nika",
      text: "Joy Boy et Nika ne seraient pas deux héros antiques distincts : ces noms désigneraient Luffy lorsqu'il libérera le monde et créera le One Piece.",
    },
    {
      icon: "📜",
      title: "Les Ponéglyphes viennent du futur",
      text: "Robin et Momonosuke les rédigeraient à la fin de l'aventure, puis ils seraient envoyés 800 ans dans le passé pour préparer le monde au jour du serment.",
    },
    {
      icon: "🗺️",
      title: "Laugh Tale serait Lodestar dans le futur",
      text: "Le quatrième Road Ponéglyphe indiquerait une date. Roger aurait atteint le bon lieu, mais 25 ans trop tôt pour rencontrer l'époque de Luffy.",
    },
  ],
  comparison: [
    {
      myth: "Le Siècle Oublié est une guerre terminée il y a 800 ans.",
      reality: "La grande guerre annoncée serait encore à venir et opposerait la coalition de Luffy au Gouvernement Mondial.",
    },
    {
      myth: "Joy Boy est un roi antique disparu qui a échoué.",
      reality: "Joy Boy serait le nom par lequel Luffy entrera dans l'histoire après avoir vaincu Kaido puis libéré le monde.",
    },
    {
      myth: "Laugh Tale est une île introuvable dans l'océan.",
      reality: "Laugh Tale serait Lodestar à la bonne époque : le quatrième Road Ponéglyphe donnerait la coordonnée temporelle.",
    },
    {
      myth: "Davy D. Jones est seulement une vieille légende de pirates.",
      reality: "Barbe Noire, dernier du clan Davy, deviendrait Davy D. Jones en tentant de prendre le Trône Vacant.",
    },
  ],
};

export const CENTRAL_THESIS = {
  title: "Le Siècle Oublié est le Présent",
  subtitle: "La grande guerre attribuée au passé serait encore à venir ; seuls les Ponéglyphes effectueraient le voyage vers le passé.",
  overview:
    "La Théorie des Fous du Bus imagine que le manga raconte la naissance des légendes du Siècle Oublié. Luffy deviendrait Joy Boy et Nika, Teach deviendrait Davy D. Jones, Vivi deviendrait Lili et les armes dites antiques seraient créées à notre époque. À la fin, Robin et Momonosuke consigneraient cette histoire sur les Ponéglyphes avant leur envoi 800 ans dans le passé. Il ne s'agirait donc pas d'une boucle où les personnages repartent vivre la guerre : seuls les messages de pierre remonteraient le temps.",
  quotes: [
    {
      author: "Gol D. Roger",
      chapter: "Chapitre 967",
      text: "Joy Boy, j'aurais vraiment aimé vivre à la même époque que toi… Quel trésor extraordinaire tu as laissé là ! C'est une histoire tellement drôle !",
      relevance: "Roger est arrivé trop tôt : la bonne époque n'existait pas encore.",
    },
    {
      author: "Silvers Rayleigh",
      chapter: "Chapitre 507",
      text: "Nous avons appris toute l'histoire du monde… Mais vous et nous sommes peut-être allés trop vite. Vous arriverez peut-être à une conclusion différente de la nôtre.",
      relevance: "L'équipage de Roger connaissait l'histoire, sans pouvoir encore l'accomplir.",
    },
    {
      author: "Docteur Vegapunk",
      chapter: "Chapitre 1113",
      text: "Ce monde… va sombrer dans l'océan !",
      relevance: "Cette annonce soutient le déluge futur provoqué par la guerre finale.",
    },
  ],
};

export const CORE_PILLARS = [
  {
    icon: "⌛",
    title: "Laugh Tale n'existe pas encore",
    subtitle: "Une coordonnée temporelle, non spatiale",
    description:
      "Laugh Tale ne serait pas une autre île cachée après Lodestar, mais Lodestar dans le futur. Le quatrième Road Ponéglyphe donnerait la date nécessaire, ce qui expliquerait pourquoi Roger est arrivé trop tôt.",
  },
  {
    icon: "📜",
    title: "Les Ponéglyphes : mémoire de l'avenir",
    subtitle: "Des stèles forgées dans le futur",
    description:
      "Robin écrirait le récit, Momonosuke le graverait et Vivi le disperserait. Envoyées 800 ans dans le passé, les stèles prépareraient les peuples au jour du serment sans renvoyer les héros eux-mêmes dans le temps.",
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
      "Poséidon serait Shirahoshi ; Pluton naîtrait de Water Seven, de la Galley-La, de Zunesha et de Wano ; Uranus serait Imu utilisant la Mother Flame créée par Vegapunk.",
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
    title: "Le Déluge et All Blue",
    subtitle: "La destruction de Red Line et l'océan unique",
    description:
      "La grande guerre ferait monter les eaux de 200 mètres. La destruction de Red Line réunirait alors les quatre mers en All Blue, où Luffy deviendrait le premier pirate à prendre cette nouvelle mer.",
  },
];

/** Les 22 axes de la transcription complète, résumés sans les présenter comme du canon. */
export const FULL_THEORY_SECTIONS = [
  {
    icon: "🧭",
    title: "Laugh Tale : le bon lieu, mais dans le futur",
    summary:
      "Laugh Tale serait Lodestar à une autre époque. Trois Road Ponéglyphes suffiraient à situer une île dans l'espace ; le quatrième fournirait la coordonnée temporelle qui manquait à Roger, arrivé 25 ans trop tôt.",
  },
  {
    icon: "👑",
    title: "Joy Boy serait Monkey D. Luffy",
    summary:
      "Joy Boy ne serait pas un héros disparu, mais la légende que Luffy devient. Sa victoire sur Kaido marque sa naissance symbolique, avant la libération du monde et la création du One Piece.",
  },
  {
    icon: "☀️",
    title: "Nika, Joy Boy et Luffy ne feraient qu'un",
    summary:
      "La foi des peuples opprimés aurait donné corps au dieu libérateur. Luffy deviendrait Nika parce que les hommes croient en lui, de la même façon que le One Piece continue d'exister parce que son nom et sa promesse sont transmis.",
  },
  {
    icon: "🧜‍♀️",
    title: "Poséidon serait Shirahoshi",
    summary:
      "La promesse de Joy Boy serait celle faite par Luffy et son équipage à Shirahoshi : l'emmener à la surface. Le Ponéglyphe demanderait au royaume Ryugu de construire et protéger Noah jusqu'au jour du serment.",
  },
  {
    icon: "🏴‍☠️",
    title: "Barbe Noire deviendrait Davy D. Jones",
    summary:
      "Teach serait le dernier survivant du clan Davy, sauvé à God Valley. En renversant Imu et en prenant le Trône Vacant, il accomplirait la promesse de sa lignée et deviendrait le roi du monde appelé Davy D. Jones.",
  },
  {
    icon: "🌺",
    title: "Nefertari Vivi deviendrait Lili",
    summary:
      "Vivi quitterait le trône d'Alabasta pour reprendre la mer, tandis que Koza gouvernerait le royaume. Elle disperserait ensuite les Ponéglyphes et écrirait à ses ancêtres de les protéger jusqu'à l'aube nouvelle.",
  },
  {
    icon: "🤖",
    title: "Emeth viendrait du futur",
    summary:
      "Le géant de fer serait une création future de Franky et Vegapunk. Envoyé dans le passé, il emporterait un nœud contenant le Haki que Luffy développera plus tard, ce qui expliquerait pourquoi Imu reconnaît le Haki de Joy Boy.",
  },
  {
    icon: "⚔️",
    title: "Zoro deviendrait Ryuma",
    summary:
      "Après être devenu le meilleur sabreur, Zoro retournerait à Wano, reprendrait Shusui et entrerait dans la légende sous le nom de Ryuma. La théorie relie notamment son apparence, sa lignée Shimotsuki et sa blessure infligée au dragon Kaido.",
  },
  {
    icon: "🦩",
    title: "Le roi Donquixote serait Doflamingo",
    summary:
      "Le tyran des récits vieux de 900 ans reproduit précisément le système de Doflamingo : les Tontattas travaillent en secret pendant que Dressrosa profite de leur esclavage. L'histoire présente serait devenue celle de l'ancien roi.",
  },
  {
    icon: "📜",
    title: "Robin écrirait le Rio Ponéglyphe",
    summary:
      "Robin découvrirait qu'elle étudie sa propre écriture. Elle composerait le récit, Momonosuke apprendrait à le graver dans un alliage encore inconnu, puis les stèles repartiraient seules 800 ans dans le passé.",
  },
  {
    icon: "👒",
    title: "Le chapeau géant appartiendrait à Emeth",
    summary:
      "À l'image d'Ace offrant un chapeau à Oars Jr., Luffy et Usopp fabriqueraient un chapeau de paille géant pour Emeth. Perdu lors de son arrivée à Mary Geoise 200 ans plus tôt, il aurait été conservé par Imu.",
  },
  {
    icon: "📖",
    title: "Usopp écrirait le Halley",
    summary:
      "Le texte prophétique et la fresque d'Elbaf raconteraient la guerre à venir. Sous le nom de Louis Arnot, Usopp serait l'auteur du Halley et du culte de Nika, devenant enfin le grand guerrier qui inspire les géants.",
  },
  {
    icon: "🐉",
    title: "Loki deviendrait Nidhogg",
    summary:
      "Loki réunit les attributs du dieu de la guerre d'Elbaf : la forme de dragon, le marteau Ragnir et Ratatosk. Comme Luffy avec Nika, il deviendrait lui-même la figure mythologique décrite par son peuple.",
  },
  {
    icon: "🌊",
    title: "Le Déluge serait encore à venir",
    summary:
      "La guerre finale annoncée par Vegapunk, Oden, Barbe Blanche et les géants ferait monter les eaux de 200 mètres. Les immenses ponts construits par le Gouvernement seraient une préparation à cette catastrophe connue d'Imu.",
  },
  {
    icon: "🐟",
    title: "Sanji contribuerait à créer All Blue",
    summary:
      "La destruction de Red Line réunirait North, South, East et West Blue. All Blue n'aurait donc jamais été trouvé parce qu'il n'existe pas encore ; Sanji et les Mugiwara participeraient à sa naissance.",
  },
  {
    icon: "🔨",
    title: "La Galley-La serait l'équipage de Loki",
    summary:
      "L'escouade des géants au grand marteau n'aurait pas encore existé à l'époque de Rocks. Les guerriers de Loki, protégés dans la glace, rejoindraient plus tard la Galley-La Company pour construire l'arme Pluton.",
  },
  {
    icon: "🚢",
    title: "Pluton serait une création collective",
    summary:
      "Water Seven deviendrait un navire géant avec l'aide de la Galley-La, de Loki et des charpentiers d'Elbaf. Zunesha ouvrirait ensuite Wano : l'ensemble formerait le terrible navire de guerre annoncé par les plans de Pluton.",
  },
  {
    icon: "🔥",
    title: "Vegapunk aurait créé l'énergie d'Uranus",
    summary:
      "Mother Flame serait une invention moderne détournée par le Gouvernement. Uranus pourrait être Imu lui-même utilisant cette énergie pour frapper depuis le ciel, ce qui expliquerait pourquoi cette puissance n'a pas été employée auparavant.",
  },
  {
    icon: "👁️",
    title: "Imu enquêterait sur un futur annoncé",
    summary:
      "Imu connaîtrait les noms inscrits sur les Ponéglyphes sans connaître encore leurs visages ni leur génération. Il aurait ainsi confondu Xebec avec Davy D. Jones et la mère de Vivi avec Lili avant d'identifier ses suspects actuels.",
  },
  {
    icon: "♟️",
    title: "Les Vingt Rois seraient les Chevaliers Divins",
    summary:
      "Les Chevaliers Divins seraient envoyés reprendre les royaumes de leurs familles fondatrices et devenir les vingt rois de la guerre. Leur coalition affronterait les peuples libérés réunis autour de Joy Boy.",
  },
  {
    icon: "🐘",
    title: "Zunesha se souviendrait du futur",
    summary:
      "Comme Emeth, Zunesha pourrait avoir rencontré Luffy dans le futur avant d'être envoyé dans le passé et condamné à marcher. La transcription reconnaît ici que le mécanisme exact reste volontairement inexpliqué.",
  },
  {
    icon: "📚",
    title: "Le One Piece serait l'histoire que nous lisons",
    summary:
      "Le trésor serait le récit complet des aventures, des rencontres et de la libération menée par Luffy. Roger n'aurait lu que cette histoire avant qu'elle arrive ; la révélation finale donnerait alors envie de reprendre le manga depuis le tome 1.",
  },
] as const;

export const THEORY_CHAPTERS: TheoryChapter[] = [
  {
    id: "presentation",
    number: 1,
    title: "Présentation : Le Siècle Oublié est le Présent",
    summary:
      "L'histoire effacée il y a 800 ans n'a jamais eu lieu dans le passé : elle se produit maintenant, depuis le chapitre 1 du manga. Les Ponéglyphes sont la mémoire de l'avenir.",
    badge: "Thèse centrale",
    keyPoints: [
      "Le manga One Piece ne raconte pas la découverte d'un passé effacé mais l'écriture en direct du Siècle Oublié.",
      "Les anomalies temporelles et les prophéties sont des traces de causalité fermée.",
      "Tous les témoins du passé (Zunesha, les Géants, Toki) attendent une première rencontre.",
    ],
    mangaReferences: "Chapitres 1, 398, 967, 1113",
  },
  {
    id: "geographie",
    number: 2,
    title: "Le Monde et sa géographie : Blue Star et la Submersion",
    summary:
      "Le monde de Blue Star, encerclé par Red Line et coupé par Grand Line, a déjà perdu 200 mètres d'altitude sous les flots. Cette submersion n'est pas ancienne : elle est le résultat direct de la guerre que nous vivons.",
    badge: "Canon & Manga",
    keyPoints: [
      "Vegapunk révèle que le niveau de la mer est monté de 200 mètres durant la guerre.",
      "La géographie artificielle du monde (Red Line, Calm Belt) a été façonnée pour verrouiller les peuples.",
      "La montée des eaux continue aujourd'hui après la destruction de Lulusia.",
    ],
    mangaReferences: "Chapitres 1089, 1113, 1116",
  },
  {
    id: "laugh-tale",
    number: 3,
    title: "Laugh Tale n'existe pas encore",
    summary:
      "Laugh Tale n'est pas une île inaccessible dans l'espace, c'est une époque. C'est Lodestar dans le futur. Roger est arrivé 25 ans trop tôt car Joy Boy n'était pas encore né.",
    badge: "Thèse centrale",
    keyPoints: [
      "Lodestar est le point culminant de la navigation sur Grand Line.",
      "Roger comprend à Laugh Tale qu'il est en avance sur le temps : 'Nous sommes arrivés trop tôt'.",
      "Le 4e Road Ponéglyphe donne la coordonnée temporelle indispensable pour synchroniser l'arrivée.",
    ],
    mangaReferences: "Chapitres 966, 967, 968",
  },
  {
    id: "poneglyphes",
    number: 4,
    title: "Les Ponéglyphes, mémoire de l'avenir",
    summary:
      "Les stèles sont indestructibles depuis 800 ans car elles ont été forgées avec un matériau et un savoir qui n'existent pas encore. Elles sont une lettre du futur envoyée dans le passé.",
    badge: "Thèse centrale",
    keyPoints: [
      "Aucune arme ni explosion n'a jamais pu altérer un seul Ponéglyphe.",
      "Rédigés dans une écriture créée par Nico Robin pour contourner la censure du Gouvernement.",
      "Taillés par le clan Kozuki (Momonosuke) et dispersés à travers les mers.",
    ],
    mangaReferences: "Chapitres 398, 818, 967, 1085",
  },
  {
    id: "joy-boy",
    number: 5,
    title: "Joy Boy est Luffy",
    summary:
      "Joy Boy n'a jamais vécu il y a 900 ans. Il est Monkey D. Luffy, dont le monde entier portera le nom de règne après la libération des peuples asservis.",
    badge: "Thèse centrale",
    keyPoints: [
      "Joy Boy est le nom de règne donné au sauveur souriant par les peuples reconnaissants.",
      "Zunesha entend les tambours de la libération et proclame : 'Joy Boy est revenu !' (en réalité, il est enfin là).",
      "La lettre d'excuse sur l'île des Hommes-Poissons s'adresse à la promesse que Luffy a faite.",
    ],
    mangaReferences: "Chapitres 649, 1043, 1044",
  },
  {
    id: "nika",
    number: 6,
    title: "Nika est Luffy : la force de la foi",
    summary:
      "Nika, le guerrier libérateur au corps extensible, n'a jamais préexisté comme dieu indépendant : il est né parce que les peuples opprimés y ont cru, et cette foi a pris pour modèle Monkey D. Luffy.",
    badge: "Thèse centrale",
    keyPoints: [
      "Bartholomew Kuma a transmis sa foi inébranlable en Nika à Bonney et aux esclaves.",
      "Le fruit Hito Hito no Mi modèle Nika matérialise les désirs d'émancipation humaine.",
      "Luffy ne succède pas à Nika : Luffy EST Nika.",
    ],
    mangaReferences: "Chapitres 1018, 1044, 1095, 1100",
  },
  {
    id: "poseidon",
    number: 7,
    title: "Poséidon est Shirahoshi",
    summary:
      "L'Arme Antique capable de commander aux Rois des Mers n'est pas une entité du passé : la promesse historique de Joy Boy a eu lieu dans le présent sous l'arche Noah avec Shirahoshi.",
    badge: "Thèse centrale",
    keyPoints: [
      "La lettre d'excuse du Ponéglyphe de Ryugu s'explique par les dégâts infligés à l'arche Noah lors du combat de Luffy.",
      "Les Rois des Mers parlent de la rencontre de leurs deux souverains qui devait avoir lieu dans le présent.",
      "Shirahoshi réveillera la flotte sous-marine pour le grand exode lors du Déluge.",
    ],
    mangaReferences: "Chapitres 626, 648, 649",
  },
  {
    id: "davy-jones",
    number: 8,
    title: "Davy D. Jones serait Barbe Noire",
    summary:
      "Marshall D. Teach serait le dernier survivant du clan Davy et deviendrait Davy D. Jones après avoir renversé Imu pour prendre le Trône Vacant.",
    badge: "Thèse centrale",
    keyPoints: [
      "Le Davy Back Fight sur Long Ring Long Land annonce les règles du jeu pirate originel.",
      "L'ambition démesurée de Barbe Noire visant le contrôle absolu du monde depuis Hachinosu.",
      "Imu conserve les avis de recherche de Luffy, Shirahoshi, Vivi et Barbe Noire.",
    ],
    mangaReferences: "Chapitres 306, 908, 957, 1081",
  },
  {
    id: "lili",
    number: 9,
    title: "Lili est Vivi : la reine qui n'a pas plié",
    summary:
      "Nefertari D. Lili est la seule des 20 monarques à avoir refusé de s'installer à Mary Geoise. C'est Nefertari Vivi qui accomplira le rôle de Lili et dispersera les Ponéglyphes à travers le monde.",
    badge: "Thèse centrale",
    keyPoints: [
      "Silhouette, tempérament et volonté identique entre Lili et Vivi.",
      "La lettre de Lili transmise aux souverains d'Alabasta porte la signature du 'D.'.",
      "Vivi en fuite avec Morgan et Wapol est la clef de voûte de la dispersion des secrets du Gouvernement.",
    ],
    mangaReferences: "Chapitres 1084, 1085, 1086",
  },
  {
    id: "ryuma",
    number: 10,
    title: "Ryuma est Zoro : l'accomplissement du Dieu de la Lame",
    summary:
      "Le samouraï borgne légendaire qui a tranché un dragon au-dessus de la Capitale des Fleurs est Roronoa Zoro terrassant Kaido sur Onigashima.",
    badge: "Thèse centrale",
    keyPoints: [
      "Zoro descendant direct des Shimotsuki de Wano et sosie parfait de Ryuma jeune.",
      "Le combat au sommet d'Onigashima où Zoro blesse mortellement Kaido sous sa forme de dragon azur.",
      "La transmission du sabre national Shusui sur Thriller Bark reliant le présent au mythe.",
    ],
    mangaReferences: "Monsters, Chapitres 467, 1023, 1033",
  },
  {
    id: "nidhogg",
    number: 11,
    title: "Nidhogg est Loki : le prince maudit d'Elbaf",
    summary:
      "Loki, le prince enchaîné d'Elbaf détenant le légendaire fruit mythologique, incarne le dragon Nidhogg du folklore nordique prophétisé sur la grande fresque d'Elbaf.",
    badge: "Extension",
    keyPoints: [
      "Loki enchaîné aux arbres géants d'Elbaf sous une tempête de neige permanente.",
      "La fresque sacrée d'Elbaf annonçant la guerre des dieux et le feu de Ragnir.",
      "L'alliance explosive entre les Chapeaux de Paille et les géants guerriers.",
    ],
    mangaReferences: "Chapitres 1130, 1131, 1132",
  },
  {
    id: "emeth",
    number: 12,
    title: "Emeth, le robot venu du futur",
    summary:
      "Emeth, le géant de fer d'Egghead, n'est pas une relique antique : c'est le Battle Franky 39, conçu par Franky avec la technologie des satellites de Vegapunk et envoyé dans le passé pour aider Joy Boy.",
    badge: "Thèse centrale",
    keyPoints: [
      "Emeth s'active uniquement aux battements de cœur du Gear 5 (les tambours de la libération).",
      "Le nœud de corde contenant le Haki surpuissant de Joy Boy scellé pour le protéger des siècles plus tard.",
      "Le chapeau de paille géant congelé sous Mary Geoise était taillé sur mesure pour Emeth.",
    ],
    mangaReferences: "Chapitres 1067, 1111, 1122, 1123",
  },
  {
    id: "doflamingo",
    number: 13,
    title: "L'ancien roi Donquixote est Doflamingo",
    summary:
      "La description du roi tyrannique d'il y a 800 ans qui réduisait les Tontattas en esclavage dans les archives de Dressrosa correspond trait pour trait à Donquixote Doflamingo.",
    badge: "Thèse centrale",
    keyPoints: [
      "Silhouette, manteau de plumes roses et cruauté absolue décrite au chapitre 726.",
      "L'histoire officielle a enregistré les méfaits de Doflamingo comme s'ils dataient d'un passé immémorial.",
      "Doflamingo depuis Impel Down sait exactement quel secret menace le Trône Vacant.",
    ],
    mangaReferences: "Chapitres 726, 764, 906",
  },
  {
    id: "armes-antiques",
    number: 14,
    title: "Les Armes Antiques sont modernes",
    summary:
      "Poséidon, Pluton et Uranus ne sont pas des inventions du passé, mais des technologies du présent et du futur que les chroniques ont figées sous forme de légendes intemporelles.",
    badge: "Thèse centrale",
    keyPoints: [
      "Poséidon : pouvoir biologique qui naît tous les quelques siècles, incarné en Shirahoshi.",
      "Pluton : cuirassé titanesque dissimulé sous les fondations de Wano, lié au savoir de Water Seven.",
      "Uranus : satellite d'anéantissement orbital activé par la Mother Flame de Vegapunk.",
    ],
    mangaReferences: "Chapitres 193, 301, 1055, 1086",
  },
  {
    id: "deluge",
    number: 15,
    title: "Le Déluge n'est pas encore arrivé",
    summary:
      "La submersion mondiale n'est pas un souvenir biblique oublié : c'est le cataclysme en cours provoqué par les frappes de la Mother Flame et la montée inéluctable des eaux.",
    badge: "Thèse centrale",
    keyPoints: [
      "Chaque utilisation de l'arme céleste Uranus élève le niveau des océans d'un mètre sur tout le globe.",
      "Vegapunk a construit Egghead en prévision de la grande inondation.",
      "L'arche Noah et les géants préparent le plus grand sauvetage maritime de l'histoire.",
    ],
    mangaReferences: "Chapitres 1089, 1113, 1114",
  },
  {
    id: "all-blue",
    number: 16,
    title: "All Blue sera créé à la fin",
    summary:
      "Le rêve de Sanji n'est pas un lieu secret déjà existant : All Blue naîtra de l'effondrement de Red Line et de Mary Geoise, réunissant les quatre mers du globe en un océan infini.",
    badge: "Projection",
    keyPoints: [
      "La destruction d'Enies Lobby et de Mary Geoise brise l'anneau rocheux artificiel de Red Line.",
      "La rencontre des faunes marines d'East, West, North et South Blue crée la mer légendaire de Sanji.",
      "Luffy réalise la première circumnavigation libre du monde sans frontières.",
    ],
    mangaReferences: "Chapitres 69, 610, 649",
  },
  {
    id: "vingt-rois",
    number: 17,
    title: "Les Vingt Rois sont les Chevaliers Divins",
    summary:
      "Les 20 familles fondatrices de Mary Geoise n'ont jamais été des alliés bienveillants : elles forment la caste militaire suprême des Chevaliers Divins dirigée par les Figarland.",
    badge: "Extension",
    keyPoints: [
      "Saint Garling Figarland et les juges suprêmes de Mary Geoise.",
      "Les 19 épées plantées devant le Trône Vacant symbolisant un faux serment d'égalité.",
      "Scopper Gaban et les révélations sur la coalition qui opprime le monde depuis le sommet.",
    ],
    mangaReferences: "Chapitres 907, 1086, 1095, 1120",
  },
  {
    id: "imu",
    number: 18,
    title: "Imu, celui qui sait",
    summary:
      "Imu Nerona est conscient que les écrits sur les Ponéglyphes annoncent sa défaite future. Il traque désespérément chaque indice venu de l'avenir pour retarder sa chute inéluctable.",
    badge: "Thèse centrale",
    keyPoints: [
      "Imu possède le papillon et la chambre gelée où repose le chapeau de paille géant.",
      "L'élimination immédiate de quiconque mentionne le nom du Royaume Disparu ou le Siècle Oublié.",
      "La panique d'Imu face à l'éveil de Nika et à la diffusion du message mondial de Vegapunk.",
    ],
    mangaReferences: "Chapitres 906, 908, 1085, 1115",
  },
  {
    id: "peuples",
    number: 19,
    title: "Zunesha et les missions des peuples",
    summary:
      "Zunesha, les Shandias, les Hommes-Poissons et le clan Kozuki n'ont pas échoué dans le passé : ils gardent fidèlement leur poste en attendant la toute première venue de Joy Boy.",
    badge: "Canon & Manga",
    keyPoints: [
      "Zunesha erre depuis 800 ans en expiation d'un crime qui reste à élucider.",
      "Les Shandias ont défendu la cloche d'or et le Ponéglyphe au péril de leur civilisation.",
      "L'ouverture des frontières de Wano différée par Momonosuke jusqu'au jour précis de l'affrontement final.",
    ],
    mangaReferences: "Chapitres 275, 822, 1046, 1055",
  },
  {
    id: "one-piece",
    number: 20,
    title: "Le One Piece est l'histoire de Luffy",
    summary:
      "Le One Piece n'est pas un simple tas d'or ou une arme matérielle : c'est le récit complet de l'aventure de Luffy depuis le premier tome, consigné à la fin du monde.",
    badge: "Thèse centrale",
    keyPoints: [
      "Roger a ri aux larmes en découvrant l'histoire de Luffy et s'est exclamé : 'He Laughed'.",
      "Le trésor ultime est la réconciliation du temps : la fin du manga qui boucle avec le début.",
      "Le One Piece est à la fois réel, tangible, et porteur de la plus grande libération narrative de l'histoire.",
    ],
    mangaReferences: "Chapitres 507, 967, 968, 1000",
  },
  {
    id: "lecture",
    number: 21,
    title: "Les quatre niveaux d'analyse de la théorie",
    summary:
      "Pour maintenir une rigueur éditoriale absolue, la théorie distingue quatre statuts : les faits établis du manga, la théorie centrale, les extensions thématiques et les projections futures.",
    badge: "Extension",
    keyPoints: [
      "Faits canoniques : tout ce qui est explicitement validé dans les pages dessinées par Oda.",
      "Théorie centrale : le cœur de la thèse des Fous du Bus (Siècle Oublié = Présent, Joy Boy = Luffy).",
      "Extensions : hypothèses complémentaires sur les personnages secondaires et les pouvoirs.",
      "Projections : scénarios sur la conclusion de la guerre finale et l'avènement d'All Blue.",
    ],
    mangaReferences: "Guides SBS, Vivre Cards, Tomes 1 à 110",
  },
  {
    id: "conclusion",
    number: 22,
    title: "Conclusion : Depuis le chapitre 1, on lit le Siècle Oublié",
    summary:
      "La fin de l'œuvre recontextualiserait toute l'aventure : Luffy et ses alliés deviendraient les légendes du Siècle Oublié, puis leur histoire serait envoyée dans le passé sur les Ponéglyphes.",
    badge: "Thèse centrale",
    keyPoints: [
      "Chaque île traversée est un maillon de la chaîne qui libère le monde du mensonge millénaire.",
      "La fin de One Piece donnera un sens rétroactif absolu à chaque vignette depuis le tome 1.",
      "Le bus des Nakamas roule vers Laugh Tale : le voyage ne fait que commencer !",
    ],
    mangaReferences: "Chapitres 1, 967, 1125+",
  },
];

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
    question: "Pourquoi un bus qui s'allonge en direct ?",
    answer:
      "Le bus coiffé du chapeau de paille est le symbole même de la communauté des Fous du Bus. À chaque fois qu'un visiteur monte dans le bus, il devient officiellement un passager enregistré, et de nouvelles rangées de sièges se créent en direct pour accueillir tout le monde dans ce grand voyage vers Laugh Tale.",
  },
  {
    question: "Qu'est-ce que la Théorie des Fous du Bus en résumé ?",
    answer:
      "C'est la thèse selon laquelle le Siècle Oublié de One Piece ne s'est pas déroulé il y a 800 ans dans un passé lointain, mais se déroule en direct dans le présent depuis le chapitre 1. Les Ponéglyphes sont des stèles venues du futur, Joy Boy est le nom de règne que portera Luffy, et Laugh Tale est une coordonnée temporelle (Lodestar dans le futur).",
  },
  {
    question: "Pourquoi Roger était-il arrivé 'trop tôt' de 25 ans ?",
    answer:
      "Parce que Laugh Tale n'est pas une île inaccessible dans l'espace, mais dans le temps. Roger est arrivé physiquement sur la dernière île (Lodestar), mais 25 ans avant la naissance et l'éveil du libérateur Joy Boy (Luffy). Il a donc découvert l'histoire sans pouvoir accomplir la promesse.",
  },
  {
    question: "Pourquoi aucune arme ne peut détruire un Ponéglyphe ?",
    answer:
      "Les stèles sont indestructibles depuis 800 ans car elles ont été façonnées dans le futur, avec un matériau et un savoir qui n'existent pas encore à cette époque. C'est la mémoire inviolable de l'avenir envoyée dans le passé par Nefertari Lili et sculptée par Kozuki Momonosuke.",
  },
  {
    question: "Comment Barbe Noire est-il lié à Davy D. Jones ?",
    answer:
      "Selon la théorie, Teach est le dernier survivant du clan Davy après God Valley. Imu aurait confondu Rocks D. Xebec avec la figure annoncée sur les Ponéglyphes, alors que c'est son fils Teach qui accomplirait la promesse de la lignée : renverser Imu, prendre le Trône Vacant et devenir Davy D. Jones.",
  },
  {
    question: "Qu'est-ce que le trésor One Piece selon cette théorie ?",
    answer:
      "Le One Piece est le récit complet de l'aventure de Luffy consigné à la fin des temps, que Roger a lu en riant aux larmes ('He Laughed'). C'est l'histoire complète qui boucle la causalité du manga, du chapitre 1 jusqu'à la libération finale.",
  },
  {
    question: "Comment naîtra All Blue à la fin du manga ?",
    answer:
      "All Blue n'existe pas encore. Il naîtra lors de la guerre finale de l'effondrement de Red Line et de Mary Geoise provoqué par les Armes Antiques, réunissant North, South, East et West Blue en un océan universel et sans frontières.",
  },
];
