import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";

const bundled = await build({ entryPoints: ["src/lib/theory-data.ts"], bundle: true, write: false, format: "esm", platform: "node" });
const { CENTRAL_THESIS, THEORY_FOUNDATIONS, THEORY_GROUPS, THEORY_OPEN_QUESTIONS, THEORY_FAQ, THEORY_REFERENCES } =
  await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

const introduction = [
  "# Les Fous du Bus — La théorie du Mont Corvo",
  CENTRAL_THESIS.attribution,
  `## ${CENTRAL_THESIS.title}`,
  CENTRAL_THESIS.subtitle,
  CENTRAL_THESIS.overview,
  CENTRAL_THESIS.context,
  "## Comprendre le mécanisme",
  ...THEORY_FOUNDATIONS.flatMap(item => [`### ${item.title}`, item.text]),
];
const resources = [
  "## Ressources",
  `- Vidéo : ${THEORY_REFERENCES.video.url}\n- Fils de FoudubusTV : ${THEORY_REFERENCES.threads.url}\n- Fonctionnement : ${THEORY_REFERENCES.mechanism.url}\n- Lire la théorie : https://lesfousdubus.sbs/theorie\n- Expérience du bus : https://lesfousdubus.sbs/`,
];
const point = section => [
  `### ${section.title}`,
  section.summary,
  ...(section.note ? [section.note] : []),
  ...[...(section.sourceSeconds === undefined ? [] : [{ label: "Vidéo", url: `${THEORY_REFERENCES.video.url}&t=${section.sourceSeconds}s` }]), ...(section.sources ?? [])]
    .map(source => `${source.label} : ${source.url}`),
];
const full = [
  ...introduction,
  ...THEORY_GROUPS.flatMap(group => [`## ${group.title}`, ...group.sections.flatMap(point)]),
  `## ${THEORY_OPEN_QUESTIONS.title}`, THEORY_OPEN_QUESTIONS.text,
  "## Questions fréquentes",
  ...THEORY_FAQ.flatMap(item => [`### ${item.question}`, item.answer]),
  ...resources,
].join("\n\n") + "\n";
const short = [
  ...introduction,
  "## Les thèmes de la théorie",
  ...THEORY_GROUPS.map(group => `- ${group.title} : ${group.sections.map(section => section.title).join(" ; ")}.`),
  `## ${THEORY_OPEN_QUESTIONS.title}`, THEORY_OPEN_QUESTIONS.text,
  ...resources,
].join("\n\n") + "\n";

for (const [path, expected] of [["public/llms.txt", short], ["public/llms-full.txt", full]]) {
  if (process.argv.includes("--check")) {
    if (await readFile(path, "utf8") !== expected) throw new Error(`${path} est obsolète. Lancer npm run content:sync.`);
  } else {
    await writeFile(path, expected);
  }
}
console.log(process.argv.includes("--check") ? "Theory text versions are synchronized." : "Theory text versions updated.");
