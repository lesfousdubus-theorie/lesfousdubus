export type TimelineStatus = 'canon' | 'central' | 'extension' | 'hypothese' | 'projection';

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
  note?: string;
}> = [
  {
    id: 'traces',
    label: 'Les traces',
    range: '≈ −900 à −200',
    description: 'Les éléments que le monde prend pour un passé antique.',
    note: 'Les événements regroupés autour de −900/−800 ne sont pas nécessairement classés dans un ordre relatif confirmé.',
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
    note: 'L’ordre des événements de la guerre finale est hypothétique.',
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
  central: { label: 'Noyau de la théorie', shortLabel: 'Noyau' },
  extension: { label: 'Extension de la théorie', shortLabel: 'Extension' },
  hypothese: { label: 'Hypothèse récente ou de mécanisme', shortLabel: 'Hypothèse' },
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
    title: 'Des informations du futur atteignent le passé',
    summary:
      'Des informations provenant du futur auraient atteint le passé et auraient été prises pour les vestiges d’une histoire ancienne.',
    detail:
      'Le noyau de la théorie porte d’abord sur l’information. Les Ponéglyphes en constituent le véhicule central : leur contenu décrirait des événements futurs avant leur réalisation. Le Harley, Emeth, Zoro ou d’autres éléments physiques relèvent de branches distinctes et plus spéculatives.',
    status: 'central',
    image: images.origin,
    imageAlt: 'Composition visuelle autour du Siècle oublié et du One Piece',
    links: [{ label: 'Les bases de la théorie', href: '/theorie/siecle-oublie-present' }],
  },
  {
    id: 'imu-lit-avenir',
    date: '≈ −900/−800 ans',
    era: 'traces',
    thread: 'figures',
    icon: '◉',
    title: 'Imu apprend une histoire à empêcher',
    summary:
      'Imu apprendrait l’existence de figures et d’événements futurs qu’il chercherait ensuite à empêcher.',
    detail:
      'Dans cette lecture, Imu devient le gardien anxieux d’informations sur Joy Boy, Lili, Poséidon ou Davy Jones. La manière dont ces informations lui parviennent reste incertaine : Ponéglyphes, communication entre époques et préscience demeurent des mécanismes concurrents.',
    status: 'hypothese',
    image: images.imu,
    imageAlt: 'Imu dans la chambre fleurie de Mary Geoise',
    links: [{ label: 'Imu face à l’avenir', href: '/theorie/imu-avenir' }],
  },
  {
    id: 'imu-communication-future',
    date: 'Hypothèse vers −800 ans',
    era: 'traces',
    thread: 'memoire',
    icon: '◌',
    title: 'Imu pourrait recevoir un appel du futur',
    summary:
      'La conversation révélée au chapitre 1188 pourrait relier l’époque d’Imu à celle de Luffy sans déplacement physique généralisé.',
    detail:
      'L’analyse 1188 envisage qu’un dispositif mette en relation deux interlocuteurs séparés par les siècles. Imu entendrait depuis le passé une voix venue de Laugh Tale à la fin de l’aventure. Le contexte temporel de la scène n’étant pas donné, cette lecture reste une hypothèse de mécanisme.',
    status: 'hypothese',
    chapter: 'Ch. 1188',
    image: images.imu,
    imageAlt: 'Imu associé à une possible communication venue du futur',
    links: [{ label: 'Analyse du chapitre 1188', href: '/chapitres/1188' }],
  },
  {
    id: 'imu-prescience-alternative',
    date: 'Branche alternative vers −800 ans',
    era: 'traces',
    thread: 'memoire',
    icon: '◉',
    title: 'La préscience offrirait une autre explication',
    summary:
      'Imu pourrait percevoir le futur à la manière de Madame Shirley plutôt que recevoir un message ou un objet envoyé dans le passé.',
    detail:
      'Cette branche récente n’annule ni les Ponéglyphes ni la piste de la communication. Elle explique seulement comment Imu pourrait connaître des événements futurs sans en voir clairement les visages, comme Shirley doit interpréter ses visions ambiguës.',
    status: 'hypothese',
    chapter: 'Analyse 1188',
    image: images.imu,
    imageAlt: 'Imu rapproché de la prescience de Madame Shirley',
    links: [{ label: 'Préscience et Imu', href: '/theorie/la-prescience-et-imu' }],
  },
  {
    id: 'siecle-oublie-officiel',
    date: '≈ −900 à −800 ans',
    era: 'traces',
    thread: 'monde',
    icon: '◐',
    title: 'Le récit connu du Siècle oublié',
    summary:
      'Une civilisation avancée a combattu les vingt royaumes pendant un siècle effacé de l’Histoire, tandis que le niveau des mers montait de deux cents mètres.',
    detail:
      'Vegapunk présente Joy Boy comme le premier pirate du Royaume antique et décrit une guerre gigantesque dont les conséquences se prolongent au présent. L’issue morale du conflit demeure inconnue et la recherche sur cette période reste interdite.',
    status: 'canon',
    chapter: 'Ch. 395, 1114–1116',
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
    title: 'Le Gouvernement mondial est fondé',
    summary:
      'Dix-neuf familles fondatrices s’installent à Mary Geoise et instituent le Trône vacant après le refus des Nefertari.',
    detail:
      'Les souverains fondateurs déposent leurs armes devant le Trône vacant pour signifier qu’aucun d’eux ne dominera les autres. La famille Nefertari retourne à Alabasta au lieu de rejoindre les Dragons célestes.',
    status: 'canon',
    chapter: 'Ch. 907–908, 1084–1085',
    image: images.kings,
    imageAlt: 'Les silhouettes des souverains fondateurs',
    links: [{ label: 'Gouvernement mondial', href: '/theorie/gouvernement-mondial' }],
  },
  {
    id: 'imu-regne-secret',
    date: 'Hypothèse dès ≈ −800 ans',
    era: 'traces',
    thread: 'figures',
    icon: '♛',
    title: 'Imu aurait gouverné secrètement depuis la fondation',
    summary:
      'Le règne continu d’Imu pendant huit siècles expliquerait que le Trône vacant ait toujours dissimulé la même autorité.',
    detail:
      'Le manga révèle le pouvoir actuel d’Imu, mais ne confirme ni son âge ni une présence ininterrompue depuis la fondation. La longévité et le règne ancien d’Imu restent donc une extension interprétative, possiblement liée à l’opération d’immortalité du Ope Ope no Mi.',
    status: 'extension',
    image: images.imu,
    imageAlt: 'Imu assis secrètement sur le Trône vacant',
    links: [{ label: 'Imu Nerona', href: '/theorie/imu-nerona' }],
  },
  {
    id: 'lili-dispersion',
    date: '≈ −800 ans',
    era: 'traces',
    thread: 'memoire',
    icon: '✦',
    title: 'Lili est liée à la dispersion des Ponéglyphes',
    summary:
      'Nefertari D. Lili refuse de vivre à Mary Geoise, puis disparaît ; Imu associe son erreur à la dispersion historique des pierres.',
    detail:
      'La lettre de Lili demande à Alabasta de protéger les Ponéglyphes et de hisser le drapeau de l’aube. Le manga relie ainsi son nom à leur dispersion, sans montrer le geste, son mécanisme ni les circonstances exactes de sa disparition.',
    status: 'canon',
    chapter: 'Ch. 1084–1085',
    image: images.lili,
    imageAlt: 'Imu évoquant Vivi dans la chambre fleurie',
    links: [{ label: 'Lili et les Ponéglyphes', href: '/theorie/lili-vivi-et-les-poneglyphes' }],
  },
  {
    id: 'vivi-dispersion-future',
    date: 'Lecture future de ≈ −800 ans',
    era: 'traces',
    thread: 'memoire',
    icon: '♕',
    title: 'La dispersion pourrait être l’action future de Vivi',
    summary:
      'La théorie distingue l’association historique à Lili de son mécanisme : Vivi coordonnerait la dispersion à la fin de l’aventure.',
    detail:
      'L’identité Vivi–Lili permettrait de lire la disparition de la reine comme la trace anticipée d’un acte futur. Cette branche reste spéculative : le manga n’établit ni cette identité, ni un voyage de Vivi, ni l’envoi des pierres vers le passé.',
    status: 'extension',
    image: images.liliStones,
    imageAlt: 'Vivi rapprochée de Lili et de la dispersion des Ponéglyphes',
    links: [{ label: 'Vivi et Lili', href: '/theorie/vivi' }],
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
    date: 'À partir de ≈ −800 ans',
    era: 'traces',
    thread: 'monde',
    icon: '⌖',
    title: 'Les missions des peuples se transmettent',
    summary:
      'À partir de cette période et durant les siècles suivants, différentes nations conservent chacune une pièce du rendez-vous.',
    detail:
      'La théorie ne suppose pas que la fermeture de Wano, la marche de Zou, les traditions d’Elbaf et toutes les autres missions commencent le même jour. Elle les lit comme des transmissions successives qui convergent vers la coalition de Joy Boy.',
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
      'Kalgara et Noland se promettent de se retrouver au son de la cloche d’or avant que Shandora soit projetée dans le ciel.',
    detail:
      'Après la mort de Noland et la disparition de l’île de Jaya dans les nuages, les descendants des Shandias continuent de protéger la cité et sa cloche. Luffy la fait de nouveau résonner quatre siècles plus tard.',
    status: 'canon',
    chapter: 'Ch. 286–292, 297–299',
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
      'Le robot géant franchit Red Line, attaque Mary Geoise et tombe en panne faute d’énergie avant d’être conservé sur Egghead.',
    detail:
      'Son origine et sa source d’énergie restent inconnues. Des scientifiques reçoivent l’ordre de le détruire, mais le dissimulent pour l’étudier ; Vegapunk finit par le conserver dans son laboratoire.',
    status: 'canon',
    chapter: 'Ch. 1067, 1125',
    image: images.emeth,
    imageAlt: 'Le robot géant Emeth étudié sur Egghead',
    links: [{ label: 'Emeth, robot du futur', href: '/theorie/emeth-futur' }],
  },
  {
    id: 'brook-premiers-vers',
    date: '−79 ans',
    era: 'veille',
    thread: 'memoire',
    icon: '♫',
    title: 'Brook écrit une première version des paroles',
    summary:
      'Enfant, Brook écrit une première version de paroles soixante-dix-neuf ans avant le présent, sans revendiquer la chanson complète.',
    detail:
      'Le chapitre 1184 situe cette composition soixante-dix-neuf ans avant le présent. Il établit l’ancienneté du geste de Brook, mais ne confirme pas qu’il soit l’auteur de la mélodie ou de la version définitive de la chanson.',
    status: 'canon',
    chapter: 'Ch. 1184',
    links: [{ label: 'Brook', href: '/theorie/brook' }],
  },
  {
    id: 'brook-shuri-chanson',
    date: '−70 ans',
    era: 'veille',
    thread: 'figures',
    icon: '♬',
    title: 'La mélodie liée à Binks no Sake précède Roger',
    summary:
      'Brook et la princesse Shuri chantent déjà cette mélodie soixante-dix ans avant le présent, bien avant l’âge d’or de Roger.',
    detail:
      'Cette scène rattache le passé musical de Brook à une figure royale et montre que la chanson circule depuis plusieurs décennies. Elle ne tranche pas à elle seule l’identité de Dōzan ni l’auteur complet de Binks no Sake.',
    status: 'canon',
    chapter: 'Ch. 1184',
    links: [{ label: 'Binks no Sake', href: '/theorie/binks-no-sake' }],
  },
  {
    id: 'brook-dozan',
    date: 'Branche autour de −79/−70 ans',
    era: 'veille',
    thread: 'figures',
    icon: '♫',
    title: 'Brook pourrait être lié à Dōzan',
    summary:
      'Les analyses 1183–1184 envisagent que Dōzan soit un nom d’artiste de Brook et que son chant d’enfance ait nourri la légende.',
    detail:
      'Le rapprochement repose sur la longévité de Brook, son passé royal et militaire, ainsi que l’origine inconnue de Binks no Sake. Aucun témoignage ni élément physique ne confirme cette identité : il s’agit d’une extension secondaire de la théorie.',
    status: 'extension',
    chapter: 'Analyses 1183–1184',
    links: [{ label: 'Brook pourrait-il être Dōzan ?', href: '/theorie/brook-dozan' }],
  },
  {
    id: 'brook-ignore-fruits',
    date: '≈ −62 ans',
    era: 'veille',
    thread: 'monde',
    icon: '？',
    title: 'Brook dit ne pas connaître les Fruits du Démon',
    summary:
      'À cette époque, Brook réagit aux Fruits du Démon comme à une rumeur inconnue plutôt que comme à un phénomène familier.',
    detail:
      'La scène établit seulement l’ignorance de Brook dans son contexte. Elle ne prouve pas que les Fruits du Démon n’existaient nulle part ailleurs dans le monde ni qu’aucun autre marin ne les connaissait.',
    status: 'canon',
    chapter: 'Ch. 1186',
    links: [{ label: 'Fruits du Démon', href: '/theorie/fruits-du-demon' }],
  },
  {
    id: 'fruits-apparition-recente',
    date: 'Hypothèse : dernier siècle',
    era: 'veille',
    thread: 'monde',
    icon: '✺',
    title: 'Les Fruits du Démon pourraient s’être diffusés récemment',
    summary:
      'Leur diffusion massive, voire leur apparition, pourrait appartenir au dernier siècle plutôt qu’aux temps les plus anciens.',
    detail:
      'L’analyse 1186 combine l’ignorance de Brook et un relevé non officiel où l’immense majorité des fruits connus apparaît dans les soixante-deux dernières années. Une absence de représentation ne prouvant pas une absence d’existence, cette proposition reste une hypothèse récente.',
    status: 'hypothese',
    chapter: 'Analyse 1186',
    links: [{ label: 'Analyse du chapitre 1186', href: '/chapitres/1186' }],
  },
  {
    id: 'rumbar-massacre',
    date: '≈ −52 ans',
    era: 'veille',
    thread: 'figures',
    icon: '☠',
    title: 'L’équipage Rumbar disparaît et Brook revient',
    summary:
      'Les Rumbar sont mortellement empoisonnés, enregistrent Binks no Sake pour Laboon et Brook revient grâce au Yomi Yomi no Mi.',
    detail:
      'Brook met du temps à retrouver son corps, qui n’est plus qu’un squelette, puis reste seul dans le Triangle Florian pendant cinquante ans. Le Tone Dial conserve la dernière interprétation de l’équipage destinée à Laboon.',
    status: 'canon',
    chapter: 'Ch. 486–488',
    links: [{ label: 'L’équipage Rumbar', href: '/theorie/equipage-rumbar' }],
  },
  {
    id: 'rocks-cherche-galley-la',
    date: '≈ −40 ans',
    era: 'veille',
    thread: 'figures',
    icon: '◈',
    title: 'Les Rocks chercheraient une Galley-La encore inexistante',
    summary:
      'Une rumeur sur une armée de géants congelés est rapprochée d’un équipage et d’une compagnie qui ne portent pas encore ce nom.',
    detail:
      'Cette extension relie les géants de Punk Hazard, l’équipage disparu de Loki et la brigade au grand marteau. La légende de Galley-La aurait précédé sa formation parce que son récit serait, lui aussi, venu du futur.',
    status: 'extension',
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
    title: 'Roger atteint Lodestar et comprend que le voyage continue',
    summary:
      'Après avoir atteint la dernière île indiquée par le Log Pose, Roger découvre l’existence des Ponéglyphes et repart explorer Grand Line.',
    detail:
      'L’équipage comprend à Lodestar que les stèles, l’écriture ancienne et la civilisation disparue forment un mystère encore irrésolu. Roger recommence alors son voyage afin d’atteindre la véritable destination finale.',
    status: 'canon',
    chapter: 'Ch. 820, 966–968',
    image: images.roger,
    imageAlt: 'Silhouette de Gol D. Roger dans une planche du manga',
    links: [{ label: 'Lodestar', href: '/theorie/lodestar' }],
  },
  {
    id: 'lodestar-geographie',
    date: 'Lecture de −39 ans',
    era: 'roger',
    thread: 'monde',
    icon: '⌖',
    title: 'La géographie empêcherait une circumnavigation complète',
    summary:
      'Lodestar ne permettrait ni de franchir Red Line ni de refermer le tour du monde dans la géographie actuelle.',
    detail:
      'La démonstration géographique des Fous du Bus fait de cette impossibilité le point de départ de l’hypothèse Laugh Tale–Lodestar. Cet obstacle n’est pas formulé comme tel par le manga et reste une extension du raisonnement.',
    status: 'extension',
    image: images.roger,
    imageAlt: 'Roger face à la géographie de la fin de Grand Line',
    links: [{ label: 'Grand Line', href: '/theorie/grand-line' }],
  },
  {
    id: 'god-valley',
    date: '−38 ans',
    era: 'roger',
    thread: 'figures',
    icon: '✹',
    title: 'L’incident de God Valley disperse les Rocks',
    summary:
      'Rocks affronte le pouvoir à God Valley ; Roger et Garp s’allient, tandis que Kuma aide des captifs à fuir la chasse humaine.',
    detail:
      'L’affrontement met fin à l’équipage de Rocks et le Gouvernement efface ensuite l’île des cartes. Kuma utilise son pouvoir pour sauver des centaines de personnes et quitter God Valley avec Ginny et Ivankov.',
    status: 'canon',
    chapter: 'Ch. 957, 1095–1096, 1164',
    image: images.davy,
    imageAlt: 'God Valley au cœur de l’affrontement entre Rocks et le pouvoir',
    links: [{ label: 'God Valley', href: '/theorie/god-valley' }],
  },
  {
    id: 'god-valley-lignees',
    date: 'Lecture de −38 ans',
    era: 'roger',
    thread: 'figures',
    icon: '◇',
    title: 'God Valley deviendrait un carrefour de lignées',
    summary:
      'Le clan Davy, Teach, les Figarland et les héritiers sauvés par Kuma sont réunis dans une même lecture narrative de l’incident.',
    detail:
      'Cette carte sépare les conséquences théoriques des faits établis. L’identification du territoire au clan Davy et la survie de ses héritiers restent des extensions. Les apports propres aux analyses 1189–1190 devront conserver un audit éditorial distinct.',
    status: 'extension',
    image: images.davy,
    imageAlt: 'Barbe Noire associé aux lignées que la théorie relie à God Valley',
    links: [{ label: 'Teach et Davy Jones', href: '/theorie/barbe-noire-davy-jones' }],
  },
  {
    id: 'kuma-promet-nika',
    date: '−38 ans',
    era: 'roger',
    thread: 'joyboy',
    icon: '✚',
    title: 'Kuma promet de sauver comme Nika',
    summary:
      'Le jeune Boucanier affirme à Saturne qu’il veut libérer le plus de personnes possible, à l’image du Dieu Soleil.',
    detail:
      'Saturne lui répond que son peuple mérite la mort pour avoir transmis cette croyance. Kuma, Ginny et Ivankov s’échappent ensuite de God Valley avec plusieurs centaines de captifs.',
    status: 'canon',
    chapter: 'Ch. 1095–1096',
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
      'L’équipage découvre le trésor, apprend l’Histoire, nomme l’île Laugh Tale et comprend être arrivé trop tôt.',
    detail:
      'Roger s’adresse à Joy Boy et dit qu’il aurait aimé vivre à son époque. Après avoir appris la vérité, l’équipage quitte l’île sans agir sur les événements annoncés.',
    status: 'canon',
    chapter: 'Ch. 967–968',
    image: images.roger,
    imageAlt: 'Gol D. Roger associé à la découverte de Laugh Tale',
    links: [{ label: 'Laugh Tale', href: '/theorie/laugh-tale' }],
  },
  {
    id: 'roger-communication-laugh-tale',
    date: 'Hypothèse vers −25 ans',
    era: 'roger',
    thread: 'memoire',
    icon: '◌',
    title: 'Roger aurait pu accéder à la même ligne temporelle',
    summary:
      'Roger pourrait avoir reçu ou observé depuis Laugh Tale une communication reliant Imu au Joy Boy de la fin de l’aventure.',
    detail:
      'L’analyse 1188 ouvre une solution différente du déplacement physique vers le futur. Laugh Tale pourrait permettre de recevoir une voix, une scène ou une information issue d’une autre époque ; le rire et le constat « trop tôt » de Roger conserveraient alors leur sens.',
    status: 'hypothese',
    chapter: 'Analyse 1188',
    image: images.roger,
    imageAlt: 'Roger découvrant une possible communication temporelle à Laugh Tale',
    links: [{ label: 'Communication temporelle', href: '/theorie/communication-temps' }],
  },
  {
    id: 'compte-a-rebours-poseidon',
    date: '≈ −25 ans',
    era: 'roger',
    thread: 'armes',
    icon: '♆',
    title: 'Les Rois des Mers donnent le compte à rebours',
    summary:
      'Roger apprend qu’une princesse naîtra dans dix ans et qu’un autre souverain apparaîtra dans une mer lointaine.',
    detail:
      'Les Rois des Mers annoncent que les deux souverains se rencontreront un jour et que les baleines se réjouissent de cette échéance. Roger en déduit que la génération attendue viendra après la sienne.',
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
      'Son exécution publique et ses dernières paroles transforment le One Piece en désir collectif à l’échelle du monde.',
    detail:
      'Roger affirme avoir laissé son trésor quelque part et invite la foule à le chercher. Cette déclaration déclenche une vague mondiale de départs en mer appelée la Grande Ère de la piraterie.',
    status: 'canon',
    chapter: 'Ch. 1',
    links: [{ label: 'L’histoire de One Piece', href: '/theorie/one-piece-histoire' }],
  },
  {
    id: 'execution-prepare-joyboy',
    date: 'Lecture de −24 ans',
    era: 'roger',
    thread: 'joyboy',
    icon: '↗',
    title: 'La Grande Ère prépare le départ du futur Joy Boy',
    summary:
      'En rendant le trésor impossible à effacer, Roger créerait les conditions qui conduiront Luffy et son équipage jusqu’à lui.',
    detail:
      'Cette lecture donne une fonction précise au sacrifice de Roger : il ne provoque pas directement l’apparition de Joy Boy, mais prépare le monde, les équipages et le désir collectif nécessaires au voyage de Luffy.',
    status: 'central',
    image: images.roger,
    imageAlt: 'Roger lançant la génération qui précède le voyage de Luffy',
    links: [{ label: 'Gol D. Roger', href: '/theorie/gol-d-roger' }],
  },
  {
    id: 'ohara-detruite',
    date: '−22 ans',
    era: 'roger',
    thread: 'memoire',
    icon: '✎',
    title: 'Ohara est détruite, Robin survit',
    summary:
      'Le Gouvernement déclenche un Buster Call contre les archéologues ; Nico Robin est la seule chercheuse d’Ohara à s’échapper.',
    detail:
      'Clover tente de révéler le nom du Royaume antique avant d’être abattu. Saul et Kuzan permettent à Robin de fuir, tandis que les livres jetés dans le lac survivent à l’incendie.',
    status: 'canon',
    chapter: 'Ch. 395–397',
    image: images.ohara,
    imageAlt: 'Nico Robin et les savants d’Ohara devant un Ponéglyphe',
    links: [{ label: 'Clover et Ohara', href: '/theorie/professeur-clover-et-ohara' }],
  },
  {
    id: 'robin-ecrira-memoire',
    date: 'Lecture de −22 ans',
    era: 'roger',
    thread: 'memoire',
    icon: '✎',
    title: 'Robin pourrait écrire la mémoire que le passé lira',
    summary:
      'La survivante capable de lire les pierres deviendrait aussi l’une des personnes qui rédigeront le Rio Ponéglyphe à la fin.',
    detail:
      'Les Fous du Bus relient la formation de Robin à Ohara au geste final de transmission. Le savoir des Kozuki permettrait la gravure ; Robin rassemblerait et rédigerait l’histoire vécue par l’équipage. Cette fonction n’est pas établie par le manga.',
    status: 'central',
    image: images.ohara,
    imageAlt: 'Robin associée à la future rédaction de la mémoire du monde',
    links: [{ label: 'Nico Robin', href: '/theorie/nico-robin' }],
  },
  {
    id: 'vivi-et-lombre-de-lili',
    date: '≈ −18 ans',
    era: 'roger',
    thread: 'figures',
    icon: '♕',
    title: 'Vivi naît sous le regard qu’Imu réserve à Lili',
    summary:
      'La ressemblance entre Vivi, sa mère Titi et l’image associée à Lili nourrit l’idée qu’Imu confondrait plusieurs générations.',
    detail:
      'La transcription propose qu’Imu ait d’abord pris Titi pour Lili, puis reconnu Vivi comme la figure annoncée. La ressemblance est un indice narratif possible, mais l’identité Lili–Vivi reste une extension secondaire.',
    status: 'extension',
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
      'La princesse sirène capable de commander les Rois des Mers naît dans la période annoncée à l’équipage de Roger.',
    detail:
      'Shirahoshi hérite d’une capacité qui ne naît que tous les plusieurs siècles au sein de la famille royale de Ryugu. Sa mère Otohime protège son secret jusqu’à sa mort.',
    status: 'canon',
    chapter: 'Ch. 626, 649–650',
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
      'La théorie identifie ces géants à ceux de Punk Hazard. Ragnir aurait permis une congélation instantanée destinée à les protéger. Ils deviendraient ensuite l’escouade au grand marteau associée à la Galley-La de la guerre finale.',
    status: 'extension',
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
      'Icebarg unifie les sept compagnies de charpentiers de Water Seven au sein d’une entreprise unique appelée Galley-La Company.',
    detail:
      'Cette fusion met fin aux conflits entre les chantiers et permet à Water Seven de retrouver une activité économique importante. Icebarg devient à la fois le président de la compagnie et le maire de la ville.',
    status: 'canon',
    chapter: 'Ch. 326–327',
    image: images.galley,
    imageAlt: 'La Galley-La Company et les charpentiers de Water Seven',
    links: [{ label: 'Galley-La', href: '/theorie/galley-la-coincidence-impossible' }],
  },
  {
    id: 'galley-la-nom-geants',
    date: 'Lecture de −5 ans',
    era: 'voyage',
    thread: 'armes',
    icon: '⚒',
    title: 'Le nom Galley-La relierait Icebarg à une brigade de géants',
    summary:
      'Le nom de la compagnie moderne serait identique à celui d’une légendaire escouade de géants destinée à rejoindre son chantier.',
    detail:
      'Cette coïncidence appartient au raisonnement théorique. Les charpentiers humains et les géants de Loki finiraient par unir leurs forces pour transformer une île entière en navire, mais le manga n’établit pas encore ce rapprochement.',
    status: 'extension',
    image: images.galley,
    imageAlt: 'Rapprochement entre la Galley-La Company et une brigade de géants',
    links: [
      { label: 'La coïncidence Galley-La', href: '/theorie/galley-la-coincidence-impossible' },
    ],
  },
  {
    id: 'depart-luffy',
    date: '−2 ans',
    era: 'voyage',
    thread: 'joyboy',
    icon: '↗',
    title: 'Luffy prend la mer depuis East Blue',
    summary:
      'À dix-sept ans, Monkey D. Luffy quitte le village de Fuchsia pour devenir Roi des pirates et chercher le One Piece.',
    detail:
      'Il part seul dans une petite embarcation avec le chapeau confié par Shanks. Son premier objectif est de réunir un équipage avant de rejoindre Grand Line.',
    status: 'canon',
    chapter: 'Ch. 1',
    image: images.origin,
    imageAlt: 'Le chapeau de Luffy symbolisant le début de son voyage',
    links: [{ label: 'Monkey D. Luffy', href: '/theorie/luffy' }],
  },
  {
    id: 'voyage-luffy-rejoint-commencement',
    date: 'Lecture du voyage actuel',
    era: 'voyage',
    thread: 'joyboy',
    icon: '⌁',
    title: 'Son voyage avancerait vers le point où fin et début se rejoignent',
    summary:
      'La progression sur Grand Line conduirait Luffy au lieu et au moment où la fin de son aventure peut informer le passé.',
    detail:
      'Dans la théorie, chaque île libérée, chaque promesse et chaque nouvel allié écrivent le Siècle oublié que Robin rassemblera plus tard. Cette lecture temporelle ne fait pas partie du fait brut de son départ.',
    status: 'central',
    image: images.origin,
    imageAlt: 'Le voyage de Luffy interprété comme la progression vers la fin de Grand Line',
    links: [{ label: 'Grand Line', href: '/theorie/grand-line' }],
  },
  {
    id: 'doflamingo-rejoue-roi',
    date: '−2 ans → présent',
    era: 'voyage',
    thread: 'figures',
    icon: '♜',
    title: 'Doflamingo rejouerait le roi Donquixote des textes',
    summary:
      'Dressrosa reproduit la même exploitation souterraine des Tontattas attribuée au souverain d’il y a neuf siècles.',
    detail:
      'Le démon céleste, l’usine cachée et le retour des Riku composent un miroir presque exact. La théorie propose que l’ancien roi cruel ne soit pas un ancêtre, mais Doflamingo lui-même devenu sa propre caricature historique.',
    status: 'extension',
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
      'Face à Aqua Laguna et à l’affaissement de la ville, Icebarg annonce vouloir transformer toute Water Seven en navire.',
    detail:
      'Le maire présente ce projet aux habitants après le départ de l’équipage de Luffy. Il reconnaît l’ampleur du chantier, mais choisit cette solution pour permettre à la cité de survivre aux vagues futures.',
    status: 'canon',
    chapter: 'Ch. 431',
    image: images.pluton,
    imageAlt: 'Water Seven et le projet de ville flottante d’Icebarg',
    links: [{ label: 'Water Seven', href: '/theorie/pluton-water-seven-galley-la' }],
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
    summary:
      'Luffy s’effondre, son cœur repart au rythme des Tambours de la Libération, il éveille sa forme blanche et Zunesha annonce le retour de Joy Boy.',
    detail:
      'Après le coup de Kaido, la voix de Luffy disparaît puis son corps s’éveille sous la forme du Gear 5. Zunesha reconnaît le rythme qu’il associe à Joy Boy, tandis que le Gorosei révèle le nom Nika du fruit.',
    status: 'canon',
    chapter: 'Ch. 1043–1044',
    image: images.origin,
    imageAlt: 'Le chapeau de paille au centre de la révélation de Nika',
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
      'Une fraction de Mother Flame alimente une puissance céleste qui efface Lulusia ; six jours plus tard, les océans montent d’un mètre.',
    detail:
      'Vegapunk confirme qu’une portion de la Mother Flame a été volée et utilisée pour activer une arme. L’attaque ouvre un trou persistant dans l’océan et provoque des séismes dans le monde entier.',
    status: 'canon',
    chapter: 'Ch. 1060, 1089, 1116',
    image: images.deluge,
    imageAlt: 'Une mer sombre et violente après la disparition de Lulusia',
    links: [{ label: 'Mother Flame', href: '/theorie/mother-flame' }],
  },
  {
    id: 'emeth-reconnait-luffy',
    date: 'Présent — Egghead',
    era: 'present',
    thread: 'memoire',
    icon: '⚙',
    title: 'Emeth appelle Luffy « Joy Boy »',
    summary:
      'Le robot se dit heureux de revoir Joy Boy, puis comprend que Luffy n’est pas exactement la personne dont il se souvenait.',
    detail:
      'Emeth se réveille au son des Tambours de la Libération, parle à Luffy et lui demande son nom. Après avoir entendu « Monkey D. Luffy », il constate une différence avec son ancien ami tout en continuant à l’aider.',
    status: 'canon',
    chapter: 'Ch. 1120–1122',
    image: images.emeth,
    imageAlt: 'Le robot Emeth parlant à Luffy sur Egghead',
    links: [{ label: 'Emeth', href: '/theorie/emeth-futur' }],
  },
  {
    id: 'emeth-reconnait-luffy-futur',
    date: 'Lecture d’Egghead',
    era: 'present',
    thread: 'memoire',
    icon: '⚙',
    title: 'Emeth reconnaîtrait le Luffy de la fin',
    summary:
      'Pour les Fous du Bus, Emeth reconnaîtrait dans le Luffy actuel la version future qu’il connaîtra sous le nom de Joy Boy.',
    detail:
      'Le robot ne se tromperait qu’à moitié : ses souvenirs seraient ceux d’un avenir déjà vécu pour lui. Cette extension suppose qu’Emeth ait été construit à la fin de l’aventure avant d’être déplacé deux cents ans dans le passé.',
    status: 'extension',
    image: images.emeth,
    imageAlt: 'Emeth rapprochant le Luffy actuel du Joy Boy de ses souvenirs',
    links: [{ label: 'Emeth, robot du futur', href: '/theorie/emeth-futur' }],
  },
  {
    id: 'haki-du-futur',
    date: 'Présent — Egghead',
    era: 'present',
    thread: 'joyboy',
    icon: 'ϟ',
    title: 'Le Haki enfermé pourrait venir de la fin',
    summary:
      'Le Haki enfermé par Joy Boy dans le nœud d’Emeth pourrait être celui du Luffy de la fin de l’aventure.',
    detail:
      'L’analyse compare la scène au Patronus du Prisonnier d’Azkaban : Luffy serait aidé par une puissance qu’il scellera lui-même plus tard. Le manga établit le Haki de Joy Boy et ses effets, mais pas son identité avec un Haki futur de Luffy.',
    status: 'hypothese',
    chapter: 'Ch. 1122',
    image: images.emethFranky,
    imageAlt: 'Franky et la technologie associée au nœud de Haki d’Emeth',
    links: [{ label: 'La voix de Joy Boy', href: '/theorie/voix-de-joy-boy' }],
  },
  {
    id: 'message-vegapunk',
    date: 'Présent — Egghead',
    era: 'present',
    thread: 'monde',
    icon: '≋',
    title: 'Vegapunk révèle le Déluge et une guerre inachevée',
    summary:
      'Le scientifique révèle qu’un ancien monde gît sous deux cents mètres d’eau et affirme que la guerre du Siècle oublié se poursuit.',
    detail:
      'Vegapunk explique que la montée des eaux fut provoquée par l’usage des Armes antiques et non par une catastrophe naturelle. Il refuse de désigner un camp moralement juste faute de connaître toute la vérité.',
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
    title: 'Les satellites contactent Haredas à Weatheria',
    summary:
      'Les satellites survivants de Vegapunk prennent contact avec Haredas, spécialiste des Weather Nodes de l’île céleste.',
    detail:
      'Le contact avec Weatheria et Haredas est montré après l’incident d’Egghead. Les Weather Nodes y stockent et libèrent des phénomènes météorologiques, notamment le vent.',
    status: 'canon',
    chapter: 'Ch. 1125',
    image: images.emethFranky,
    imageAlt: 'Les satellites de Vegapunk avant leur contact avec Weatheria',
    links: [{ label: 'Énergie antique', href: '/theorie/energie-antique' }],
  },
  {
    id: 'haki-node-weatheria',
    date: 'Après Egghead — hypothèse',
    era: 'present',
    thread: 'armes',
    icon: '⚡',
    title: 'Weatheria pourrait permettre de recréer le nœud de Haki',
    summary:
      'Les satellites pourraient adapter la technologie des Weather Nodes pour sceller le Haki de Luffy comme dans le nœud d’Emeth.',
    detail:
      'Cette destination prépare peut-être un Haki Node : le principe de stockage du vent serait appliqué au Haki. Franky, Lilith et les satellites pourraient ensuite intégrer ce dispositif à un nouvel Emeth.',
    status: 'hypothese',
    chapter: 'Analyse du ch. 1125',
    links: [{ label: 'Énergie antique', href: '/theorie/energie-antique' }],
  },
  {
    id: 'halley-elbaf',
    date: 'Présent — Elbaf',
    era: 'present',
    thread: 'memoire',
    icon: '✧',
    title: 'Le Harley décrirait des scènes en train de se réaliser',
    summary:
      'Le texte sacré et la fresque d’Elbaf sont rapprochés d’une bête sous l’orage, du Dieu Soleil et d’une guerre mondiale actuelle.',
    detail:
      'La précision perçue des scènes pousse la théorie à y voir un témoignage plutôt qu’une prophétie. Usopp, conteur lié aux géants, pourrait en devenir l’auteur sous le nom de Louis Arnot et transmettre ce récit vers le passé.',
    status: 'extension',
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
    title: 'Loki prendrait le visage de Nidhogg',
    summary:
      'Le prince, Ragnir et Ratatosk formeraient dans le présent les figures que le folklore d’Elbaf décrit déjà comme anciennes.',
    detail:
      'Cette extension ne suppose pas une réincarnation : les actes de Loki produiraient la légende de Nidhogg lorsque leur récit serait transmis au passé. Elle reste une branche secondaire de la théorie principale.',
    status: 'extension',
    image: images.galley,
    imageAlt: 'Indices reliant Loki aux géants de la Galley-La',
    links: [{ label: 'Nidhogg et Ratatoskr', href: '/theorie/nidhogg-ratatoskr' }],
  },
  {
    id: 'geants-recits-contradictoires',
    date: 'Présent — Elbaf',
    era: 'present',
    thread: 'monde',
    icon: '≠',
    title: 'Deux récits sur la défaite des géants se contredisent',
    summary:
      'Les affirmations d’Imu sur une défaite des géants huit cents ans plus tôt ne concordent pas avec l’histoire transmise à Elbaf.',
    detail:
      'Le chapitre 1186 juxtapose les paroles d’Imu et les repères historiques connus des géants. La contradiction appartient au texte ; sa cause, en revanche, n’est pas expliquée.',
    status: 'canon',
    chapter: 'Ch. 1186',
    links: [{ label: 'Analyse du chapitre 1186', href: '/chapitres/1186' }],
  },
  {
    id: 'imu-confond-geants-epoque',
    date: 'Hypothèse au présent',
    era: 'present',
    thread: 'memoire',
    icon: '⌁',
    title: 'Imu pourrait confondre le présent des géants avec leur passé',
    summary:
      'La contradiction historique deviendrait un indice qu’Imu attribue à huit siècles plus tôt des événements qui se produisent maintenant.',
    detail:
      'L’analyse 1186 applique ici le renversement général de la théorie : Imu disposerait d’informations exactes mais d’un mauvais cadre temporel. Une erreur, un mensonge politique ou une lacune historique restent toutefois des explications concurrentes.',
    status: 'hypothese',
    chapter: 'Analyse 1186',
    links: [{ label: 'Le Siècle oublié est le présent', href: '/theorie/siecle-oublie-present' }],
  },
  {
    id: 'imu-appelle-luffy-joyboy',
    date: 'Présent — Elbaf',
    era: 'present',
    thread: 'joyboy',
    icon: '☀',
    title: 'Imu appelle directement Luffy « Joy Boy »',
    summary:
      'Luffy rejette ce nom et répond qu’il n’est ni Joy Boy ni Nika, mais Monkey D. Luffy, celui qui deviendra Roi des pirates.',
    detail:
      'L’échange oppose le nom qu’Imu projette sur son adversaire à l’identité que Luffy affirme lui-même. La scène ne confirme pas que Luffy accepte Joy Boy comme nom ou comme titre.',
    status: 'canon',
    chapter: 'Ch. 1187',
    image: images.imu,
    imageAlt: 'Imu s’adressant à Luffy sous le nom de Joy Boy',
    links: [{ label: 'Analyse du chapitre 1187', href: '/chapitres/1187' }],
  },
  {
    id: 'joyboy-consequence-histoire',
    date: 'Lecture d’Elbaf',
    era: 'present',
    thread: 'joyboy',
    icon: '∞',
    title: 'Joy Boy serait une conséquence de huit siècles d’Histoire',
    summary:
      'Luffy ne reproduirait pas un héros originel : les promesses, les peuples et les volontés héritées finiraient par produire Joy Boy.',
    detail:
      'C’est la conclusion centrale de l’analyse 1187. Luffy refuse d’endosser un nom ancien au présent ; ses actes pourraient néanmoins conduire le monde à le reconnaître ainsi à la fin. Joy Boy devient le résultat de l’Histoire plutôt que son point de départ.',
    status: 'central',
    chapter: 'Analyse 1187',
    image: images.origin,
    imageAlt: 'Luffy au centre des volontés qui construisent la figure de Joy Boy',
    links: [{ label: 'Joy Boy', href: '/theorie/joy-boy' }],
  },
  {
    id: 'conversation-imu-joyboy',
    date: 'Présent — révélation 1188',
    era: 'present',
    thread: 'memoire',
    icon: '◌',
    title: 'Une conversation sans époque claire est révélée',
    summary:
      'Imu et celui qui est présenté comme Joy Boy échangent par un dispositif mystérieux, sans contexte temporel explicitement donné.',
    detail:
      'Ni Imu ni son interlocuteur n’identifie clairement l’autre. La scène établit leur échange et son ambiguïté ; elle ne précise ni l’emplacement de Joy Boy, ni la date de la conversation, ni le fonctionnement du dispositif.',
    status: 'canon',
    chapter: 'Ch. 1188',
    image: images.imu,
    imageAlt: 'Imu au cours d’une conversation dont l’époque reste inconnue',
    links: [{ label: 'Analyse du chapitre 1188', href: '/chapitres/1188' }],
  },
  {
    id: 'vingt-rois-reviennent',
    date: 'Présent — branche post-1188',
    era: 'present',
    thread: 'monde',
    icon: '♛',
    title: 'Les Chevaliers Divins pourraient reformer les Vingt Rois',
    summary:
      'Les familles fondatrices et leurs armes actuelles sont rapprochées de la coalition historique des Vingt Rois.',
    detail:
      'Cette extension récente identifie les Chevaliers Divins à la version contemporaine des souverains fondateurs. Comme elle dépend d’analyses 1189–1190, elle reste explicitement séparée du noyau vérifié ici jusqu’au chapitre 1188 et demande un audit dédié.',
    status: 'extension',
    chapter: 'Analyses 1189–1190 · audit distinct',
    image: images.kings,
    imageAlt: 'Les familles royales fondatrices rapprochées des Chevaliers Divins',
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
    title: 'Imu pourrait atteindre la puissance associée à Uranus',
    summary:
      'Imu pourrait utiliser la Mother Flame pour atteindre ou alimenter la puissance céleste que le monde associera à Uranus.',
    detail:
      'Le chapitre 1180 n’impose pas qu’Imu et Mother Flame deviennent littéralement l’Arme antique. La projection conserve plusieurs possibilités : Imu peut incarner Uranus, contrôler une machine volante ou seulement employer une puissance qui recevra ensuite ce nom.',
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
    title: 'La guerre pourrait reproduire le Déluge',
    summary:
      'La guerre pourrait provoquer une nouvelle montée massive des océans, jusqu’à reproduire le Déluge de deux cents mètres décrit par Vegapunk.',
    detail:
      'Lulusia montre qu’une attaque peut faire monter la mer, sans établir une équation répétitive entre chaque royaume effacé et une hausse donnée. La projection porte sur l’effet global de la guerre et de l’usage des Armes antiques.',
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
    title: 'Zunesha et Water Seven ouvrent Wano',
    summary:
      'L’éléphant et l’île-navire devenue Pluton reviennent vider la cuvette, refroidir le Mont Fuji et détruire les murailles du pays.',
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
    id: 'luffy-repond-imu-laugh-tale',
    date: 'Projection — à Laugh Tale',
    era: 'aube',
    thread: 'memoire',
    icon: '◌',
    title: 'Luffy pourrait être celui qui répond à Imu',
    summary:
      'Arrivé à Laugh Tale à la fin de son aventure, Luffy pourrait répondre à l’appel entendu huit siècles plus tôt et se présenter comme Joy Boy.',
    detail:
      'Cette projection de l’analyse 1188 complète les cartes placées au passé et au présent. Luffy ne dirait plus qu’il deviendra Roi des pirates après avoir accompli ce rêve ; il emploierait le nom par lequel le monde vient de le reconnaître. Le manga ne donne pas encore la solution.',
    status: 'projection',
    chapter: 'Analyse 1188',
    image: images.origin,
    imageAlt: 'Luffy à Laugh Tale répondant à une communication venue du passé',
    links: [{ label: 'Analyse du chapitre 1188', href: '/chapitres/1188' }],
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
    title: 'Les informations et les Ponéglyphes atteignent le passé',
    summary:
      'Le noyau de la théorie propose que la mémoire gravée du futur soit transmise au passé et y devienne le récit du Siècle oublié.',
    detail:
      'Cette carte se limite au mécanisme indispensable : l’information contenue dans les Ponéglyphes précède les événements qu’elle raconte. Elle ne suppose pas que tous les personnages, toutes les technologies ou le monde entier soient déplacés physiquement.',
    status: 'central',
    image: images.poneglyph,
    imageAlt: 'Un Ponéglyphe portant une écriture qui traverse les siècles',
    links: [{ label: 'Communication à travers le temps', href: '/theorie/communication-temps' }],
  },
  {
    id: 'harley-vers-passe',
    date: '↺ Branche : époque inconnue',
    era: 'retour',
    thread: 'memoire',
    icon: '✧',
    title: 'Le Harley pourrait accompagner la mémoire',
    summary:
      'Le récit attribué à Usopp ou Louis Arnot pourrait être transmis à Elbaf avec les informations destinées au passé.',
    detail:
      'Cette extension expliquerait pourquoi le texte sacré semble décrire des scènes de la guerre finale. Elle est plus spéculative que le rôle des Ponéglyphes : ni son auteur, ni sa date, ni son mode de transmission ne sont établis.',
    status: 'extension',
    image: images.origin,
    imageAlt: 'Le Harley d’Elbaf associé à une transmission vers le passé',
    links: [{ label: 'Elbaf et le Harley', href: '/theorie/elbaf-harley' }],
  },
  {
    id: 'transport-physique-limite',
    date: '↺ Branche physique',
    era: 'retour',
    thread: 'memoire',
    icon: '⌁',
    title: 'Quelques êtres pourraient être déplacés physiquement',
    summary:
      'Emeth ou Zoro pourraient rejoindre une époque antérieure, sans transformer toute la théorie en voyage temporel généralisé.',
    detail:
      'Cette hypothèse avancée sert les branches Emeth/BF-39 et Zoro/Ryuma. Son mécanisme reste inconnu, et le Toki Toki no Mi montré dans le manga ne voyage que vers le futur. Elle n’est donc pas nécessaire au noyau informationnel.',
    status: 'extension',
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
      'Sa mission, sa corrosion et son erreur de datation formeraient une chaîne de transmission. Le Gouvernement pense étudier une antiquité, puis Vegapunk et Franky utilisent ces recherches pour construire précisément la machine qu’ils ont sous les yeux.',
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
    title: 'La légende de Ryuma serait déposée dans le passé',
    summary:
      'Zoro et Shusui rejoindraient l’ancien Wano, permettant au sabreur de devenir la figure qu’il admirait sans le savoir.',
    detail:
      'C’est l’une des extensions physiques les plus spéculatives de la transcription. Elle rapproche la dépouille de Ryuma, son œil, son sabre et la rencontre de Thriller Bark, mais dépend d’un déplacement temporel inconnu.',
    status: 'extension',
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
    title: 'Le futur pourrait devenir le « Royaume antique » des sources',
    summary:
      'Le monde et les technologies produits à la fin de l’histoire pourraient être ceux que les sources du passé décrivent comme le Royaume antique.',
    detail:
      'Il n’est pas nécessaire que le monde futur entier soit expédié vers −900 ans. Le passé pourrait seulement recevoir ses descriptions, ses plans, ses objets ou certaines de ses inventions, puis les interpréter comme les vestiges d’une civilisation disparue.',
    status: 'extension',
    image: images.origin,
    imageAlt: 'Le futur technologique interprété par le passé comme le Royaume antique',
    links: [{ label: 'Le Royaume antique', href: '/theorie/royaume-antique' }],
  },
  {
    id: 'laugh-tale-est-lodestar',
    date: '↺ Le temps comme destination',
    era: 'retour',
    thread: 'memoire',
    icon: '◎',
    title: 'Laugh Tale pourrait lier Lodestar à une autre époque',
    summary:
      'Laugh Tale pourrait être liée à Lodestar et à une dimension temporelle ; le rôle exact du quatrième Road Ponéglyphe reste à déterminer.',
    detail:
      'La formulation initiale proposait Lodestar au futur et une quatrième coordonnée temporelle. L’analyse 1188 ajoute une alternative : Roger a peut-être reçu une communication sans déplacement physique. Cette carte devient donc une hypothèse de mécanisme, pas le noyau obligatoire.',
    status: 'hypothese',
    image: images.roger,
    imageAlt: 'Roger face au mystère temporel de la destination finale',
    links: [{ label: 'Road Ponéglyphes et temps', href: '/explorer/road-poneglyphes-temps' }],
  },
];
