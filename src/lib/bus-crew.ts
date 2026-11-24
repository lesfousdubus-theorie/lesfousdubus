import type { Locale } from "./i18n-shared";

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

export function getBusCrew(locale: Locale) {
  if (locale !== "en") return BUS_CREW;
  return [
    { name: "Kamal", role: "Driver · Le Mont Corvo" },
    { name: "Kyta", role: "Co-pilot · Le Mont Corvo" },
    {
      name: BUS_RELAY.name,
      role: "Theory relay · X / Twitter",
      handle: BUS_RELAY.handle,
      url: BUS_RELAY.url,
    },
  ] as const;
}

export function countPeopleOnBoard(visitors: number): number {
  return Math.max(0, visitors);
}
