import type { KVNamespace } from "@opennextjs/cloudflare";

declare global {
  interface CloudflareEnv {
    KV_BUS?: KVNamespace;
  }
}

export {};
