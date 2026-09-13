import { spawnSync } from "node:child_process";

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(executable, ["wrangler", "secret", "list", "--format", "json"], {
  cwd: process.cwd(),
  encoding: "utf8",
});

if (result.error) {
  console.error(`Preflight Cloudflare impossible : ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  console.error("Le déploiement est interrompu avant la construction et les migrations.");
  process.exit(result.status ?? 1);
}

let secrets;
try {
  secrets = JSON.parse(result.stdout);
} catch {
  console.error("Wrangler a renvoyé une liste de secrets illisible.");
  process.exit(1);
}

if (!Array.isArray(secrets) || !secrets.some((secret) => secret?.name === "RATE_LIMIT_SECRET")) {
  console.error(
    "Le secret Cloudflare RATE_LIMIT_SECRET est absent. Créez-le avec : " +
      "openssl rand -hex 32 | npx wrangler secret put RATE_LIMIT_SECRET",
  );
  process.exit(1);
}

console.log("Préflight Cloudflare validé : RATE_LIMIT_SECRET est configuré.");
