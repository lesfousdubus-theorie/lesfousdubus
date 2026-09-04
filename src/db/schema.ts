import { pgTable, serial, timestamp, text } from "drizzle-orm/pg-core";

// Chaque ligne = une personne qui est montée dans le bus
export const busEntries = pgTable("bus_entries", {
  id: serial("id").primaryKey(),
  visitorId: text("visitor_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
