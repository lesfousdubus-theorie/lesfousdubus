export const VISITOR_ID_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;

export function isValidVisitorId(value: unknown): value is string {
  return typeof value === "string" && VISITOR_ID_PATTERN.test(value);
}
