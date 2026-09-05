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
  headline: "La Théorie en 30 secondes : Tout s'écrit maintenant !",
  intro: "Pourquoi le Gouvernement Mondial cache-t-il le Siècle Oublié ? Parce qu'il ne s'est JAMAIS déroulé dans le passé : il se passe sous nos yeux !",
  points: [
    {
      icon: "⏳",
      title: "Le Siècle Oublié est le Présent",
      text: "L'histoire effacée il y a 800 ans n'est pas une guerre ancienne : c'est notre présent, celui que nous lisons depuis le chapitre 1 avec Luffy.",
    },
    {
      icon: "👑",
      title: "Joy Boy, c'est Luffy",
      text: "Joy Boy n'est pas un héros mort dans l'antiquité. C'est le titre politique et historique que le monde unifié donnera à Luffy après la libération finale.",
    },
    {
      icon: "📜",
      title: "Les Ponéglyphes viennent du futur",
      text: "Indestructibles parce que faits d'une matière inconnue dans le passé. Rédigés par Robin et sculptés par les Kozuki, ils sont envoyés dans le temps pour guider l'équipage.",
    },
    {
      icon: "🗺️",
      title: "Laugh Tale est une question de temps",
      text: "Laugh Tale n'est pas cachée sur une carte : elle était inaccessible dans le temps ! Roger a ri parce qu'il était 25 ans trop tôt, avant que Joy Boy ne naisse.",
    },
  ],
  comparison: [
    {
      myth: "Le Siècle Oublié est une guerre terminée il y a 800 ans.",
      reality: "Le Siècle Oublié est la grande guerre actuelle que Luffy mène contre le Gouvernement Mondial.",
    },
    {
      myth: "Joy Boy est un roi antique disparu qui a échoué.",
      reality: "Joy Boy est le nom que portera Luffy une fois le monde libéré de l'oppression d'Imu.",
    },
    {
      myth: "Laugh Tale est une île introuvable dans l'océan.",
      reality: "Laugh Tale est une coordonnée temporelle : Roger est arrivé trop tôt, Luffy arrivera au moment parfait.",
    },
    {
      myth: "Davy Jones est une vieille légende de pirates.",
      reality: "Davy Jones est le nom historique que recevra Barbe Noire dans sa chute contre Joy Boy.",
    },
  ],
};

export const CENTRAL_THESIS = {
  title: "Le Siècle Oublié est le Présent",
  subtitle: "L'histoire effacée il y a 800 ans n'a jamais eu lieu dans le passé : elle s'écrit sous nos yeux depuis le départ de Fushia.",
  overview:
    "Et si le plus grand secret de One Piece était sous nos yeux depuis 25 ans ? La Théorie des Fous du Bus démontre que le manga ne raconte pas l'archéologie d'un monde disparu, mais l'écriture en direct du Siècle Oublié. Luffy est Joy Boy, les Ponéglyphes sont des balises temporelles envoyées par les Mugiwaras, et Laugh Tale est le point de convergence où passé, présent et futur ne font plus qu'un.",
  quotes: [
    {
      author: "Gol D. Roger",
      chapter: "Chapitre 967",
      text: "Joy Boy, j'aurais vraiment aimé vivre à la même époque que toi… Quel trésor extraordinaire tu as laissé là ! C'est une histoire tellement drôle !",
    },
    {
      author: "Silvers Rayleigh",
      chapter: "Chapitre 507",
      text: "Nous avons appris toute l'histoire du monde… Mais vous et nous sommes peut-être allés trop vite. Vous arriverez peut-être à une conclusion différente de la nôtre.",
    },
    {
      author: "Docteur Vegapunk",
      chapter: "Chapitre 1113",
      text: "Ce monde… va sombrer dans l'océan !",
    },
  ],
};

export const CORE_PILLARS = [
  {
    icon: "⌛",
    title: "Laugh Tale n'existe pas encore",
    subtitle: "Une coordonnée temporelle, non spatiale",
    description:
      "Laugh Tale n'est pas une île cachée qu'il suffit de repérer avec un compas : c'est Lodestar dans le futur. Roger est arrivé 25 ans trop tôt car Joy Boy n'était pas encore né. Le 4e Road Ponéglyphe indique le temps.",
  },
  {
    icon: "📜",
    title: "Les Ponéglyphes : mémoire de l'avenir",
    subtitle: "Des stèles forgées dans le futur",
    description:
      "Indestructibles depuis 800 ans parce qu'elles sont faites d'un matériau qui n'existe pas encore à cette époque. Rédigées par Nico Robin, sculptées par le clan Kozuki (Momonosuke) et dispersées par Nefertari Lili / Vivi.",
  },
  {
    icon: "👑",
    title: "Joy Boy = Monkey D. Luffy",
    subtitle: "Le nom de règne du libérateur",
    description:
      "Joy Boy n'a jamais vécu il y a 900 ans. C'est le titre politique et historique que le monde unifié donnera à Luffy après la chute du Gouvernement Mondial. Nika est son éveil divin, Luffy son nom de naissance.",
  },
  {
    icon: "⚔️",
    title: "Les Armes Antiques sont modernes",
    subtitle: "Poséidon, Pluton et Uranus",
    description:
      "Poséidon est Shirahoshi (la promesse de Joy Boy a eu lieu dans le présent à l'île des Hommes-Poissons). Pluton est l'île-navire Water Seven / sous Wano. Uranus est la force céleste manipulée par Imu grâce à la Mother Flame de Vegapunk.",
  },
  {
    icon: "🏴‍☠️",
    title: "Davy Jones = Marshall D. Teach",
    subtitle: "La méprise d'Imu sur la lignée de Barbe Noire",
    description:
      "Davy Jones n'est pas un mythe du passé, mais le titre infâme que l'histoire donnera à Barbe Noire lorsqu'il cherchera à renverser le monde. Imu confond Rocks D. Xebec et son héritier Teach.",
  },
  {
    icon: "🌊",
    title: "Le Déluge et All Blue",
    subtitle: "La destruction de Red Line et l'océan unique",
    description:
      "La submersion du monde de 200m ne s'est pas arrêtée : elle s'accélère avec les tirs d'Uranus. Lors de la guerre finale, la destruction de Red Line créera All Blue, l'océan universel où Luffy réalisera le premier tour du monde.",
  },
];

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
    title: "Davy Jones est Barbe Noire",
    summary:
      "Davy Jones n'est pas un marin légendaire d'il y a 800 ans : c'est Marshall D. Teach. Imu confond Rocks D. Xebec et son fils Teach en les associant au même titre historique maudit.",
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
      "L'œuvre d'Eiichiro Oda forme la plus vertigineuse boucle causale de l'histoire du manga : quand Luffy atteindra la fin de son voyage, il scellera pour l'éternité la légende de Joy Boy.",
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
    question: "Qu'est-ce que la Théorie des Fous du Bus ?",
    answer:
      "C'est la thèse selon laquelle le Siècle Oublié de One Piece ne s'est pas déroulé il y a 800 ans dans un passé lointain, mais se déroule en direct dans le présent depuis le chapitre 1. Les Ponéglyphes sont des stèles venues du futur, Joy Boy est le nom de règne de Luffy, et Laugh Tale est une époque (Lodestar dans le futur).",
  },
  {
    question: "Pourquoi Roger était-il arrivé 'trop tôt' de 25 ans ?",
    answer:
      "Parce que Laugh Tale n'est pas une coordonnée géographique mais temporelle. Roger est arrivé physiquement sur la dernière île (Lodestar), mais 25 ans avant la naissance et l'éveil du libérateur Joy Boy (Luffy). Il a donc découvert l'histoire sans pouvoir accomplir le serment.",
  },
  {
    question: "Pourquoi aucune arme ne peut détruire un Ponéglyphe ?",
    answer:
      "Les stèles sont indestructibles depuis 800 ans car elles ont été façonnées dans le futur, avec une technologie et des matériaux qui n'existent pas encore à cette époque. C'est la mémoire inviolable de l'avenir envoyée dans le passé par Nefertari Lili et sculptée par Kozuki Momonosuke.",
  },
  {
    question: "Comment Barbe Noire est-il lié à Davy Jones ?",
    answer:
      "Davy Jones n'est pas un corsaire antique mais le titre maudit que l'histoire donnera à Marshall D. Teach après sa tentative sanglante de renverser l'ordre mondial et de prendre le Trône Vacant. Imu confond les actions du père (Rocks D. Xebec) et celles du fils (Teach).",
  },
  {
    question: "Qu'est-ce que le trésor One Piece selon cette théorie ?",
    answer:
      "Le One Piece est l'histoire même de Luffy, le récit de son aventure et de la libération du monde que Roger a lu en riant ('He Laughed'). C'est l'histoire complète qui boucle la causalité du manga, de la première page à la dernière.",
  },
  {
    question: "Quel rôle joue le bus dans cette aventure ?",
    answer:
      "Le bus au chapeau de paille symbolise le rassemblement de tous les lecteurs et nakamas à travers le monde. À chaque nouveau visiteur, le bus accueille un nouveau passager et s'allonge en direct, filant sur Grand Line à la poursuite du Siècle Oublié et de Laugh Tale !",
  },
];
