import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { cpus } from "node:os";

const load = async path => {
  const result = await build({ entryPoints: [path], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
};
const { getBusOccupancy, getBusPhysicalRows } = await load("src/lib/bus-occupancy.ts");
const { getRenderedRowIndices } = await load("src/lib/bus-layout.ts");
const cases = [
  { name: "1000-dense", capacity: 1000, count: 1000, focus: 249, vacant: [] },
  { name: "10000-sparse-front", capacity: 10000, count: 5000, focus: 0, vacant: [[0, 4999, 0]] },
  { name: "100000-sparse-front", capacity: 100000, count: 50000, focus: 0, vacant: [[0, 49999, 0]] },
];
const results = [];
for (const test of cases) {
  const options = { passengerCount: test.count, seatCapacity: test.capacity, reservedRow: test.focus,
    currentPassengerIndex: null, avatarAboard: false, lowPower: false, vacantSeatRanges: test.vacant,
    renderedRowIndices: getRenderedRowIndices(getBusPhysicalRows(test.capacity), test.focus) };
  for (let warm = 0; warm < 3; warm++) getBusOccupancy(options);
  const samples = [];
  let occupancy;
  for (let sample = 0; sample < 30; sample++) {
    const start = performance.now();
    occupancy = getBusOccupancy(options);
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  results.push({ case: test.name, renderedRows: options.renderedRowIndices.length, medianMs: samples[15], p95Ms: samples[28],
    detailed: occupancy.detailed.length, simplified: occupancy.simplified.length });
}
const report = { measurement: "Node CPU selection only; these timings do not measure browser frames or GPU rendering.",
  node: process.version, cpu: cpus()[0]?.model, samplesPerCase: 30, warmupsPerCase: 3, results };
if (process.env.BUS_OCCUPANCY_BASELINE) {
  const previous = JSON.parse(await readFile(process.env.BUS_OCCUPANCY_BASELINE, "utf8"));
  const baseline = previous.results ?? previous;
  report.comparison = results.map(result => {
    const entry = baseline.find(item => item.case === result.case), before = entry?.before ?? entry;
    return { case: result.case, before, after: result, speedupMedian: before ? before.medianMs / result.medianMs : null };
  });
}
if (process.env.BUS_OCCUPANCY_OUTPUT) await writeFile(process.env.BUS_OCCUPANCY_OUTPUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
