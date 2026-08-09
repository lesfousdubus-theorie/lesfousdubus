export type TimelineStatus = 'canon' | 'central' | 'hypothese' | 'projection';

export interface TimelineLink {
  label: string;
  href: string;
}

export interface TheoryTimelineEvent {
  id: string;
  date: string;
  era: 'origines' | 'attente' | 'pirates' | 'voyage' | 'avenir' | 'boucle';
  icon: string;
  title: string;
  summary: string;
  detail: string;
  status: TimelineStatus;
  chapter?: string;
  links: TimelineLink[];
}

export const timelineEras = [
  { id: 'origines', label: 'Les traces', range: '−900 à −800' },
  { id: 'attente', label: 'L’attente', range: '−400 à −200' },
  { id: 'pirates', label: 'L’ère des pirates', range: '−39 à −12' },
  { id: 'voyage', label: 'Le voyage', range: '−2 à aujourd’hui' },
  { id: 'avenir', label: 'La guerre à venir', range: 'Prochainement' },
  { id: 'boucle', label: 'La boucle', range: 'Retour vers −800' },
] as const;

export const timelineStatus = {
  canon: { label: 'Établi par le manga', shortLabel: 'Manga' },
  central: { label: 'Noyau de la théorie', shortLabel: 'Théorie' },
  hypothese: { label: 'Hypothèse à confirmer', shortLabel: 'Hypothèse' },
  projection: { label: 'Projection de la fin', shortLabel: 'Projection' },
} satisfies Record<TimelineStatus, { label: string; shortLabel: string }>;

export const theoryTimeline: TheoryTimelineEvent[] = [
  {
    id: 'emeth-construction',
    date: '≈ −900 ans',
    era: 'origines',
    icon: '⚙️',
    title: 'Emeth est construit',
    summary: 'Le robot géant d’Egghead est daté d’environ neuf siècles.',
    detail:
      'Le manga présente Emeth comme une technologie impossible à reproduire dans le présent. Pour la théorie, cette avance est un indice : il pourrait avoir été conçu dans le futur — possiblement par Franky — avant d’être projeté dans le passé.',
    status: 'canon',
    chapter: 'Ch. 1065–1122',
    links: [{ label: 'Dossier Emeth', href: '/theorie/emeth-robot-du-futur' }],
  },
  {
    id: 'siecle-oublie-officiel',
    date: '≈ −800 ans',
    era: 'origines',
    icon: '🌑',
    title: 'Le récit officiel du Siècle oublié',
    summary: 'Une guerre aurait opposé vingt royaumes à une civilisation avancée.',
    detail:
      'C’est le cadre historique connu : un siècle effacé, un Royaume antique vaincu et la naissance du Gouvernement mondial. La théorie conserve ces éléments, mais conteste leur place sur la flèche du temps.',
    status: 'canon',
    chapter: 'Ch. 395, 1115',
    links: [{ label: 'Les bases du Siècle oublié', href: '/theorie/les-bases-du-siecle-oublie' }],
  },
  {
    id: 'gouvernement-mondial',
    date: '≈ −800 ans',
    era: 'origines',
    icon: '⚖️',
    title: 'Le Gouvernement mondial s’installe',
    summary: 'Les vingt familles fondatrices placent leurs armes devant le Trône vacant.',
    detail:
      'Dix-neuf familles montent à Mary Geoise. Imu règne pourtant dans l’ombre. Dans la lecture des Fous du Bus, ce pouvoir ne protège pas seulement un mensonge ancien : il tente d’empêcher un avenir qu’il redoute.',
    status: 'canon',
    chapter: 'Ch. 907–908',
    links: [{ label: 'Gouvernement mondial', href: '/theorie/gouvernement-mondial' }],
  },
  {
    id: 'lili-poneglyphes',
    date: '≈ −800 ans',
    era: 'origines',
    icon: '🪨',
    title: 'Lili disperse les Ponéglyphes',
    summary: 'La reine d’Alabasta refuse Mary Geoise puis disparaît.',
    detail:
      'La dispersion des pierres rend possible la transmission de l’Histoire. La théorie propose que Lili soit la figure future de Vivi : elle accomplirait cette mission après la guerre, puis les pierres seraient envoyées huit siècles en arrière.',
    status: 'canon',
    chapter: 'Ch. 1084–1085',
    links: [
      { label: 'Lili et Vivi', href: '/theorie/lili-vivi-et-les-poneglyphes' },
      { label: 'Les Ponéglyphes', href: '/theorie/poneglyphes' },
    ],
  },
  {
    id: 'missions-peuples',
    date: 'Dès −800 ans',
    era: 'origines',
    icon: '🧭',
    title: 'Les peuples commencent leur veille',
    summary: 'Chaque nation protège une mission, un objet ou une promesse.',
    detail:
      'Ryugu garde Noah, Wa no Kuni attend l’ouverture de ses frontières, Zou marche vers une destination, les Boucaniers transmettent Nika et Elbaf conserve ses textes. La théorie y voit un dispositif coordonné pour le Jour du serment.',
    status: 'central',
    links: [{ label: 'Peuples et missions', href: '/theorie/peuples-royaumes' }],
  },
  {
    id: 'nika-devient-mythe',
    date: 'Pendant 800 ans',
    era: 'origines',
    icon: '☀️',
    title: 'Nika devient une croyance',
    summary: 'Les opprimés transmettent le nom du Dieu Soleil de génération en génération.',
    detail:
      'Pour les Fous du Bus, le mythe ne précède pas nécessairement Luffy. Nika serait la traduction religieuse de l’homme que le monde appellera Joy Boy : une conséquence du futur devenue une espérance du passé.',
    status: 'central',
    links: [
      { label: 'Nika', href: '/theorie/nika' },
      { label: 'Kuma et la foi en Nika', href: '/theorie/kuma-foi-nika' },
    ],
  },
  {
    id: 'shandora',
    date: '−400 ans',
    era: 'attente',
    icon: '🔔',
    title: 'La cloche de Shandora se tait',
    summary: 'Kalgara et Noland se promettent de se retrouver au son de la cloche d’or.',
    detail:
      'Cette mission est explicitement plus récente que les huit siècles de la grande boucle. Elle montre comment plusieurs promesses locales, nées à des dates différentes, peuvent converger vers le voyage de Luffy.',
    status: 'canon',
    chapter: 'Ch. 286–292',
    links: [{ label: 'Shandora et les Shandias', href: '/theorie/shandora-shandias' }],
  },
  {
    id: 'emeth-mary-geoise',
    date: '−200 ans',
    era: 'attente',
    icon: '🤖',
    title: 'Emeth attaque Mary Geoise',
    summary: 'Le robot franchit Red Line puis s’éteint faute d’énergie.',
    detail:
      'Son objectif demeure inconnu. Pour la théorie, cet assaut pourrait être une étape mal calibrée de son voyage temporel, ou une directive liée au futur combat de Joy Boy contre le pouvoir d’Imu.',
    status: 'canon',
    chapter: 'Ch. 1067',
    links: [{ label: 'Emeth, robot du futur', href: '/theorie/emeth-robot-du-futur' }],
  },
  {
    id: 'roger-lodestar',
    date: '−39 ans',
    era: 'pirates',
    icon: '⭐',
    title: 'Roger atteint Lodestar',
    summary: 'La dernière île indiquée par les Log Pose ne permet pas de boucler le monde.',
    detail:
      'L’équipage comprend que quatre Road Ponéglyphes sont nécessaires. Cette impasse géographique ouvre la question centrale de la théorie : si trois coordonnées suffisent dans l’espace, la quatrième pourrait-elle être le temps ?',
    status: 'canon',
    links: [
      { label: 'Lodestar', href: '/theorie/lodestar' },
      { label: 'Road Ponéglyphes et temps', href: '/explorer/road-poneglyphes-temps' },
    ],
  },
  {
    id: 'god-valley',
    date: '−38 ans',
    era: 'pirates',
    icon: '🌋',
    title: 'L’incident de God Valley',
    summary: 'Roger et Garp affrontent Rocks tandis que l’île disparaît des cartes.',
    detail:
      'Les analyses récentes rapprochent le clan Davy, Xebec et Teach. Quand Imu emploie le nom « Davy Jones », la théorie y voit une possible confusion entre les figures de plusieurs époques.',
    status: 'canon',
    chapter: 'Ch. 957 et analyses récentes',
    links: [
      { label: 'God Valley', href: '/theorie/god-valley' },
      { label: 'Davy Jones', href: '/theorie/davy-jones' },
    ],
  },
  {
    id: 'roger-laugh-tale',
    date: '≈ −25 ans',
    era: 'pirates',
    icon: '🏝️',
    title: 'Roger atteint Laugh Tale',
    summary: 'Il découvre le One Piece, rit et affirme être arrivé trop tôt.',
    detail:
      'Pour la théorie, Roger n’arrive pas après Joy Boy mais avant lui. Il aurait accédé à une information, une vision ou une manifestation liée à l’époque future de Luffy. Le mécanisme exact reste ouvert.',
    status: 'canon',
    chapter: 'Ch. 967–968',
    links: [
      { label: 'Laugh Tale', href: '/theorie/laugh-tale' },
      { label: 'Gol D. Roger', href: '/theorie/gol-d-roger' },
    ],
  },
  {
    id: 'roger-attend',
    date: '≈ −25 ans',
    era: 'pirates',
    icon: '⌛',
    title: 'Roger choisit d’attendre',
    summary: 'L’équipage sait qu’une autre génération devra accomplir l’Histoire.',
    detail:
      'Shanks, Rayleigh et les survivants deviennent les gardiens d’un rendez-vous. Dans cette lecture, Roger n’est pas en retard sur le passé : il est en avance sur un avenir qui doit encore naître.',
    status: 'central',
    chapter: 'Ch. 968',
    links: [{ label: 'Roger et le “trop tôt”', href: '/theorie/gol-d-roger' }],
  },
  {
    id: 'execution-roger',
    date: '−24 ans',
    era: 'pirates',
    icon: '🏴‍☠️',
    title: 'Roger lance la Grande Ère',
    summary: 'Son exécution pousse le monde entier sur la route du One Piece.',
    detail:
      'Son dernier message fabrique les conditions nécessaires à l’arrivée du prochain équipage. La quête mondiale devient une immense sélection qui conduira Luffy jusqu’aux pièces de la boucle.',
    status: 'canon',
    chapter: 'Ch. 1',
    links: [{ label: 'Gol D. Roger', href: '/theorie/gol-d-roger' }],
  },
  {
    id: 'ohara',
    date: '−22 ans',
    era: 'pirates',
    icon: '📚',
    title: 'Ohara est détruite',
    summary: 'Le Gouvernement mondial tente d’effacer ceux qui savent lire les pierres.',
    detail:
      'Robin survit et devient la seule personne capable de lire puis, dans la théorie, de rédiger la véritable Histoire. En voulant supprimer le savoir, le Gouvernement place précisément Robin sur la route de Luffy.',
    status: 'canon',
    chapter: 'Ch. 395–397',
    links: [
      { label: 'Nico Robin', href: '/theorie/nico-robin' },
      { label: 'Clover et Ohara', href: '/theorie/professeur-clover-et-ohara' },
    ],
  },
  {
    id: 'naissance-shirahoshi',
    date: '≈ −16 ans',
    era: 'pirates',
    icon: '🧜‍♀️',
    title: 'Poséidon renaît en Shirahoshi',
    summary: 'La princesse capable de commander les Rois des Mers vient au monde.',
    detail:
      'Son pouvoir est indispensable pour déplacer Noah. La théorie relie sa naissance, la promesse de Joy Boy et l’évacuation future de l’île des Hommes-Poissons avant le bouleversement des mers.',
    status: 'canon',
    chapter: 'Ch. 649–650',
    links: [{ label: 'Poséidon', href: '/theorie/poseidon-fiche' }],
  },
  {
    id: 'chapeau-luffy',
    date: '−12 ans',
    era: 'pirates',
    icon: '👒',
    title: 'Shanks confie le chapeau à Luffy',
    summary: 'Le symbole de Roger attend désormais le garçon qui doit le dépasser.',
    detail:
      'Le chapeau relie Roger, Shanks et Luffy. Dans la boucle proposée, il pourrait avoir été associé à Joy Boy parce qu’il est précisément le chapeau de Luffy, conservé à travers les époques.',
    status: 'canon',
    chapter: 'Ch. 1',
    links: [
      { label: 'Luffy', href: '/theorie/luffy' },
      { label: 'Shanks', href: '/theorie/shanks' },
    ],
  },
  {
    id: 'depart-luffy',
    date: '−2 ans',
    era: 'voyage',
    icon: '⛵',
    title: 'Luffy prend la mer',
    summary: 'Le chapitre 1 ouvre, selon la théorie, le véritable Siècle oublié.',
    detail:
      'Chaque île libérée réactive une nation, une promesse ou une arme. L’aventure n’est plus seulement la conséquence de l’Histoire : elle devient l’Histoire qui sera ensuite gravée dans la pierre.',
    status: 'central',
    chapter: 'Ch. 1',
    links: [{ label: 'Le Siècle oublié est le présent', href: '/theorie/siecle-oublie-present' }],
  },
  {
    id: 'nations-reveillees',
    date: '−2 ans → présent',
    era: 'voyage',
    icon: '🤝',
    title: 'Les nations sont réveillées une à une',
    summary: 'Alabasta, Skypiea, Ryugu, Dressrosa, Zou et Wa rejoignent la trajectoire de Luffy.',
    detail:
      'La coalition finale se construit au fil du voyage. Les peuples que le Gouvernement a isolés trouvent dans Luffy le point commun capable de réunir leurs missions au même moment.',
    status: 'central',
    links: [{ label: 'Peuples et royaumes', href: '/theorie/peuples-royaumes' }],
  },
  {
    id: 'nika-eveil',
    date: 'Présent — Wano',
    era: 'voyage',
    icon: '🥁',
    title: 'Les Tambours de la Libération résonnent',
    summary: 'Luffy éveille le Gear 5 ; Zunesha annonce le retour de Joy Boy.',
    detail:
      'Le fait est canon, l’identité exacte reste interprétée. Les Fous du Bus ne voient pas une réincarnation : Luffy serait l’homme dont les actions futures ont créé, huit siècles plus tôt, les noms de Joy Boy et Nika.',
    status: 'canon',
    chapter: 'Ch. 1043–1045',
    links: [
      { label: 'Hito Hito no Mi, modèle Nika', href: '/theorie/hito-hito-no-mi-nika' },
      { label: 'Joy Boy', href: '/theorie/joy-boy' },
    ],
  },
  {
    id: 'lulusia-vegapunk',
    date: 'Présent — Egghead',
    era: 'voyage',
    icon: '🌊',
    title: 'Lulusia disparaît et la mer monte',
    summary: 'Une arme céleste détruit le royaume avant le message mondial de Vegapunk.',
    detail:
      'Vegapunk confirme la guerre, le niveau des mers et l’avance technologique du Royaume antique. Ces révélations rendent le scénario du Déluge plus concret sans confirmer encore le renversement temporel.',
    status: 'canon',
    chapter: 'Ch. 1060, 1114–1116',
    links: [
      { label: 'Mother Flame', href: '/theorie/mother-flame' },
      { label: 'Le Déluge et All Blue', href: '/theorie/deluge-all-blue' },
    ],
  },
  {
    id: 'emeth-reconnait-luffy',
    date: 'Présent — Egghead',
    era: 'voyage',
    icon: '🪢',
    title: 'Emeth reconnaît Joy Boy en Luffy',
    summary: 'Le robot s’éveille au rythme de son cœur et libère un Haki conservé dans un nœud.',
    detail:
      'La théorie lit cette rencontre à rebours : Emeth ne confondrait pas deux hommes semblables, il reconnaîtrait l’homme qu’il a réellement connu dans son propre futur.',
    status: 'central',
    chapter: 'Ch. 1122',
    links: [{ label: 'Emeth et le futur', href: '/theorie/emeth-futur' }],
  },
  {
    id: 'imu-confusion',
    date: 'Présent — ch. 1187–1188',
    era: 'voyage',
    icon: '👁️',
    title: 'Imu pourrait confondre Roger et Joy Boy',
    summary: 'L’analyse récente propose qu’Imu croie avoir déjà vaincu la figure annoncée.',
    detail:
      'Si Imu perçoit des fragments d’avenir sans leur date, Roger — seul homme arrivé à Laugh Tale — aurait pu être pris pour Joy Boy. Sa mort aurait donné au souverain une fausse certitude avant l’apparition de Luffy.',
    status: 'hypothese',
    chapter: 'Analyses 1187–1188',
    links: [
      { label: 'Imu Nerona', href: '/theorie/imu-nerona' },
      { label: 'Communication temporelle', href: '/theorie/communication-temps' },
    ],
  },
  {
    id: 'elbaf-halley',
    date: 'Présent — Elbaf',
    era: 'voyage',
    icon: '🌲',
    title: 'Elbaf ouvre les archives de la fin',
    summary:
      'Les textes, le Halley et les mythes de Nika rapprochent le présent des récits anciens.',
    detail:
      'Les analyses des chapitres récents explorent des légendes qui semblent se fabriquer sous nos yeux. Loki, Nidhogg et les géants renforcent l’idée que certaines figures dites anciennes naissent dans le présent.',
    status: 'hypothese',
    chapter: 'Analyses 1175–1188',
    links: [
      { label: 'Elbaf et le Halley', href: '/theorie/elbaf-halley' },
      { label: 'Loki', href: '/theorie/loki' },
    ],
  },
  {
    id: 'coalition-finale',
    date: 'Avenir proche',
    era: 'avenir',
    icon: '⚔️',
    title: 'La coalition affronte le Gouvernement',
    summary: 'Les peuples libérés et les héritiers du D. convergent vers la Grande Guerre.',
    detail:
      'Luffy ne rassemble pas une armée par ambition politique. Les alliances nées pendant son voyage se lèveraient d’elles-mêmes contre Imu, accomplissant ensemble les missions conservées pendant des siècles.',
    status: 'projection',
    links: [{ label: 'Guerre finale', href: '/theorie/guerre-finale' }],
  },
  {
    id: 'teach-davy-jones',
    date: 'Avenir proche',
    era: 'avenir',
    icon: '🌘',
    title: 'Teach devient la figure de Davy Jones',
    summary: 'L’ombre du D. affronte le futur Joy Boy pour la maîtrise du monde.',
    detail:
      'Teach pourrait être l’homme dont les actes donneront naissance à la légende de Davy Jones. Son opposition à Luffy formerait le duel fondateur que l’Histoire projettera ensuite dans un passé mythique.',
    status: 'hypothese',
    links: [
      { label: 'Teach et Davy Jones', href: '/theorie/barbe-noire-davy-jones' },
      { label: 'Marshall D. Teach', href: '/theorie/teach' },
    ],
  },
  {
    id: 'identites-futures',
    date: 'Pendant la guerre',
    era: 'avenir',
    icon: '🪞',
    title: 'Les légendes prennent leur vrai visage',
    summary: 'Vivi/Lili, Zoro/Ryuma et Luffy/Joy Boy pourraient être des identités lues à rebours.',
    detail:
      'Ces correspondances sont des conséquences de la théorie, pas son point de départ. Elles supposent que les actes futurs des héros soient transmis et attribués à des figures que le monde croit anciennes.',
    status: 'hypothese',
    links: [
      { label: 'Vivi et Lili', href: '/theorie/vivi' },
      { label: 'Zoro et Ryuma', href: '/theorie/zoro-est-ryuma' },
    ],
  },
  {
    id: 'armes-antiques',
    date: 'Jour du serment',
    era: 'avenir',
    icon: '🔱',
    title: 'Les trois Armes antiques entrent en jeu',
    summary:
      'Poséidon, Pluton et Uranus cessent d’être des vestiges pour devenir des outils du présent.',
    detail:
      'Shirahoshi commanderait les Rois des Mers, Pluton serait libéré à l’ouverture de Wa et Uranus resterait la grande inconnue. Leur fonction pourrait être constructive autant que destructrice.',
    status: 'projection',
    links: [
      { label: 'Armes antiques', href: '/theorie/armes-antiques' },
      { label: 'Pluton', href: '/theorie/pluton-fiche' },
    ],
  },
  {
    id: 'deluge-noah',
    date: 'Jour du serment',
    era: 'avenir',
    icon: '🌊',
    title: 'Le Déluge et l’évacuation par Noah',
    summary: 'La montée des eaux oblige les habitants de Ryugu à quitter les profondeurs.',
    detail:
      'Noah n’aurait pas servi autrefois : l’arche aurait été construite pour ce moment précis. Poséidon et les Rois des Mers la déplaceraient afin de sauver le peuple avant la transformation du monde.',
    status: 'projection',
    links: [
      { label: 'Le Déluge et All Blue', href: '/theorie/deluge-all-blue' },
      { label: 'Noah', href: '/theorie/noah' },
    ],
  },
  {
    id: 'red-line-all-blue',
    date: 'Après la guerre',
    era: 'avenir',
    icon: '🌍',
    title: 'Red Line tombe, All Blue naît',
    summary: 'Les quatre mers se rejoignent et Blue Star devient littéralement “une seule pièce”.',
    detail:
      'La destruction ciblée de Red Line accomplirait plusieurs promesses à la fois : All Blue, la remontée des Hommes-Poissons, la réunion des océans et un monde enfin libre de circuler.',
    status: 'projection',
    links: [
      { label: 'Red Line', href: '/theorie/red-line' },
      { label: 'All Blue', href: '/theorie/all-blue' },
      { label: 'Histoire du One Piece', href: '/theorie/one-piece-histoire' },
    ],
  },
  {
    id: 'luffy-devient-joyboy',
    date: 'Après la victoire',
    era: 'avenir',
    icon: '🌅',
    title: 'Luffy devient Joy Boy dans la mémoire du monde',
    summary:
      'Luffy reste son identité ; Joy Boy devient son nom historique et Nika sa figure divine.',
    detail:
      'Il ne cherche aucun de ces titres. Ce sont les peuples libérés qui transforment ses actes en récit, puis en légende. Joy Boy serait donc la conséquence de Luffy, jamais son modèle imposé.',
    status: 'central',
    links: [
      { label: 'Luffy, Joy Boy et Nika', href: '/theorie/luffy' },
      { label: 'La voix de Joy Boy', href: '/theorie/voix-de-joy-boy' },
    ],
  },
  {
    id: 'gravure-poneglyphes',
    date: 'Fin de l’aventure',
    era: 'boucle',
    icon: '✍️',
    title: 'Robin, Momonosuke et Vivi écrivent l’Histoire',
    summary: 'Le trio réunirait le texte, la pierre et la dispersion des Ponéglyphes.',
    detail:
      'Robin rédige la véritable Histoire, Momonosuke hérite du savoir-faire Kozuki et Vivi endosse le rôle attribué à Lili. Ensemble, ils fabriqueraient les messages que leur propre époque a déjà lus.',
    status: 'central',
    links: [
      { label: 'Ponéglyphes du futur', href: '/theorie/poneglyphes-futur' },
      { label: 'Momonosuke', href: '/theorie/momonosuke' },
    ],
  },
  {
    id: 'transmission-passe',
    date: '↺ Vers −800 ans',
    era: 'boucle',
    icon: '🌀',
    title: 'Les informations repartent vers le passé',
    summary: 'Les pierres, les souvenirs ou leurs messages franchissent huit siècles.',
    detail:
      'C’est le mécanisme central encore non résolu. La théorie privilégie la transmission d’informations, mais garde ouvertes la communication entre époques, la préscience et des déplacements ponctuels.',
    status: 'central',
    chapter: 'Mécanisme ouvert',
    links: [
      { label: 'Mémoire de l’avenir', href: '/theorie/chronologie' },
      { label: 'Communication à travers le temps', href: '/theorie/communication-temps' },
    ],
  },
  {
    id: 'royaume-antique-futur',
    date: 'La boucle se ferme',
    era: 'boucle',
    icon: '♾️',
    title: 'Le futur devient le “Royaume antique”',
    summary: 'Le monde reconstruit après la guerre est mémorisé comme une civilisation disparue.',
    detail:
      'La technologie de Franky, l’énergie d’Emeth et le monde unifié seraient projetés dans le récit du passé. Le début côtoie alors la fin : les héros découvrent des traces qu’ils doivent encore créer.',
    status: 'hypothese',
    links: [
      { label: 'Royaume antique', href: '/theorie/royaume-antique' },
      { label: 'Théorie complète', href: '/theorie/theorie-complete' },
    ],
  },
];
