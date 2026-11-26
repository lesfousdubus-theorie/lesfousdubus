import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";

const loadModule = async (entryPoint) => {
  const bundled = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
  });
  return import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
};

const { CENTRAL_THESIS, THEORY_FOUNDATIONS, THEORY_GROUPS, THEORY_FAQ, THEORY_REFERENCES } =
  await loadModule("src/lib/theory-data.ts");
const { CENTRAL_THESIS_EN, THEORY_FOUNDATIONS_EN, THEORY_GROUPS_EN, THEORY_FAQ_EN, THEORY_REFERENCES_EN } =
  await loadModule("src/lib/theory-data-en.ts");

const SITE_URL = "https://lesfousdubus.sbs";
const CREATOR_URL = "https://x.com/Epikaigle";
const RELAY_URL = "https://x.com/FoudubusTV_";
const GITHUB_URL = "https://github.com/lesfousdubus-theorie/lesfousdubus";
const MONT_CORVO_URL = "https://www.youtube.com/@MontCorvo";

const introductionFr = [
  "# Les Fous du Bus — La théorie One Piece du Mont Corvo",
  "> Expérience 3D interactive de fans autour de la théorie One Piece « Le Siècle Oublié est le Présent » du Mont Corvo : monte à bord du bus sur Grand Line, choisis ton avatar et découvre comment les Ponéglyphes seraient la mémoire de l’avenir. Site créé par Epikaigle (@Epikaigle), relais X par FoudubusTV (@FoudubusTV_).",
  `## ${CENTRAL_THESIS.title}`,
  CENTRAL_THESIS.subtitle,
  CENTRAL_THESIS.overview,
  CENTRAL_THESIS.context,
  "## Comprendre le mécanisme",
  ...THEORY_FOUNDATIONS.flatMap((item) => [`### ${item.title}`, item.text]),
];

const aiDocsFr = [
  "## Documentation complète pour IA",
  [
    `- [Théorie complète et FAQ (Français)](${SITE_URL}/llms-full.txt) : tous les arguments, parallèles de personnages, sources X et 12 questions fréquentes.`,
    `- [Full Theory and FAQ (English)](${SITE_URL}/llms-en.txt) : complete English version of the Bus Fools One Piece theory and FAQ.`,
    `- [Expérience interactive 3D](${SITE_URL}/) : le bus des Fous du Bus sur Grand Line (français et anglais).`,
  ].join("\n"),
];

const resourcesFr = [
  "## Ressources et crédits",
  [
    `- [Vidéo complète du Mont Corvo (3h27)](${THEORY_REFERENCES.video.url})`,
    `- [Chaîne YouTube Mont Corvo](${MONT_CORVO_URL})`,
    `- [Fils sur X (@FoudubusTV_)](${THEORY_REFERENCES.threads.url})`,
    `- [Fonctionnement de la théorie (@FoudubusTV_)](${THEORY_REFERENCES.mechanism.url})`,
    `- [Relais X de la théorie : @FoudubusTV_](${RELAY_URL})`,
    `- [Créateur du site : @Epikaigle](${CREATOR_URL})`,
    `- [Code source GitHub](${GITHUB_URL})`,
    `- [Expérience du bus](${SITE_URL}/)`,
  ].join("\n"),
];

const formatPoint = (section) => [
  `### ${section.title}`,
  section.summary,
  ...(section.sources ?? []).map((source) => `- [${source.label}](${source.url})`),
];

const fullFr = [
  ...introductionFr,
  ...THEORY_GROUPS.flatMap((group) => [`## ${group.title}`, ...group.sections.flatMap(formatPoint)]),
  "## Questions fréquentes",
  ...THEORY_FAQ.flatMap((item) => [`### ${item.question}`, item.answer]),
  ...resourcesFr,
].join("\n\n") + "\n";

const shortFr = [
  ...introductionFr,
  ...aiDocsFr,
  "## Les thèmes de la théorie",
  ...THEORY_GROUPS.map((group) => `- **${group.title}** : ${group.sections.map((section) => section.title).join(" ; ")}.`),
  ...resourcesFr,
].join("\n\n") + "\n";

const fullEn = [
  "# The Bus Fools Theory — Mont Corvo’s One Piece Theory",
  "> Interactive 3D fan experience dedicated to Mont Corvo’s One Piece theory “The Void Century is the Present”: board the bus across Grand Line, pick your avatar, and explore how the Poneglyphs could be memories sent back from the future. Site created by Epikaigle (@Epikaigle), X theory relay by FoudubusTV (@FoudubusTV_).",
  `## ${CENTRAL_THESIS_EN.title}`,
  CENTRAL_THESIS_EN.subtitle,
  CENTRAL_THESIS_EN.overview,
  CENTRAL_THESIS_EN.context,
  "## How the mechanism works",
  ...THEORY_FOUNDATIONS_EN.flatMap((item) => [`### ${item.title}`, item.text]),
  ...THEORY_GROUPS_EN.flatMap((group) => [`## ${group.title}`, ...group.sections.flatMap(formatPoint)]),
  "## Frequently Asked Questions",
  ...THEORY_FAQ_EN.flatMap((item) => [`### ${item.question}`, item.answer]),
  "## Resources & Credits",
  [
    `- [Full Mont Corvo Video (French, 3h27)](${THEORY_REFERENCES_EN.video.url})`,
    `- [Mont Corvo YouTube Channel](${MONT_CORVO_URL})`,
    `- [Threads on X (@FoudubusTV_)](${THEORY_REFERENCES_EN.threads.url})`,
    `- [How the theory works (@FoudubusTV_)](${THEORY_REFERENCES_EN.mechanism.url})`,
    `- [X Theory Relay: @FoudubusTV_](${RELAY_URL})`,
    `- [Site Creator: @Epikaigle](${CREATOR_URL})`,
    `- [GitHub Source Code](${GITHUB_URL})`,
    `- [Interactive 3D Bus](${SITE_URL}/)`,
    `- [French AI Summary (llms.txt)](${SITE_URL}/llms.txt)`,
    `- [French Full Theory & FAQ (llms-full.txt)](${SITE_URL}/llms-full.txt)`,
  ].join("\n"),
].join("\n\n") + "\n";

const targets = [
  ["public/llms.txt", shortFr],
  ["public/llms-full.txt", fullFr],
  ["public/llms-en.txt", fullEn],
];

for (const [path, expected] of targets) {
  if (process.argv.includes("--check")) {
    const current = await readFile(path, "utf8").catch(() => null);
    if (current !== expected) throw new Error(`${path} est obsolète. Lancer npm run content:sync.`);
  } else {
    await writeFile(path, expected);
  }
}
console.log(process.argv.includes("--check") ? "Theory text versions are synchronized." : "Theory text versions updated.");
