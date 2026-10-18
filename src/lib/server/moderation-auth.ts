interface ModerationSecrets {
  MODERATION_TOKEN?: string;
  RATE_LIMIT_SECRET?: string;
}

/** A missing, weak or reused token disables administration only. */
export async function isModerationAuthorized(request: Request, secrets: ModerationSecrets) {
  const configured = secrets.MODERATION_TOKEN?.trim() ?? "";
  if (configured.length < 32 || configured === secrets.RATE_LIMIT_SECRET?.trim()) return false;
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1].trim();
  if (!token || token.length !== configured.length) return false;

  // Compare fixed-size digests without an early return for a matching prefix.
  const encoder = new TextEncoder();
  const [actual, expected] = await Promise.all([token, configured].map(value =>
    crypto.subtle.digest("SHA-256", encoder.encode(value)).then(buffer => new Uint8Array(buffer)),
  ));
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
  return difference === 0;
}
