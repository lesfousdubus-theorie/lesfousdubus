/** Identifiants stables enregistrés en base, indépendants de l'ordre du carrousel. */
export const PASSENGER_AVATAR_IDS = [
  "luffy", "zoro", "nami", "usopp", "sanji", "chopper", "robin", "franky", "brook",
  "jinbe", "law", "ace", "sabo", "shanks", "yamato", "buggy", "doflamingo",
  "boa_hancock", "vivi", "mihawk",
] as const;

export type PassengerAvatarId = typeof PASSENGER_AVATAR_IDS[number];

export function isPassengerAvatarId(value: unknown): value is PassengerAvatarId {
  return typeof value === "string" && PASSENGER_AVATAR_IDS.some(id => id === value);
}
