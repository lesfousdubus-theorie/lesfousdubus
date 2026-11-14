/** Permanent crew, independent of visitor seats and their database records. */
export const BUS_RELAY = {
  name: "FoudubusTV",
  role: "Relais de la théorie · X / Twitter",
  handle: "@FoudubusTV_",
  url: "https://x.com/FoudubusTV_",
} as const;

export const BUS_CREW = [
  { name: "Kamal", role: "Conducteur · Le Mont Corvo" },
  { name: "Kyta", role: "Copilote · Le Mont Corvo" },
  BUS_RELAY,
] as const;

export function countPeopleOnBoard(visitors: number): number {
  return visitors + BUS_CREW.length;
}
