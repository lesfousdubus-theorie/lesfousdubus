/**
 * Normalise une adresse IP pour les quotas. Un abonné IPv6 contrôle au moins
 * un préfixe /64 (soit 2^64 adresses) : sans regroupement, les limites par IP
 * seraient contournables en changeant simplement d'adresse source.
 */
export function normalizeRateAddress(address: string) {
  const value = address.trim().toLowerCase().split("%")[0];
  if (!value.includes(":")) return value;

  const mappedIpv4 = value.match(/^(?:::ffff:|0:0:0:0:0:ffff:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedIpv4) return mappedIpv4[1];

  const [head, tail] = value.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const groups = tail === undefined
    ? headGroups
    : [
      ...headGroups,
      ...Array<string>(Math.max(0, 8 - headGroups.length - tailGroups.length)).fill("0"),
      ...tailGroups,
    ];
  const prefix = Array.from({ length: 4 }, (_, index) => (groups[index] || "0").padStart(4, "0"));
  return `${prefix.join(":")}::/64`;
}
