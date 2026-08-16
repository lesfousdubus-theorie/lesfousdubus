export type TimelineStatus = 'canon' | 'central' | 'hypothese' | 'projection';

export type TimelineEra =
  'traces' | 'veille' | 'roger' | 'voyage' | 'present' | 'guerre' | 'aube' | 'retour';

export type TimelineThread = 'monde' | 'joyboy' | 'figures' | 'armes' | 'memoire';

export interface TimelineLink {
  label: string;
  href: string;
}

export interface TheoryTimelineEvent {
  id: string;
  date: string;
  era: TimelineEra;
  thread: TimelineThread;
  icon: string;
  title: string;
  summary: string;
  detail: string;
  status: TimelineStatus;
  chapter?: string;
  image?: string;
  imageAlt?: string;
  links: TimelineLink[];
}

export const timelineEras: Array<{
  id: TimelineEra;
  label: string;
  range: string;
  description: string;
}> = [
  {
    id: 'traces',
    label: 'Les traces',
    range: '≈ −900 à −200',
    description: 'Les éléments que le monde prend pour un passé antique.',
  },
  {
    id: 'veille',
    label: 'La longue veille',
    range: '−700 à −40',
    description: 'Les peuples, les croyances et les chantiers se préparent.',
  },
  {
    id: 'roger',
    label: 'Roger comprend',
    range: '−39 à −12',
    description: 'L’équipage arrive trop tôt et transmet le rendez-vous.',
  },
  {
    id: 'voyage',
    label: 'Les pièces avancent',
    range: '−6 à −2',
    description: 'Les acteurs modernes prennent leur place sans connaître leur rôle.',
  },
  {
    id: 'present',
    label: 'Le présent du récit',
    range: 'Wano → Elbaf',
    description: 'Les légendes commencent à reconnaître leurs visages.',
  },
  {
    id: 'guerre',
    label: 'La guerre finale',
    range: 'Avenir proche',
    description: 'La théorie projette la coalition, le Déluge et les Armes antiques.',
  },
  {
    id: 'aube',
    label: 'Le monde nouveau',
    range: 'Après la victoire',
    description: 'Les rêves deviennent les mythes que le passé connaît déjà.',
  },
  {
    id: 'retour',
    label: 'La mémoire repart',
    range: '↺ Vers le passé',
    description: 'Les causes sont renvoyées vers leurs propres conséquences.',
  },
];

export const timelineThreads = {
  monde: { label: 'Le monde', shortLabel: 'Monde' },
  joyboy: { label: 'Luffy, Nika et Joy Boy', shortLabel: 'Joy Boy' },
  figures: { label: 'Les figures légendaires', shortLabel: 'Figures' },
  armes: { label: 'Les Armes antiques', shortLabel: 'Armes' },
  memoire: { label: 'La mémoire et le temps', shortLabel: 'Mémoire' },
} satisfies Record<TimelineThread, { label: string; shortLabel: string }>;

export const timelineStatus = {
  canon: { label: 'Établi dans le manga', shortLabel: 'Manga' },
  central: { label: 'Noyau de la théorie', shortLabel: 'Théorie' },
  hypothese: { label: 'Hypothèse à confirmer', shortLabel: 'Hypothèse' },
  projection: { label: 'Projection de la fin', shortLabel: 'Projection' },
} satisfies Record<TimelineStatus, { label: string; shortLabel: string }>;

const images = {
  origin: '/images/threads/les-bases-du-siecle-oublie/img_1.webp',
  lili: '/images/threads/lili-vivi-et-les-poneglyphes/img_1.webp',
  liliStones: '/images/threads/lili-vivi-et-les-poneglyphes/img_3.webp',
  emeth: '/images/threads/emeth-robot-du-futur/img_3.webp',
  emethFranky: '/images/threads/emeth-robot-du-futur/img_1.webp',
  davy: '/images/threads/barbe-noire-davy-jones/img_1.webp',
  kings: '/images/threads/coalition-des-20-rois/img_1.webp',
  imu: '/images/threads/la-prescience-et-imu/img_1.webp',
  deluge: '/images/threads/le-deluge-et-all-blue/img_1.webp',
  allBlue: '/images/threads/le-deluge-et-all-blue/img_4.webp',
  ohara: '/images/threads/professeur-clover-et-ohara/img_1.webp',
  poneglyph: '/images/threads/professeur-clover-et-ohara/img_3.webp',
  roger: '/images/threads/silhouette-scan-1181-roger/img_6.webp',
  zoro: '/images/threads/zoro-est-ryuma/img_1.webp',
  galley: '/images/threads/galley-la-coincidence-impossible/img_1.webp',
  pluton: '/images/threads/galley-la-coincidence-impossible/img_11.webp',
} as const;

export const theoryTimeline: TheoryTimelineEvent[] = [
  {
    id: 'traces-du-futur',
    date: '≈ −900 ans',
    era: 'traces',
    thread: 'memoire',
    icon: '⌁',
    title: 'Des traces du futur atteignent le passé',
    summary:
      'La théorie fait commencer la chronologie par ses conséquences : textes, pierres et souvenirs arrivent avant leur création.',
    detail:
      'Le point de départ n’est pas une civilisation disparue mais une information déplacée. Les Ponéglyphes, le Harley et certains êtres auraient été envoyés vers des époques anciennes. Le monde les date alors naturellement de neuf siècles, sans pouvoir savoir qu’ils viennent de son avenir.',
    status: 'central',
    image: images.origin,
    imageAlt: 'Composition visuelle autour du Siècle oublié et du One Piece',
    links: [{ label: 'Les bases de la théorie', href: '/theorie/siecle-oublie-present' }],
  },
  {
    id: 'imu-lit-avenir',
    date: '≈ −900 ans',
    era: 'traces',
    thread: 'figures',
    icon: '◉',
    title: 'Imu découvre une histoire à empêcher',
    summary:
      'Imu lirait les noms de Joy Boy, Lili, Poséidon et Davy Jones avant même que ces figures n’existent.',
    detail:
      'Dans cette lecture, Imu n’est pas témoin d’une ancienne guerre : il devient le gardien anxieux d’une prophétie. Sa peur du Jour du serment le pousse à construire un pouvoir mondial destiné à empêcher l’avenir, mais huit siècles de répression créent précisément le besoin d’un libérateur.',
    status: 'hypothese',
    image: images.imu,
    imageAlt: 'Imu dans la chambre fleurie de Mary Geoise',
    links: [{ label: 'Imu Nerona', href: '/theorie/imu-nerona' }],
  },
  {
    id: 'siecle-oublie-officiel',
    date: '≈ −800 ans',
    era: 'traces',
    thread: 'monde',
    icon: '◐',
    title: 'Le récit officiel du Siècle oublié',
    summary:
      'Une civilisation avancée aurait affronté vingt royaumes avant d’être effacée de l’Histoire.',
    detail:
      'Le manga établit un siècle interdit, une guerre gigantesque et un monde englouti. La théorie conserve ces éléments mais déplace leur cause : les documents anciens décriraient la guerre finale encore à venir, et non une guerre déjà terminée huit siècles auparavant.',
    status: 'canon',
    chapter: 'Ch. 395, 1115–1116',
    image: images.kings,
    imageAlt: 'Silhouettes des familles fondatrices du Gouvernement mondial',
    links: [{ label: 'Le Siècle oublié', href: '/theorie/siecle-oublie' }],
  },
  {
    id: 'gouvernement-mondial',
    date: '≈ −800 ans',
    era: 'traces',
    thread: 'monde',
    icon: '♜',
    title: 'Le Gouvernement mondial s’installe',
    summary:
      'Dix-neuf familles montent à Mary Geoise tandis que le Trône vacant masque le règne d’Imu.',
    detail:
      'Cette fondation reste un fait du manga. Pour les Fous du Bus, elle serait la première réponse d’Imu aux informations venues du futur : surveiller les peuples, interdire les recherches et empêcher qu’un candidat devienne le Joy Boy décrit par les pierres.',
    status: 'canon',
    chapter: 'Ch. 907–908',
    image: images.kings,
    imageAlt: 'Les silhouettes des souverains fondateurs',
    links: [{ label: 'Gouvernement mondial', href: '/theorie/gouvernement-mondial' }],
  },
  {
    id: 'lili-dispersion',
    date: '≈ −800 ans',
    era: 'traces',
    thread: 'memoire',
    icon: '✦',
    title: 'Lili disperse les Ponéglyphes',
    summary:
      'La reine d’Alabasta refuse Mary Geoise, provoque la dispersion des pierres puis disparaît.',
    detail:
      'Le fait est attribué à Nefertari D. Lili. La théorie voit dans son portrait, ses cheveux bleus et sa disparition le futur visage de Vivi. La princesse accomplirait cette mission à la fin du récit avant que les pierres soient renvoyées huit siècles en arrière.',
    status: 'canon',
    chapter: 'Ch. 1084–1085',
    image: images.lili,
    imageAlt: 'Imu évoquant Vivi dans la chambre fleurie',
    links: [
      { label: 'Lili, Vivi et les Ponéglyphes', href: '/theorie/vivi' },
    ],
  },
  {
    id: 'poneglyphes-apparaissent',
    date: '≈ −800 ans',
    era: 'traces',
    thread: 'memoire',
    icon: '▧',
    title: 'Les Ponéglyphes deviennent la mémoire du monde',
    summary:
      'Des pierres indestructibles guident chaque peuple vers une mission et racontent une histoire interdite.',
    detail:
      'Leur matériau, leur langue et leur résistance restent inexplicables. Dans la théorie, ce sont des objets futuristes : Robin et le savoir des Kozuki participeraient à leur rédaction et à leur gravure. L’hypothèse d’une langue inventée par Robin est une déduction séduisante mais non établie par le manga.',
    status: 'central',
    image: images.poneglyph,
    imageAlt: 'Archéologues devant un Ponéglyphe bleu',
    links: [{ label: 'Les Ponéglyphes', href: '/theorie/poneglyphes' }],
  },
  {
    id: 'missions-des-peuples',
    date: 'Dès −800 ans',
    era: 'traces',
    thread: 'monde',
    icon: '⌖',
    title: 'Chaque peuple commence sa longue mission',
    summary:
      'Ryugu garde Noah, Wano se ferme, Zou marche, Elbaf transmet et les Boucaniers entretiennent l’espoir.',
    detail:
      'Ces missions paraissent séparées, mais convergent vers le même rendez-vous. La théorie les lit comme un dispositif de préparation : pendant huit siècles, chaque nation conserve une pièce indispensable pour que la coalition de Joy Boy soit prête au Jour du serment.',
    status: 'central',
    links: [{ label: 'Peuples et royaumes', href: '/theorie/peuples-royaumes' }],
  },
  {
    id: 'nika-devient-croyance',
    date: 'Pendant 800 ans',
    era: 'traces',
    thread: 'joyboy',
    icon: '☀',
    title: 'Nika survit dans la foi des opprimés',
    summary:
      'Les esclaves, les géants et les Boucaniers transmettent le nom du Dieu Soleil malgré l’effacement organisé.',
    detail:
      'Pour la théorie, Nika n’est pas un dieu ancien réincarné. Il est le nom divin que les croyants donneront à Luffy. En continuant de nommer le libérateur, Kuma et son peuple rendent possible le miracle que le Gouvernement voulait supprimer.',
    status: 'central',
    image: images.origin,
    imageAlt: 'Le chapeau de paille au centre des pièces du mystère',
    links: [{ label: 'Kuma et la foi en Nika', href: '/theorie/kuma-foi-nika' }],
  },
  {
    id: 'ponts-du-deluge',
    date: '≈ −700 ans',
    era: 'veille',
    thread: 'monde',
    icon: '≋',
    title: 'Les ponts géants commencent à s’élever',
    summary:
      'Tequila Wolf et les autres mégastructures sont bâties très haut au-dessus des mers pendant des siècles.',
    detail:
      'Le manga présente ces chantiers démesurés sans expliquer leur but final. La transcription propose qu’Imu anticipe une montée de deux cents mètres : les ponts relieraient les quatre mers après le Déluge annoncé par les informations du futur.',
    status: 'hypothese',
    image: images.deluge,
    imageAlt: 'Un monde recouvert par une mer déchaînée',
    links: [{ label: 'Tequila Wolf', href: '/theorie/tequila-wolf' }],
  },
  {
    id: 'shandora',
    date: '−400 ans',
    era: 'veille',
    thread: 'memoire',
    icon: '♢',
    title: 'La cloche de Shandora se tait',
    summary:
      'Kalgara et Noland se promettent de se retrouver au son de la cloche d’or, ajoutant une nouvelle veille au monde.',
    detail:
      'Toutes les promesses ne datent pas de huit siècles. Celle de Shandora montre comment des missions nées à des moments différents peuvent rejoindre la trajectoire de Luffy et préparer une alliance bien plus large que le seul Royaume antique.',
    status: 'canon',
    chapter: 'Ch. 286–292',
    links: [{ label: 'Shandora et les Shandias', href: '/theorie/shandora-shandias' }],
  },
  {
    id: 'emeth-mary-geoise',
    date: '−200 ans',
    era: 'veille',
    thread: 'memoire',
    icon: '⚙',
    title: 'Emeth attaque Mary Geoise puis s’éteint',
    summary:
      'Le robot géant apparaît sans origine connue, franchit Red Line et tombe en panne devant le pouvoir mondial.',
    detail:
      'Le Gouvernement l’étudie comme une technologie inconnue. Pour la théorie, Emeth n’arrive pas du passé : construit bien plus tard par Franky et les satellites, il aurait été projeté deux cents ans en arrière avec une mission encore incomplète.',
    status: 'canon',
    chapter: 'Ch. 1067, 1125',
    image: images.emeth,
    imageAlt: 'Le robot géant Emeth étudié sur Egghead',
    links: [{ label: 'Emeth, robot du futur', href: '/theorie/emeth-futur' }],
  },
  {
    id: 'rocks-cherche-galley-la',
    date: '≈ −40 ans',
    era: 'veille',
    thread: 'figures',
    icon: '◈',
    title: 'Les Rocks cherchent une Galley-La introuvable',
    summary:
      'Une rumeur évoque déjà une armée de géants congelés, alors que l’équipage et la compagnie n’existent pas encore.',
    detail:
      'La transcription rapproche les géants de Punk Hazard, l’équipage disparu de Loki et la brigade au grand marteau. Leur légende circulerait avant leur formation parce que son récit, comme celui du One Piece, serait venu du futur.',
    status: 'hypothese',
    image: images.galley,
    imageAlt: 'Montage consacré à la Galley-La et aux géants',
    links: [
      { label: 'La coïncidence Galley-La', href: '/theorie/galley-la-coincidence-impossible' },
    ],
  },
  {
    id: 'roger-lodestar',
    date: '−39 ans',
    era: 'roger',
    thread: 'memoire',
    icon: '⌁',
    title: 'Roger atteint Lodestar et fait demi-tour',
    summary:
      'La dernière île indiquée par les Log Pose ne permet pas de franchir Red Line ni de boucler le monde.',
    detail:
      'L’équipage comprend que quatre Road Ponéglyphes sont nécessaires. La théorie interprète la quatrième coordonnée comme le temps : Lodestar serait le bon endroit, mais Laugh Tale serait ce même lieu à la bonne époque.',
    status: 'canon',
    chapter: 'Ch. 968',
    image: images.roger,
    imageAlt: 'Silhouette de Gol D. Roger dans une planche du manga',
    links: [{ label: 'Lodestar', href: '/theorie/lodestar' }],
  },
  {
    id: 'god-valley',
    date: '−38 ans',
    era: 'roger',
    thread: 'figures',
    icon: '✹',
    title: 'God Valley brise les lignées et sauve leurs héritiers',
    summary:
      'Rocks affronte le pouvoir, le clan Davy est traqué et Kuma sauve ceux qui porteront encore l’avenir.',
    detail:
      'La théorie fait de cet incident un carrefour : Imu confondrait Xebec avec Davy Jones, tandis que Kuma permettrait à Teach et à la foi en Nika de survivre. Le pouvoir viserait la mauvaise génération, encore arrivé trop tôt.',
    status: 'canon',
    chapter: 'Ch. 957 et récits récents',
    image: images.davy,
    imageAlt: 'Barbe Noire proclamant que son époque commence',
    links: [{ label: 'God Valley', href: '/theorie/god-valley' }],
  },
  {
    id: 'kuma-promet-nika',
    date: '−38 ans',
    era: 'roger',
    thread: 'joyboy',
    icon: '✚',
    title: 'Kuma promet de sauver comme Nika',
    summary:
      'Le jeune Boucanier affirme à Saturne qu’il veut libérer le plus de personnes possible comme le Dieu Soleil.',
    detail:
      'Saturne répond que cette croyance justifie l’éradication des Boucaniers. Pour la théorie, leur véritable crime est l’espoir : tant qu’une seule personne croit en Nika et transmet son nom, l’idée du libérateur ne peut pas mourir.',
    status: 'canon',
    chapter: 'Ch. 1095–1102',
    links: [{ label: 'Bartholomew Kuma', href: '/theorie/bartholomew-kuma' }],
  },
  {
    id: 'roger-laugh-tale',
    date: '≈ −25 ans',
    era: 'roger',
    thread: 'memoire',
    icon: '◎',
    title: 'Roger atteint Laugh Tale et rit',
    summary:
      'L’équipage découvre toute l’Histoire, regrette l’époque de Joy Boy et comprend être arrivé trop tôt.',
    detail:
      'C’est la scène fondatrice de la théorie. Roger ne regretterait pas un passé révolu : il aurait observé une histoire future liée à Luffy. Laugh Tale devient une double destination, Lodestar dans l’espace et l’époque de Joy Boy dans le temps.',
    status: 'canon',
    chapter: 'Ch. 967–968',
    image: images.roger,
    imageAlt: 'Gol D. Roger associé à la découverte de Laugh Tale',
    links: [{ label: 'Laugh Tale', href: '/theorie/laugh-tale' }],
  },
  {
    id: 'compte-a-rebours-poseidon',
    date: '≈ −25 ans',
    era: 'roger',
    thread: 'armes',
    icon: '♆',
    title: 'Les Rois des Mers donnent le compte à rebours',
    summary:
      'Roger apprend qu’une princesse naîtra dans dix ans et rencontrera un autre souverain quinze ans plus tard.',
    detail:
      'Dix plus quinze conduit exactement à la rencontre de Luffy et Shirahoshi. La pierre de Shandora ne mentait donc pas en plaçant Poséidon à Ryugu : Roger la lisait simplement avant la naissance de l’Arme antique.',
    status: 'canon',
    chapter: 'Ch. 967–968',
    links: [{ label: 'Poséidon', href: '/theorie/poseidon-fiche' }],
  },
  {
    id: 'roger-attend',
    date: '≈ −25 ans',
    era: 'roger',
    thread: 'joyboy',
    icon: '⌛',
    title: 'L’Oro Jackson choisit d’attendre les jeunes',
    summary:
      'Roger, Rayleigh, Crocus et plus tard Gaban deviennent les gardiens d’un rendez-vous qu’ils ne peuvent provoquer.',
    detail:
      'Ils connaissent l’histoire mais ne peuvent pas la réaliser à la place de ceux qu’elle concerne. Leur silence, le pari de Shanks et les paroles de Rayleigh prennent sens si Joy Boy n’était pas encore né et si le récit devait attendre la génération de Luffy.',
    status: 'central',
    image: images.roger,
    imageAlt: 'Gol D. Roger avant le lancement de la Grande Ère',
    links: [
      { label: 'Gol D. Roger', href: '/theorie/gol-d-roger' },
      { label: 'Scopper Gaban', href: '/theorie/scopper-gaban' },
    ],
  },
  {
    id: 'execution-roger',
    date: '−24 ans',
    era: 'roger',
    thread: 'monde',
    icon: '☠',
    title: 'Roger lance la Grande Ère de la piraterie',
    summary:
      'Son exécution transforme le One Piece en désir collectif et pousse le futur Joy Boy à prendre la mer.',
    detail:
      'Roger ne crée pas seulement une chasse au trésor. Il fabrique les conditions d’apparition de l’équipage capable de réunir les peuples. En nommant le trésor devant le monde, il empêche aussi le Gouvernement d’en effacer l’idée.',
    status: 'canon',
    chapter: 'Ch. 1',
    links: [{ label: 'L’histoire de One Piece', href: '/theorie/one-piece-histoire' }],
  },
  {
    id: 'ohara-detruite',
    date: '−22 ans',
    era: 'roger',
    thread: 'memoire',
    icon: '✎',
    title: 'Ohara est détruite, Robin survit',
    summary:
      'Le Gouvernement brûle la recherche historique mais laisse échapper celle qui pourra lire et écrire la mémoire.',
    detail:
      'En voulant supprimer la langue antique, le pouvoir place Robin sur le chemin de Luffy. La théorie lui réserve le geste final : rédiger le Rio Ponéglyphe dans une écriture que son enfance à Ohara lui aura elle-même transmise.',
    status: 'canon',
    chapter: 'Ch. 395–397',
    image: images.ohara,
    imageAlt: 'Nico Robin et les savants d’Ohara devant un Ponéglyphe',
    links: [{ label: 'Clover et Ohara', href: '/theorie/professeur-clover-et-ohara' }],
  },
  {
    id: 'vivi-et-lombre-de-lili',
    date: '≈ −18 ans',
    era: 'roger',
    thread: 'figures',
    icon: '♕',
    title: 'Vivi naît avec le visage attribué à Lili',
    summary:
      'La nouvelle princesse d’Alabasta possède les cheveux bleus et les traits du portrait conservé par Imu.',
    detail:
      'La transcription propose qu’Imu ait d’abord confondu la reine Titi avec Lili, puis reconnu Vivi comme la véritable figure annoncée. La ressemblance devient un indice narratif, mais l’identité Lili–Vivi reste une hypothèse de la théorie.',
    status: 'hypothese',
    image: images.liliStones,
    imageAlt: 'Montage rapprochant Vivi, Lili et les Ponéglyphes',
    links: [{ label: 'Nefertari Vivi', href: '/theorie/nefertari-vivi' }],
  },
  {
    id: 'naissance-shirahoshi',
    date: '≈ −16 ans',
    era: 'roger',
    thread: 'armes',
    icon: '♆',
    title: 'Poséidon naît sous le nom de Shirahoshi',
    summary:
      'La princesse capable de commander les Rois des Mers apparaît exactement au moment annoncé à Roger.',
    detail:
      'Poséidon n’est pas une machine antique mais une capacité qui renaît dans une princesse sirène. Son pouvoir sera indispensable pour déplacer Noah et sauver les habitants de Ryugu lorsque Red Line et l’île des Hommes-Poissons seront menacées.',
    status: 'canon',
    chapter: 'Ch. 649–650',
    links: [{ label: 'Shirahoshi', href: '/theorie/shirahoshi' }],
  },
  {
    id: 'chapeau-luffy',
    date: '−12 ans',
    era: 'roger',
    thread: 'joyboy',
    icon: '⌒',
    title: 'Shanks rend le chapeau à son futur propriétaire',
    summary:
      'Le Roux confie à Luffy le symbole porté avant lui par Roger et lui donne rendez-vous au sommet.',
    detail:
      'La théorie inverse l’héritage : Roger et Shanks n’auraient pas transmis leur chapeau à Joy Boy, ils auraient porté pendant des années le chapeau qui appartiendra finalement à Luffy. Le pari de Shanks commence ici.',
    status: 'central',
    chapter: 'Ch. 1',
    image: images.origin,
    imageAlt: 'Un chapeau de paille placé au cœur du mystère',
    links: [{ label: 'Shanks', href: '/theorie/shanks' }],
  },
  {
    id: 'loki-congele-equipage',
    date: '≈ −6 ans',
    era: 'voyage',
    thread: 'figures',
    icon: '❄',
    title: 'Loki aurait gelé son propre équipage',
    summary:
      'Après la mort d’Harald, le prince quitte Elbaf avec ses soldats, tandis qu’une armée de géants apparaît congelée ailleurs.',
    detail:
      'La théorie identifie ces géants à ceux de Punk Hazard. Ragnir aurait permis une congélation instantanée destinée à les protéger. Ils deviendraient plus tard l’escouade au grand marteau, future Galley-La de la guerre finale.',
    status: 'hypothese',
    image: images.galley,
    imageAlt: 'Indices visuels reliant Loki, les géants et la Galley-La',
    links: [{ label: 'Loki', href: '/theorie/loki' }],
  },
  {
    id: 'galley-la-company',
    date: '−5 ans',
    era: 'voyage',
    thread: 'armes',
    icon: '⚒',
    title: 'La Galley-La Company est créée à Water Seven',
    summary:
      'Icebarg rassemble sept compagnies navales sous un nom identique à celui d’une légendaire brigade de géants.',
    detail:
      'Cette coïncidence est centrale dans la transcription. La compagnie humaine et l’équipage de Loki finiraient par fusionner : les meilleurs charpentiers du monde disposeraient enfin de la taille nécessaire pour transformer une île entière en navire.',
    status: 'canon',
    chapter: 'Ch. 326',
    image: images.galley,
    imageAlt: 'Montage sur la Galley-La Company et les géants charpentiers',
    links: [{ label: 'Galley-La', href: '/theorie/galley-la-coincidence-impossible' }],
  },
  {
    id: 'depart-luffy',
    date: '−2 ans',
    era: 'voyage',
    thread: 'joyboy',
    icon: '↗',
    title: 'Luffy prend la mer depuis East Blue',
    summary:
      'Le garçon qui ignore les légendes commence sa traversée linéaire de Grand Line vers le point où la fin rejoint le début.',
    detail:
      'Son voyage réveille les pièces préparées pendant des siècles. Dans la théorie, chaque île libérée, chaque promesse et chaque nouvel allié écrivent déjà le Siècle oublié que Robin rassemblera plus tard sur les pierres.',
    status: 'canon',
    chapter: 'Ch. 1',
    image: images.origin,
    imageAlt: 'Le chapeau de Luffy symbolisant le début de son voyage',
    links: [{ label: 'Monkey D. Luffy', href: '/theorie/luffy' }],
  },
  {
    id: 'doflamingo-rejoue-roi',
    date: '−2 ans → présent',
    era: 'voyage',
    thread: 'figures',
    icon: '♜',
    title: 'Doflamingo rejoue le roi Donquixote des textes',
    summary:
      'Dressrosa reproduit la même exploitation souterraine des Tontattas attribuée au souverain d’il y a neuf siècles.',
    detail:
      'Le démon céleste, l’usine cachée et le retour des Riku composent un miroir presque exact. La théorie propose que l’ancien roi cruel ne soit pas un ancêtre : ce serait Doflamingo lui-même devenu sa propre caricature historique.',
    status: 'hypothese',
    links: [
      { label: 'Doflamingo et le roi Donquixote', href: '/theorie/donquixote-roi-antique' },
      { label: 'Les Dragons célestes', href: '/theorie/dragons-celestes' },
    ],
  },
  {
    id: 'promesses-du-voyage',
    date: '−2 ans → présent',
    era: 'voyage',
    thread: 'monde',
    icon: '∞',
    title: 'Les nations libérées deviennent une coalition',
    summary:
      'Alabasta, Skypiea, Water Seven, Ryugu, Dressrosa, Zou, Wano et Elbaf sont reliés par les actes de l’équipage.',
    detail:
      'La faction de Joy Boy n’apparaîtrait pas soudainement pendant la guerre. Luffy la construit depuis le début sans chercher à commander. Chacun des peuples rencontrés apporte une armée, un savoir, un navire ou une promesse.',
    status: 'central',
    links: [{ label: 'La grande guerre', href: '/theorie/grande-guerre' }],
  },
  {
    id: 'iceburg-reve-pluton',
    date: '−2 ans — Water Seven',
    era: 'voyage',
    thread: 'armes',
    icon: '⚓',
    title: 'Icebarg rêve de faire flotter Water Seven',
    summary:
      'Face à Aqua Laguna, le maire veut transformer toute l’île en navire, mais l’ouvrage dépasse la force humaine.',
    detail:
      'Pour la théorie, ce projet est déjà le commencement de Pluton. Les géants de la Galley-La apporteront la puissance de construction nécessaire, tandis que Water Seven offrira ses canaux, ses arsenaux et son expérience des vagues.',
    status: 'canon',
    chapter: 'Ch. 431',
    image: images.pluton,
    imageAlt: 'Indices visuels autour de Water Seven et de Pluton',
    links: [{ label: 'Pluton et Water Seven', href: '/theorie/pluton-water-seven-galley-la' }],
  },
  {
    id: 'promesse-shirahoshi',
    date: 'Il y a quelques mois',
    era: 'voyage',
    thread: 'armes',
    icon: '♆',
    title: 'Luffy promet à Shirahoshi de voir le soleil',
    summary:
      'L’équipage promet cinq fois à la princesse qu’il reviendra l’emmener à la surface et lui montrer une vraie forêt.',
    detail:
      'La transcription identifie cette scène à la promesse attribuée à Joy Boy et Poséidon. La lettre d’excuses ne raconterait donc pas un échec ancien : elle demanderait au passé de construire Noah afin que Luffy puisse tenir sa promesse future.',
    status: 'central',
    chapter: 'Ch. 653',
    links: [{ label: 'La promesse de Poséidon', href: '/theorie/poseidon-fiche' }],
  },
  {
    id: 'nika-eveil',
    date: 'Présent — Wano',
    era: 'present',
    thread: 'joyboy',
    icon: '☀',
    title: 'Les Tambours de la Libération résonnent',
    summary: 'Luffy meurt, éveille la forme blanche et Zunesha annonce que Joy Boy est revenu.',
    detail:
      'Le manga établit l’éveil de Nika. La théorie place ici la naissance réelle de Joy Boy : Kaido avait défini le libérateur comme celui qui parviendrait à le vaincre. Le titre n’est plus seulement attendu, il commence à être attribué à Luffy.',
    status: 'canon',
    chapter: 'Ch. 1043–1049',
    image: images.origin,
    imageAlt: 'Le chapeau de paille au centre de la révélation du Siècle oublié',
    links: [{ label: 'Hito Hito no Mi, modèle Nika', href: '/theorie/hito-hito-no-mi-nika' }],
  },
  {
    id: 'kaido-gardien',
    date: 'Présent — Wano',
    era: 'present',
    thread: 'joyboy',
    icon: '竜',
    title: 'Kaido valide celui qui peut devenir Joy Boy',
    summary:
      'Le miroir destructeur de Luffy tombe face à une liberté fondée sur le rire plutôt que sur la guerre permanente.',
    detail:
      'Kaido attendait celui qui le vaincrait et reprendrait son objectif de renverser le Gouvernement sans sa haine. Pour la théorie, il est la preuve narrative que Joy Boy n’a pas vécu dans un passé inaccessible : il naît de cette victoire.',
    status: 'central',
    links: [{ label: 'Kaido', href: '/theorie/kaido' }],
  },
  {
    id: 'lulusia',
    date: 'Présent — Egghead',
    era: 'present',
    thread: 'armes',
    icon: '▼',
    title: 'Lulusia disparaît et la mer monte',
    summary:
      'Une fraction de Mother Flame alimente une puissance céleste et l’effacement d’une île élève les océans d’un mètre.',
    detail:
      'Le manga relie l’énergie de Vegapunk à une arme détenue par Imu. La théorie y voit la naissance moderne d’Uranus : non pas une relique retrouvée, mais une invention que le pouvoir vient seulement d’obtenir.',
    status: 'canon',
    chapter: 'Ch. 1060, 1089, 1116',
    image: images.deluge,
    imageAlt: 'Une mer sombre et violente annonçant la montée des eaux',
    links: [{ label: 'Mother Flame', href: '/theorie/mother-flame' }],
  },
  {
    id: 'emeth-reconnait-luffy',
    date: 'Présent — Egghead',
    era: 'present',
    thread: 'memoire',
    icon: '⚙',
    title: 'Emeth reconnaît Joy Boy en Luffy',
    summary:
      'Le robot dit être heureux de le revoir, puis croit avoir confondu Luffy avec un ancien ami qui lui ressemble.',
    detail:
      'Dans la théorie, Emeth ne se trompe qu’à moitié : il connaît le Luffy de la fin, mais rencontre celui qui n’est pas encore devenu Joy Boy. Ses souvenirs seraient ceux d’un avenir déjà vécu pour lui.',
    status: 'central',
    chapter: 'Ch. 1120–1122',
    image: images.emeth,
    imageAlt: 'Le robot Emeth sur Egghead',
    links: [{ label: 'Emeth, robot du futur', href: '/theorie/emeth-futur' }],
  },
  {
    id: 'haki-du-futur',
    date: 'Présent — Egghead',
    era: 'present',
    thread: 'joyboy',
    icon: 'ϟ',
    title: 'Un Haki venu de la fin sauve Luffy',
    summary:
      'Emeth défait un nœud qui libère le Haki des Rois de Joy Boy et repousse les Cinq Doyens.',
    detail:
      'La transcription compare cette scène au Patronus du Prisonnier d’Azkaban : Luffy serait sauvé par une puissance qu’il scellera lui-même plus tard. L’effet précède sa cause, sans modifier le passé ; il le complète.',
    status: 'hypothese',
    chapter: 'Ch. 1122',
    image: images.emethFranky,
    imageAlt: 'Franky et la technologie associée à Emeth',
    links: [{ label: 'La voix de Joy Boy', href: '/theorie/voix-de-joy-boy' }],
  },
  {
    id: 'message-vegapunk',
    date: 'Présent — Egghead',
    era: 'present',
    thread: 'monde',
    icon: '≋',
    title: 'Vegapunk annonce le Déluge et la guerre inachevée',
    summary:
      'Le scientifique révèle un monde ancien sous deux cents mètres d’eau et affirme que la guerre se poursuit encore.',
    detail:
      'La théorie prend cette formulation au sens littéral : la bataille du Siècle oublié est toujours d’actualité parce qu’elle n’a pas encore atteint son dénouement. Lulusia n’en serait que la première secousse.',
    status: 'canon',
    chapter: 'Ch. 1113–1121',
    image: images.deluge,
    imageAlt: 'La mer se soulevant autour d’un monde menacé',
    links: [{ label: 'Le Déluge et All Blue', href: '/theorie/deluge-all-blue' }],
  },
  {
    id: 'satellites-weatheria',
    date: 'Présent — après Egghead',
    era: 'present',
    thread: 'armes',
    icon: '⌘',
    title: 'Les satellites contactent Weatheria',
    summary:
      'Les survivants de Vegapunk rejoignent Haredas, spécialiste des nœuds capables de conserver le vent.',
    detail:
      'Pour la transcription, cette destination prépare le Haki Node : la technologie des Weather Nodes remplacera le vent par le Haki de Luffy. Franky et Lilith pourront ensuite reconstruire Emeth avec cette arme secrète.',
    status: 'central',
    chapter: 'Ch. 1125',
    image: images.emethFranky,
    imageAlt: 'Franky en cyborg, futur constructeur possible d’Emeth',
    links: [{ label: 'Énergie antique', href: '/theorie/energie-antique' }],
  },
  {
    id: 'halley-elbaf',
    date: 'Présent — Elbaf',
    era: 'present',
    thread: 'memoire',
    icon: '✧',
    title: 'Le Harley décrit des scènes qui se réalisent',
    summary:
      'Le texte sacré et la fresque d’Elbaf annoncent une bête sous l’orage de neige, le Dieu Soleil et une guerre mondiale.',
    detail:
      'La précision des scènes pousse la théorie à y voir un témoignage plutôt qu’une vague prophétie. Usopp, conteur lié aux géants, pourrait en devenir l’auteur sous le nom de plume Louis Arnot et l’envoyer vers le passé.',
    status: 'hypothese',
    chapter: 'Ch. 1138 et suivants',
    image: images.origin,
    imageAlt: 'Composition autour des pièces qui forment l’histoire du monde',
    links: [{ label: 'La fresque d’Elbaf', href: '/theorie/fresque-elbaf' }],
  },
  {
    id: 'loki-nidhogg',
    date: 'Présent — Elbaf',
    era: 'present',
    thread: 'figures',
    icon: '♢',
    title: 'Loki prend le visage de Nidhogg',
    summary:
      'Le prince possède Ragnir, voyage avec Ratatosk et se transforme en dragon comme le Dieu de la guerre du folklore.',
    detail:
      'La théorie ne voit pas une réincarnation mais la naissance de la légende. Comme Luffy devient Nika par ses actes, Loki deviendrait Nidhogg parce que les géants raconteront plus tard les événements qu’il est en train de vivre.',
    status: 'hypothese',
    image: images.galley,
    imageAlt: 'Indices reliant Loki aux géants de la Galley-La',
    links: [{ label: 'Nidhogg et Ratatoskr', href: '/theorie/nidhogg-ratatoskr' }],
  },
  {
    id: 'vingt-rois-reviennent',
    date: 'Présent — Elbaf',
    era: 'present',
    thread: 'monde',
    icon: '♛',
    title: 'Les Chevaliers Divins préparent les Vingt Rois',
    summary:
      'Les familles fondatrices quittent Mary Geoise pour reprendre les royaumes et opposer leurs armées à celles de Luffy.',
    detail:
      'La transcription identifie les rois de la guerre antique aux Chevaliers Divins actuels. Garling transformerait les épées d’Imu en souverains afin de reformer la coalition des familles fondatrices dans le présent.',
    status: 'hypothese',
    image: images.kings,
    imageAlt: 'Les familles royales fondatrices réunies',
    links: [{ label: 'Les Vingt Rois', href: '/theorie/vingt-rois-chevaliers-divins' }],
  },
  {
    id: 'teach-davy-jones',
    date: 'Avenir proche',
    era: 'guerre',
    thread: 'figures',
    icon: '☠',
    title: 'Teach devient Davy Jones',
    summary:
      'Le dernier héritier Davy vise le monde, Mary Geoise et le trône qu’Imu lui refuse depuis des générations.',
    detail:
      'Barbe Noire accomplirait la promesse de Xebec en renversant le roi caché. Héritier du clan Davy, il recevrait le titre de Jones — Roi du Monde —, l’autre face de la pièce opposée à Joy Boy.',
    status: 'projection',
    image: images.davy,
    imageAlt: 'Marshall D. Teach proclamant le début de son époque',
    links: [{ label: 'Barbe Noire et Davy Jones', href: '/theorie/barbe-noire-davy-jones' }],
  },
  {
    id: 'coalition-finale',
    date: 'La guerre commence',
    era: 'guerre',
    thread: 'monde',
    icon: '⚔',
    title: 'La coalition de Joy Boy affronte le pouvoir mondial',
    summary:
      'Les nations libérées, les géants, les Minks, les Hommes-Poissons et les anciennes victimes répondent à l’appel.',
    detail:
      'Barbe Blanche, Oden, Vegapunk et les textes d’Elbaf annoncent une bataille capable d’engloutir le monde. La théorie y réunit tous les alliés accumulés depuis East Blue contre Imu et les familles fondatrices.',
    status: 'projection',
    image: images.kings,
    imageAlt: 'Les silhouettes des rois engagés dans la guerre mondiale',
    links: [{ label: 'La guerre finale', href: '/theorie/guerre-finale' }],
  },
  {
    id: 'uranus-imu',
    date: 'Pendant la guerre',
    era: 'guerre',
    thread: 'armes',
    icon: '☄',
    title: 'Imu et Mother Flame deviennent Uranus',
    summary:
      'La puissance céleste obtenue grâce à Vegapunk frappe les royaumes rebelles depuis le ciel.',
    detail:
      'Uranus ne serait pas une arme réveillée après huit siècles. Mother Flame vient d’être inventée et donnerait à Imu, ou à une machine volante, la capacité moderne d’effacer une île entière. Le scientifique devient malgré lui le créateur de l’Arme antique.',
    status: 'projection',
    image: images.imu,
    imageAlt: 'Imu associé à la puissance qui tombe du ciel',
    links: [{ label: 'Uranus', href: '/theorie/uranus' }],
  },
  {
    id: 'deluge',
    date: 'Pendant la guerre',
    era: 'guerre',
    thread: 'monde',
    icon: '≋',
    title: 'Le niveau des mers monte jusqu’à deux cents mètres',
    summary: 'Chaque royaume effacé élève les océans et transforme la guerre en Déluge mondial.',
    detail:
      'La montée provoquée à Lulusia devient le modèle du désastre. Dragon rassemble l’humanité pour survivre, tandis que les structures construites depuis sept siècles et les navires préparés par les peuples prennent enfin leur sens.',
    status: 'projection',
    image: images.deluge,
    imageAlt: 'Une mer gigantesque recouvrant le monde',
    links: [{ label: 'Le Déluge', href: '/theorie/deluge-all-blue' }],
  },
  {
    id: 'pluton-water-seven',
    date: 'Pendant la guerre',
    era: 'guerre',
    thread: 'armes',
    icon: '⚓',
    title: 'Water Seven devient Pluton',
    summary:
      'Icebarg, Franky et l’escouade géante de Loki transforment la cité des charpentiers en île-navire de guerre.',
    detail:
      'Pluton naîtrait de la fusion de la Galley-La humaine et de la brigade au grand marteau. L’arsenal capable de détruire des îles serait le Hakoku combiné des géants, embarqués sur le plus grand navire jamais construit.',
    status: 'projection',
    image: images.pluton,
    imageAlt: 'Montage autour de Water Seven, la Galley-La et Pluton',
    links: [{ label: 'Le schéma de Pluton', href: '/explorer/schema-pluton' }],
  },
  {
    id: 'zunesha-ouvre-wano',
    date: 'Jour du serment',
    era: 'guerre',
    thread: 'armes',
    icon: '♜',
    title: 'Zunesha et Pluton ouvrent Wano',
    summary:
      'L’éléphant revient vider la cuvette, refroidir le Mont Fuji et permettre la destruction des murailles du pays.',
    detail:
      'La théorie rapproche les aqueducs de Mokomo et ceux de Water Seven. Les deux structures travailleraient ensemble pour libérer Kaido et Big Mom de la chambre magmatique, ajoutant les géants antiques à la puissance de Pluton.',
    status: 'projection',
    image: images.pluton,
    imageAlt: 'Indices reliant Water Seven, Wano et l’arme Pluton',
    links: [{ label: 'Zunesha', href: '/theorie/zunesha-fiche' }],
  },
  {
    id: 'noah-evacuation',
    date: 'Jour du serment',
    era: 'guerre',
    thread: 'armes',
    icon: '♆',
    title: 'Poséidon déplace Noah et évacue Ryugu',
    summary:
      'Shirahoshi commande les Rois des Mers pour transporter l’arche et faire monter son peuple vers le soleil.',
    detail:
      'Luffy pourrait alors tenir la promesse faite quelques mois plus tôt. La destruction annoncée de l’île des Hommes-Poissons ne serait plus un abandon : elle deviendrait l’étape nécessaire pour sauver ses habitants avant la chute de Red Line.',
    status: 'projection',
    links: [{ label: 'L’arche Noah', href: '/theorie/noah' }],
  },
  {
    id: 'red-line-tombe',
    date: 'Fin de la guerre',
    era: 'guerre',
    thread: 'monde',
    icon: '✺',
    title: 'Red Line et Mary Geoise tombent',
    summary:
      'La frontière physique et politique qui coupe la planète est détruite par l’alliance et les trois Armes antiques.',
    detail:
      'La chute de Red Line fait disparaître le verrou de Grand Line, réunit les peuples et rend enfin possible un tour complet du monde. Le Gouvernement mondial perd à la fois son sommet, son symbole et son contrôle géographique.',
    status: 'projection',
    image: images.allBlue,
    imageAlt: 'Vision d’un monde marin réunifié après la chute des frontières',
    links: [{ label: 'Red Line', href: '/theorie/red-line' }],
  },
  {
    id: 'all-blue',
    date: 'Après la guerre',
    era: 'aube',
    thread: 'monde',
    icon: '≈',
    title: 'All Blue naît de la réunion des quatre mers',
    summary:
      'Le Nord, le Sud, l’Est et l’Ouest communiquent enfin dans une mer nouvelle que personne n’a encore explorée.',
    detail:
      'Sanji ne trouve pas une mer cachée : son équipage la crée. Le rêve du cuisinier devient la géographie du monde nouveau, un refuge commun où toutes les espèces, toutes les saveurs et tous les peuples peuvent se rencontrer.',
    status: 'projection',
    image: images.allBlue,
    imageAlt: 'Un océan unique symbolisant All Blue',
    links: [{ label: 'All Blue', href: '/theorie/all-blue' }],
  },
  {
    id: 'luffy-premier-pirate',
    date: 'À l’aube du monde',
    era: 'aube',
    thread: 'joyboy',
    icon: '☀',
    title: 'Luffy devient le premier pirate du nouvel océan',
    summary:
      'En naviguant sur All Blue et en bouclant la planète, Luffy accomplit une circumnavigation que personne n’avait pu réaliser.',
    detail:
      'Il dépasse Roger non seulement en trouvant le One Piece, mais en créant le monde où ce trésor peut exister. Le « premier pirate » du texte de Vegapunk devient ainsi le premier explorateur de la mer née après la guerre.',
    status: 'projection',
    image: images.origin,
    imageAlt: 'Le chapeau de paille comme pièce centrale du monde nouveau',
    links: [{ label: 'Luffy et Joy Boy', href: '/explorer/luffy-joy-boy-nika' }],
  },
  {
    id: 'luffy-devient-joyboy',
    date: 'Après la victoire',
    era: 'aube',
    thread: 'joyboy',
    icon: '☺',
    title: 'Luffy est reconnu comme Joy Boy',
    summary:
      'À l’aboutissement de son aventure, Luffy pourrait être identifié — voire se présenter lui-même — sous le nom ou surnom de Joy Boy.',
    detail:
      'Luffy, Nika et Joy Boy ne formeraient qu’une personne vue par trois regards : son nom de naissance, son nom divin et son nom historique. Il n’est pas la réincarnation d’une légende ; ses actes produisent la légende.',
    status: 'central',
    image: images.origin,
    imageAlt: 'Le chapeau de Luffy au centre du récit du Siècle oublié',
    links: [{ label: 'Joy Boy', href: '/theorie/joy-boy' }],
  },
  {
    id: 'zoro-devient-ryuma',
    date: 'Après la victoire',
    era: 'aube',
    thread: 'figures',
    icon: '刀',
    title: 'Zoro devient Ryuma, le Dieu de la lame',
    summary:
      'Le plus grand sabreur rend ses autres lames, reprend Shusui et protège Wano sous le nom de sa propre légende.',
    detail:
      'La silhouette borgne, le dragon tranché au-dessus de la capitale et la transmission de Shusui convergent vers Zoro. La théorie projette ensuite un déplacement vers le passé qui permettra à sa dépouille de lui rendre son propre sabre sur Thriller Bark.',
    status: 'projection',
    image: images.zoro,
    imageAlt: 'Rapprochement visuel entre Zoro et Ryuma',
    links: [{ label: 'Zoro est Ryuma', href: '/theorie/ryuma' }],
  },
  {
    id: 'vivi-devient-lili',
    date: 'Après la victoire',
    era: 'aube',
    thread: 'figures',
    icon: '♕',
    title: 'Vivi devient Lili et choisit la mer',
    summary:
      'La reine d’Alabasta confie le pays à Koza, rejoint l’équipage et coordonne la dispersion de la mémoire.',
    detail:
      'Comme Lili, Vivi disparaîtrait après Mary Geoise et ne reviendrait pas gouverner. Son rôle serait politique et géographique : envoyer les pierres à chaque nation et transmettre à Alabasta l’ordre de protéger l’aube nouvelle.',
    status: 'projection',
    image: images.liliStones,
    imageAlt: 'Vivi associée à la dispersion des Ponéglyphes',
    links: [{ label: 'Vivi et Lili', href: '/theorie/lili' }],
  },
  {
    id: 'loki-devient-nidhogg',
    date: 'Après la guerre',
    era: 'aube',
    thread: 'figures',
    icon: '♢',
    title: 'Loki devient Nidhogg dans la mémoire d’Elbaf',
    summary:
      'Le prince dragon, son marteau Ragnir et Ratatosk deviennent le Dieu de la guerre des récits géants.',
    detail:
      'Le personnage n’hérite pas d’un dieu oublié : le récit de ses propres actes est renvoyé à ses ancêtres. Les représentations imparfaites du folklore s’expliquent alors comme des images reconstruites pendant des siècles.',
    status: 'projection',
    image: images.galley,
    imageAlt: 'Indices graphiques autour de Loki et de la brigade des géants',
    links: [{ label: 'Nidhogg', href: '/theorie/nidhogg-ratatoskr' }],
  },
  {
    id: 'emeth-bf39',
    date: 'Après la guerre',
    era: 'aube',
    thread: 'armes',
    icon: '39',
    title: 'Franky et Lilith construisent Emeth, le BF-39',
    summary:
      'Le dernier Battle Franky reçoit un Odyssey géant, Mother Flame et le nœud contenant le Haki de Luffy.',
    detail:
      'La forme du robot, sa pose Weapon Left et son système dorsal seraient les signatures de ses futurs créateurs. Vegapunk avait donc étudié toute sa vie une technologie que ses propres satellites et Franky allaient perfectionner.',
    status: 'projection',
    image: images.emethFranky,
    imageAlt: 'Franky réparant son corps mécanique',
    links: [{ label: 'Emeth et Franky', href: '/theorie/emeth-futur' }],
  },
  {
    id: 'chapeau-geant-emeth',
    date: 'Après la guerre',
    era: 'aube',
    thread: 'joyboy',
    icon: '⌒',
    title: 'L’équipage offre un chapeau géant à Emeth',
    summary:
      'Comme Ace pour Oars Junior, Luffy et Usopp marqueraient leur amitié avec le robot par un immense chapeau de paille.',
    detail:
      'Projeté ensuite à Mary Geoise, Emeth perdrait son chapeau pendant son attaque. Imu le conserverait dans la chambre froide comme la preuve matérielle qu’un jour un autre porteur du même symbole deviendra Joy Boy.',
    status: 'projection',
    image: images.emeth,
    imageAlt: 'Le robot Emeth, possible propriétaire du chapeau géant',
    links: [
      { label: 'Emeth, robot venu du futur', href: '/theorie/emeth-futur' },
      { label: 'Le chapeau de paille', href: '/theorie/shanks' },
    ],
  },
  {
    id: 'rio-poneglyphe-ecrit',
    date: 'Fin de l’aventure',
    era: 'aube',
    thread: 'memoire',
    icon: '✎',
    title: 'Robin et le savoir des Kozuki rédigent le Rio Ponéglyphe',
    summary:
      'La théorie propose que Robin et le savoir des Kozuki participent à la rédaction et à la gravure de la mémoire future.',
    detail:
      'La théorie propose que Robin et le savoir des Kozuki puissent participer à la rédaction et à la gravure du Rio Ponéglyphe. Robin rédigerait l’histoire vécue par l’équipage, et le savoir de gravure des Kozuki préserverait cette mémoire. L’idée d’une langue inventée par Robin reste une déduction séduisante mais non établie par le manga.',
    status: 'central',
    image: images.ohara,
    imageAlt: 'Robin et les savants d’Ohara devant la pierre de l’Histoire',
    links: [{ label: 'Le Rio Ponéglyphe', href: '/theorie/rio-poneglyphe' }],
  },
  {
    id: 'usopp-ecrit-halley',
    date: 'Fin de l’aventure',
    era: 'aube',
    thread: 'memoire',
    icon: '✧',
    title: 'Usopp écrit le Harley et devient Louis Arnot',
    summary:
      'Le plus grand affabulateur raconte les événements sous forme de légende afin de préparer Elbaf sans tout révéler.',
    detail:
      'Ses mensonges devenus vrais fondent le folklore des géants. Le texte entretient la foi en Nika, tandis que la fresque transmet l’image de la coalition finale. Usopp devient ainsi le prophète de l’histoire qu’il a vécue.',
    status: 'projection',
    image: images.origin,
    imageAlt: 'Les pièces de l’histoire assemblées autour du chapeau de paille',
    links: [{ label: 'La fresque d’Elbaf', href: '/theorie/fresque-elbaf' }],
  },
  {
    id: 'one-piece-revele',
    date: 'La conclusion rejoint le début',
    era: 'aube',
    thread: 'memoire',
    icon: '◉',
    title: 'Le One Piece devient l’histoire entière de Luffy',
    summary:
      'Le trésor n’efface pas le voyage : il révèle que l’aventure lue depuis le tome 1 était déjà le récit du Siècle oublié.',
    detail:
      'La fin rééclaire toute l’œuvre. Roger n’aurait pas seulement découvert un objet, mais le témoignage de l’équipage qui créera le monde nouveau. Luffy dépasse alors son modèle en devenant celui qui laisse le trésor que Roger a trouvé.',
    status: 'central',
    image: images.origin,
    imageAlt: 'Une pièce centrale de puzzle portant le chapeau de paille',
    links: [{ label: 'La théorie complète', href: '/theorie/theorie-complete' }],
  },
  {
    id: 'transmission-vers-passe',
    date: '↺ Époque inconnue',
    era: 'retour',
    thread: 'memoire',
    icon: '↺',
    title: 'La mémoire est envoyée vers le passé',
    summary:
      'Ponéglyphes, Harley et certains êtres traversent le temps, mais la mécanique exacte reste volontairement non résolue.',
    detail:
      'La transcription distingue plusieurs possibilités : déplacement ponctuel, transmission d’informations, communication entre époques ou préscience. La frise montre le résultat de la théorie sans transformer ce mécanisme encore inconnu en certitude.',
    status: 'hypothese',
    image: images.poneglyph,
    imageAlt: 'Un Ponéglyphe portant une écriture qui traverse les siècles',
    links: [{ label: 'Communication à travers le temps', href: '/theorie/communication-temps' }],
  },
  {
    id: 'emeth-repart-moins-200',
    date: '↺ Destination : −200 ans',
    era: 'retour',
    thread: 'memoire',
    icon: '⚙',
    title: 'Emeth repart attaquer Mary Geoise',
    summary:
      'Le BF-39 quitte l’époque de Joy Boy et devient le robot incompréhensible découvert deux siècles avant Egghead.',
    detail:
      'Sa mission, sa corrosion et son erreur de datation forment une boucle fermée. Le Gouvernement pense étudier une antiquité, puis Vegapunk et Franky utilisent ces recherches pour construire précisément la machine qu’ils ont sous les yeux.',
    status: 'projection',
    image: images.emeth,
    imageAlt: 'Emeth, le robot qui relie le futur au passé',
    links: [{ label: 'Emeth, robot du futur', href: '/theorie/emeth-futur' }],
  },
  {
    id: 'ryuma-repart-wano',
    date: '↺ Destination : Wano ancien',
    era: 'retour',
    thread: 'figures',
    icon: '刀',
    title: 'La légende de Ryuma est déposée dans le passé',
    summary:
      'Zoro et Shusui rejoindraient l’ancien Wano, permettant au sabreur de devenir l’ancêtre qu’il admirait sans le savoir.',
    detail:
      'C’est l’une des projections physiques les plus spéculatives de la transcription. Elle explique la dépouille de Ryuma, son œil, son sabre et la rencontre de Thriller Bark, mais dépend d’un déplacement temporel dont le mécanisme reste inconnu.',
    status: 'hypothese',
    image: images.zoro,
    imageAlt: 'Zoro et Ryuma représentés côte à côte',
    links: [{ label: 'Ryuma', href: '/theorie/ryuma' }],
  },
  {
    id: 'royaume-antique-futur',
    date: '↺ Destination : ≈ −900 ans',
    era: 'retour',
    thread: 'monde',
    icon: '⌁',
    title: 'Le monde nouveau devient le « Royaume antique »',
    summary:
      'Les inventions de Vegapunk, Franky et leurs alliés sont prises pour les vestiges d’une civilisation disparue.',
    detail:
      'L’avance technologique du Royaume antique s’explique parce qu’elle est réellement future. Le passé reçoit les résultats des inventions modernes, les date selon leur arrivée et bâtit autour d’elles le récit que le Gouvernement cherchera à effacer.',
    status: 'hypothese',
    image: images.origin,
    imageAlt: 'Le mystère du Siècle oublié assemblé comme un puzzle',
    links: [{ label: 'Le Royaume antique', href: '/theorie/royaume-antique' }],
  },
  {
    id: 'laugh-tale-est-lodestar',
    date: '↺ Le futur devient une destination',
    era: 'retour',
    thread: 'memoire',
    icon: '◎',
    title: 'Lodestar devient Laugh Tale à l’époque de Luffy',
    summary:
      'Le quatrième Road Ponéglyphe ne donne pas seulement un lieu : il permet à Roger d’atteindre le bon endroit au bon moment.',
    detail:
      'La chronologie se referme sur son idée centrale. Grand Line fonctionne comme une frise qui entoure un globe : lorsque le voyage arrive au bout, il rencontre son commencement. La question n’est plus seulement « où ? », mais « quand ? ».',
    status: 'central',
    image: images.roger,
    imageAlt: 'Roger face au mystère de la destination finale',
    links: [{ label: 'Road Ponéglyphes et temps', href: '/explorer/road-poneglyphes-temps' }],
  },
];
