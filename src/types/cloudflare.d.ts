export interface CloudflareKVNamespace {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expiration?: number; expirationTtl?: number }
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

declare global {
  interface CloudflareEnv {
    KV_BUS?: CloudflareKVNamespace;
  }
}
