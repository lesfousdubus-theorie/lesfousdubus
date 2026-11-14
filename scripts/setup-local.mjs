import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Configure only the ignored local file. Existing, distinct valid secrets stay unchanged. */
export function setupLocalSecrets(path = resolve(".dev.vars")) {
  const original = existsSync(path) ? readFileSync(path, "utf8") : "";
  let contents = original;
  const read = name => {
    const value = new RegExp(`^${name}[ \\t]*=[ \\t]*([^\\r\\n]*)$`, "m").exec(contents)?.[1]?.trim() ?? "";
    const quoted = /^(["'])(.*?)\1(?:[ \t]*#.*)?$/.exec(value);
    return quoted ? quoted[2] : value.split("#", 1)[0].trim();
  };
  const replace = (name, value) => {
    const line = new RegExp(`^${name}[ \\t]*=[^\\r\\n]*`, "m");
    if (line.test(contents)) contents = contents.replace(line, `${name}=${value}`);
    else contents += `${contents && !contents.endsWith("\n") ? "\n" : ""}${name}=${value}\n`;
  };
  let quota = read("RATE_LIMIT_SECRET");
  if (quota.length < 32) { quota = randomBytes(32).toString("hex"); replace("RATE_LIMIT_SECRET", quota); }
  const moderation = read("MODERATION_TOKEN");
  if (moderation.length < 32 || moderation === quota) replace("MODERATION_TOKEN", randomBytes(32).toString("hex"));
  const changed = contents !== original;
  if (changed) writeFileSync(path, contents, { mode: 0o600 });
  chmodSync(path, 0o600);
  return { changed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { changed } = setupLocalSecrets();
  console.log(changed ? "Configuration locale prête dans .dev.vars (ignoré par Git)." : "Configuration locale déjà prête ; secrets conservés.");
  console.log("Deux secrets distincts sont disponibles localement. Aucune configuration Cloudflare distante n’a été modifiée.");
}
