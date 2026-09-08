export interface CloudflareD1Result {
  success: boolean;
  meta: {
    changes?: number;
  };
}

export interface CloudflareD1PreparedStatement {
  bind(...values: unknown[]): CloudflareD1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<CloudflareD1Result>;
}

export interface CloudflareD1Database {
  prepare(query: string): CloudflareD1PreparedStatement;
}

declare global {
  interface CloudflareEnv {
    DB_BUS?: CloudflareD1Database;
  }
}
