import { THEORY_VIDEO_URL } from "./theory-video";

/** Même récit pour la modale et les versions texte. */
export interface FAQItem {
  question: string;
  answer: string;
}

export interface TheorySource {
  label: string;
  url: string;
}

export interface TheoryPoint {
  id: string;
  icon: string;
  title: string;
  summary: string;
  sources?: readonly TheorySource[];
  note?: string;
}

export interface TheoryGroup {
  id: string;
  title: string;
  sections: readonly TheoryPoint[];
}

export const THEORY_REFERENCES = {
  video: { label: "La vidéo complète", url: THEORY_VIDEO_URL },
  threads: { label: "Les fils sur X", url: "https://x.com/FoudubusTV_/status/2088930077761315057" },
  mechanism: { label: "Le fonctionnement de la théorie", url: "https://x.com/FoudubusTV_/status/2099136445512335403" },
  nika: { label: "Luffy, Joy Boy et Nika", url: "https://x.com/FoudubusTV_/status/2088338383332311085" },
  ohara: { label: "La volonté d’Ohara", url: "https://x.com/FoudubusTV_/status/2087927875521429909" },
  prescience: { label: "La communication entre époques", url: "https://x.com/FoudubusTV_/status/2077434523428548915" },
  roger: { label: "L’ambiguïté autour de Roger", url: "https://x.com/FoudubusTV_/status/2078143309671743663" },
  mural: { label: "La fresque du Harley", url: "https://x.com/FoudubusTV_/status/2091193422019232206" },
  swordAndShield: { label: "La piste de l’épée et du bouclier · spoilers", url: "https://x.com/FoudubusTV_/status/2115801685972967828" },
} satisfies Record<string, TheorySource>;

export const CENTRAL_THESIS = {
  title: "Le Siècle Oublié est le Présent",
  subtitle: "Et si les légendes du passé racontaient l’aventure que Luffy et ses compagnons sont en train de vivre ?",
  overview:
    "À la fin de leur aventure, les Mugiwara feraient graver leur histoire sur les Ponéglyphes, puis les enverraient dans le passé. Ces messages permettraient aux peuples de préparer pendant des siècles les conditions de leur victoire. Les héros découvriraient ainsi des légendes dont ils sont eux-mêmes à l’origine.",
  context:
    "Le passé du monde resterait réel : ce seraient les événements attribués au Siècle Oublié qui appartiendraient au présent et à l’avenir.",
};

export const THEORY_FOUNDATIONS = [
  {
    title: "Pourquoi envoyer ces messages ?",
    text: "La victoire serait possible grâce aux peuples préparés par les Ponéglyphes. Après la bataille, les héros enverraient donc les messages qui ont permis cette préparation.",
  },
  {
    title: "Une seule histoire",
    text: "Le futur compléterait le passé déjà connu. Le monde ne recommencerait pas : après l’envoi des pierres, la vie continuerait et chacun n’aurait vécu qu’une seule aventure.",
  },
  {
    title: "Des héros libres de leurs choix",
    text: "Luffy agirait pour ses amis et ses convictions. Les légendes raconteraient ensuite ses choix : ce serait lui qui ferait naître Joy Boy en accomplissant sa propre aventure.",
  },
] as const;

export const THEORY_GROUPS: readonly TheoryGroup[] = [
  {
    id: "heros-et-legendes",
    title: "Les héros derrière les légendes",
    sections: [
      {
        id: "joy-boy", icon: "👑",
        title: "Luffy deviendrait Joy Boy",
        summary: "Joy Boy serait le nom donné par les peuples à Luffy, leur libérateur. Sa victoire sur Kaido en amorcerait la reconnaissance ; la libération du monde achèverait sa légende. Luffy serait ainsi à l’origine du héros que tous attendent.",
      },
      {
        id: "nika", icon: "☀️",
        title: "Nika, Joy Boy et Luffy : une même personne",
        summary: "Luffy serait son nom personnel, Joy Boy son nom légendaire et Nika son nom divin pour les croyants. La foi de Kuma jouerait un rôle concret : en protégeant les Mugiwara, il permettrait au libérateur espéré d’accomplir son parcours.",
        sources: [THEORY_REFERENCES.nika],
      },
      {
        id: "vivi-lili", icon: "🌺",
        title: "Vivi serait Lili",
        summary: "La reine disparue serait Vivi, qui choisirait l’aventure et disperserait les Ponéglyphes. Sa lettre demanderait à ses ancêtres de protéger ces messages jusqu’à l’aube nouvelle. Koza pourrait reprendre le royaume, devenant le « frère » évoqué par la légende.",
      },
      {
        id: "zoro-ryuma", icon: "⚔️",
        title: "Zoro serait Ryuma",
        summary: "Zoro serait Ryuma, le sabreur dont la légende inspirait Kuina. Son dragon serait Kaido, blessé au-dessus de la capitale des Fleurs. Après son rêve accompli, Zoro pourrait confier ses sabres à Tashigi, reprendre Shusui et être envoyé dans le passé, expliquant la dépouille de Ryuma.",
        note: "Une piste plus spéculative, qui suppose aussi un déplacement physique dans le temps.",
      },
      {
        id: "teach-davy-jones", icon: "🏴‍☠️",
        title: "Teach deviendrait Davy D. Jones",
        summary: "Le survivant du clan Davy accomplirait la promesse de sa lignée en renversant Imu et en prenant le Trône Vacant. Imu aurait confondu son père Xebec avec lui. Teach deviendrait ainsi le roi du monde annoncé par la légende.",
      },
      {
        id: "doflamingo", icon: "🦩",
        title: "Le roi Donquixote serait Doflamingo",
        summary: "Le récit de l’ancien tyran raconterait le règne de Doflamingo : des Tontattas exploités en secret, des humains profitant de leur travail, puis un roi Riku rétablissant la paix. L’histoire de Dressrosa serait devenue celle de son passé supposé.",
      },
      {
        id: "loki-nidhogg", icon: "🐉",
        title: "Loki deviendrait Nidhogg",
        summary: "Le dragon, Ragnir et Ratatosk feraient de Loki la figure à l’origine du dieu de la guerre des géants. Les représentations différentes viendraient de leur interprétation de la légende. Son opposition annoncée à Nika resterait une piste à comprendre.",
      },
    ],
  },
  {
    id: "transmettre-histoire",
    title: "Ceux qui transmettraient l’histoire",
    sections: [
      {
        id: "robin-poneglyphes", icon: "📜",
        title: "Robin écrirait le Rio Ponéglyphe",
        summary: "Robin composerait le récit et son écriture, Momonosuke graverait les pierres grâce au savoir transmis par Sukiyaki, puis Vivi les disperserait. Robin découvrirait qu’elle étudie sa propre œuvre : une mémoire destinée à préparer les peuples et à résister à l’effacement.",
      },
      {
        id: "usopp-harley", icon: "📖",
        title: "Usopp écrirait le Harley",
        summary: "Usopp raconterait l’aventure de son capitaine sous la forme d’une légende transmise aux géants. Il pourrait aussi être Louis Arnot, l’auteur d’aventures extraordinaires. En inspirant leur peuple et le culte de Nika, il accomplirait son rêve de grand guerrier des mers.",
      },
      {
        id: "fresque-harley", icon: "🎨",
        title: "La fresque serait un récit illustré",
        summary: "Les géants, peut-être des enfants, auraient illustré les textes reçus du futur avec leurs propres codes. Cela expliquerait les ressemblances avec les héros actuels et certaines différences. L’épée et le bouclier pourraient même évoquer Zoro et Sanji.",
        note: "Ce dernier rapprochement est une piste récente, issue de spoilers et encore à confirmer.",
        sources: [THEORY_REFERENCES.mural, THEORY_REFERENCES.swordAndShield],
      },
      {
        id: "volonte-ohara", icon: "🌳",
        title: "Robin achèverait la volonté d’Ohara",
        summary: "Clover, Olvia et Vegapunk auraient entretenu la recherche de vérité jusqu’à la génération de Luffy. En écrivant les Ponéglyphes, Robin achèverait cette transmission tout en participant à son origine. Cette transmission pourrait aussi éclairer la volonté du D.",
        sources: [THEORY_REFERENCES.ohara],
      },
    ],
  },
  {
    id: "technologies-du-futur",
    title: "Des inventions prises pour des vestiges",
    sections: [
      {
        id: "ancien-royaume", icon: "🏙️",
        title: "L’Ancien Royaume appartiendrait à l’avenir",
        summary: "La civilisation décrite comme ancienne serait en réalité le monde à venir. Son avance technologique viendrait notamment de Vegapunk : robots, énergie et matériaux seraient des inventions futures prises pour les vestiges d’un passé oublié.",
      },
      {
        id: "emeth", icon: "🤖",
        title: "Emeth serait le dernier Battle Franky",
        summary: "Franky et les satellites de Vegapunk construiraient Emeth, le Battle Franky 39, alimenté par leurs recherches sur l’énergie. Un nœud inspiré de ceux d’Haredas conserverait le Haki futur de Luffy. Envoyé à une époque située deux siècles avant le présent, le robot sauverait ensuite ses créateurs sur Egghead.",
      },
      {
        id: "chapeau-geant", icon: "👒",
        title: "Le chapeau géant serait celui d’Emeth",
        summary: "Luffy et Usopp offriraient ce chapeau à Emeth pour symboliser leur amitié, comme Ace avec Oars Jr. Le robot le perdrait lors de son arrivée à Mary Geoise dans le passé. Imu le conserverait comme une trace du libérateur attendu.",
      },
    ],
  },
  {
    id: "imu-et-avenir",
    title: "Imu face à l’avenir",
    sections: [
      {
        id: "imu", icon: "👁️",
        title: "Imu chercherait à empêcher le futur",
        summary: "Imu connaîtrait les figures annoncées sans maîtriser leur identité ni leur époque, d’où les méprises possibles entre Xebec et Teach, Titi et Vivi. En réprimant les peuples pour empêcher sa chute, Imu créerait précisément le monde que Luffy devra libérer.",
      },
      {
        id: "prescience", icon: "🔮",
        title: "Des époques pourraient communiquer",
        summary: "La prescience, illustrée par Shirley, pourrait permettre de recevoir des informations d’une autre époque, voire d’échanger avec elle. Cette piste prolongerait l’explication des connaissances d’Imu et de la découverte de Roger. Le fonctionnement d’une telle communication reste inconnu.",
        sources: [THEORY_REFERENCES.prescience],
      },
      {
        id: "roger-joy-boy", icon: "🧩",
        title: "Roger aurait pu être pris pour Joy Boy",
        summary: "Avec son chapeau, son rêve et son parcours, Roger aurait pu sembler être le libérateur attendu par Imu. Certaines évocations de Joy Boy pourraient alors renvoyer à cette erreur d’identification. Cette hypothèse d’identification reste incertaine.",
        sources: [THEORY_REFERENCES.roger],
      },
    ],
  },
  {
    id: "peuples-et-guerre",
    title: "Un monde préparé à la même guerre",
    sections: [
      {
        id: "peuples", icon: "🤝",
        title: "Chaque peuple aurait sa mission",
        summary: "Les hommes-poissons protégeraient Noah, Wano préparerait son ouverture et les Minks guideraient Zunesha. Les Shandiens garderaient leur cloche d’or, Alabasta les pierres, les Boucaniers et les géants l’espoir de Nika. Chaque peuple préparerait ainsi le jour du serment : la guerre libératrice.",
        sources: [THEORY_REFERENCES.mechanism],
      },
      {
        id: "poseidon", icon: "🧜‍♀️",
        title: "Poséidon serait Shirahoshi",
        summary: "La promesse de Joy Boy serait celle de Luffy à Shirahoshi : l’emmener à la surface. Le message envoyé dans le passé demanderait de construire et protéger Noah. L’arche et les Rois des Mers permettraient alors de sauver les habitants lors du bouleversement du monde.",
      },
      {
        id: "galley-la", icon: "🔨",
        title: "La Galley-La réunirait les compagnons de Loki",
        summary: "Les géants congelés de Punk Hazard seraient l’équipage de Loki, protégé par Ragnir et Ratatosk. Une fois libérés, ils rejoindraient les charpentiers de Water Seven pour bâtir Pluton. La brigade légendaire serait ainsi une autre histoire venue du futur.",
      },
      {
        id: "pluton", icon: "🚢",
        title: "Pluton serait une création collective",
        summary: "Iceberg et les géants transformeraient Water Seven en navire. Avec Zunesha, ils ouvriraient Wano et libéreraient Kaido et Big Mom. L’alliance de ce navire et de ces forces constituerait Pluton : une puissance encore à réunir.",
      },
      {
        id: "uranus", icon: "🔥",
        title: "Mother Flame alimenterait Uranus",
        summary: "L’énergie créée par Vegapunk serait détournée pour alimenter une puissance capable de détruire des îles. Mother Flame serait son carburant ; la forme exacte d’Uranus reste ouverte, la vidéo envisageant notamment une machine volante ou Imu utilisant cette énergie.",
      },
      {
        id: "vingt-rois", icon: "♟️",
        title: "Les familles du pouvoir formeraient les Vingt Rois",
        summary: "Les familles du Gorosei et des Chevaliers Divins constitueraient la coalition décrite face à Joy Boy. Leurs représentants pourraient reprendre des royaumes et leurs armées pour affronter Luffy. Ce scénario relierait les familles fondatrices à la guerre encore à venir.",
      },
      {
        id: "deluge", icon: "🌊",
        title: "Le Déluge accompagnerait la guerre finale",
        summary: "L’usage des armes ferait monter les eaux de 200 mètres et transformerait le monde. Noah, les ponts géants et l’alliance des peuples prendraient leur sens dans cette catastrophe à venir. La guerre attribuée au passé serait celle que les héros s’apprêtent à vivre.",
      },
      {
        id: "zunesha", icon: "🐘",
        title: "Zunesha se souviendrait du futur",
        summary: "Comme Emeth, Zunesha pourrait avoir connu Luffy avant d’être envoyé dans le passé. Son attente du retour de Joy Boy prendrait alors un autre sens. La cause de sa condamnation et les circonstances de ce déplacement restent à expliquer.",
      },
    ],
  },
  {
    id: "laugh-tale-et-one-piece",
    title: "Laugh Tale et l’accomplissement des rêves",
    sections: [
      {
        id: "laugh-tale", icon: "🧭",
        title: "Laugh Tale serait Roadstar à une autre époque",
        summary: "Le bon lieu ne suffirait pas : il faudrait aussi atteindre le bon moment, lorsque Red Line aurait disparu. Les Road Ponéglyphes apporteraient cette dimension temporelle. La vidéo propose que Roger ait rejoint ce futur ; sa découverte précéderait l’aventure qui lui donne naissance.",
      },
      {
        id: "all-blue", icon: "🐟",
        title: "Sanji participerait à la création d’All Blue",
        summary: "La disparition de Red Line réunirait les quatre mers et réaliserait le rêve de Sanji. Luffy deviendrait le premier pirate à naviguer sur cette mer nouvelle : le pirate originel des légendes serait donc celui que nous suivons depuis le début.",
      },
      {
        id: "one-piece", icon: "📚",
        title: "Luffy serait à l’origine du One Piece",
        summary: "Le trésor découvert par Roger serait lié au récit complet de l’aventure de Luffy. En le créant, Luffy dépasserait celui qui l’a trouvé et deviendrait l’inspiration de son propre modèle. La forme concrète du trésor reste à découvrir.",
      },
    ],
  },
];

export const THEORY_FAQ: FAQItem[] = [
  {
    question: "D’où vient ce site et qui sont les Fous du Bus ?",
    answer: "Un projet de fans créé pour le fun autour de la théorie du Mont Corvo. Les Fous du Bus sont ceux qui montent à bord pour la découvrir, la défendre ou simplement suivre l’aventure.",
  },
  {
    question: "Quel est le but du site ?",
    answer: "Donner vie à la théorie dans un bus interactif : choisir son avatar, rejoindre les passagers et regarder la vidéo à bord. Le résumé présente les liens essentiels ; la vidéo permet d’approfondir chaque idée.",
  },
  {
    question: "Quelle est l’idée centrale ?",
    answer: "Les récits du Siècle Oublié décriraient l’aventure actuelle de Luffy. Écrits à la fin de cette aventure puis envoyés dans le passé, les Ponéglyphes prépareraient les peuples à la victoire dont ils racontent l’histoire.",
  },
  {
    question: "Pourquoi envoyer les Ponéglyphes après avoir gagné ?",
    answer: "Parce que cette victoire aurait été possible grâce aux préparatifs déclenchés par ces messages. En les envoyant après la bataille, les héros accompliraient l’action qui a permis aux peuples de les attendre et de les aider.",
  },
  {
    question: "Est-ce que l’histoire recommence en boucle ?",
    answer: "Dans cette lecture, il n’y aurait qu’une seule chronologie. Les messages auraient toujours fait partie du passé connu. Leur envoi ne remettrait pas le monde à zéro : la vie continuerait ensuite dans le futur.",
  },
  {
    question: "Les personnages restent-ils libres ?",
    answer: "La théorie présente les légendes comme le récit des choix des héros. Luffy ne chercherait pas à suivre un texte ancien : il agirait selon ses convictions, puis son aventure serait racontée. Cette lecture conserve un débat ouvert sur le destin et la liberté.",
  },
  {
    question: "Joy Boy aurait-il d’abord perdu la guerre ?",
    answer: "La théorie ne suppose pas une première aventure où Luffy aurait perdu. Le récit d’un échec et d’un retour attendu servirait à entretenir l’espoir et à préparer les peuples. Cette interprétation reste une piste.",
  },
  {
    question: "Pourquoi Roger serait-il arrivé trop tôt ?",
    answer: "Roger aurait découvert une histoire que la génération de Luffy devait encore accomplir. Il pouvait la connaître sans pouvoir réaliser à sa place la promesse attendue. La vidéo propose un voyage vers le futur ; les prolongements explorent aussi une communication entre époques.",
  },
  {
    question: "Comment expliquer la résistance des Ponéglyphes ?",
    answer: "La vidéo propose un alliage futur associant les recherches de Vegapunk au savoir des Kozuki. Les pierres pourraient aussi être détruites ultérieurement : leur résistance connue ne fixe donc pas leur destin final dans cette hypothèse.",
  },
  {
    question: "Pourquoi Emeth reconnaîtrait-il Luffy sans être reconnu ?",
    answer: "Emeth se souviendrait d’un Luffy rencontré plus tard dans l’aventure. Le Luffy actuel, lui, n’aurait pas encore vécu cette rencontre ni développé le Haki conservé dans le nœud. Ils seraient à deux moments différents de leur relation.",
  },
  {
    question: "Comment Teach serait-il lié à Davy D. Jones ?",
    answer: "Teach serait la figure dont sa famille transmet la légende. En accomplissant sa promesse et son ambition de devenir roi du monde, il deviendrait Davy D. Jones. Imu aurait pu prendre son père Xebec pour le personnage attendu.",
  },
  {
    question: "Que serait le One Piece ?",
    answer: "Il serait lié à l’histoire complète de Luffy, découverte par Roger avant d’être vécue par les Mugiwara. Luffy serait ainsi à l’origine de son propre trésor. Cette lecture narrative ne résout pas encore la question de sa forme concrète.",
  },
];
