ALTER TABLE bus_entries ADD COLUMN display_name TEXT;
ALTER TABLE bus_entries ADD COLUMN comment TEXT;

-- Une ligne de statistiques évite de relire toute la table toutes les 10 secondes.
CREATE TABLE IF NOT EXISTS bus_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  passenger_count INTEGER NOT NULL DEFAULT 0
);

INSERT OR REPLACE INTO bus_stats (id, passenger_count)
SELECT 1, COUNT(*) FROM bus_entries;

CREATE TRIGGER IF NOT EXISTS bus_entries_after_insert
AFTER INSERT ON bus_entries
BEGIN
  UPDATE bus_stats SET passenger_count = passenger_count + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS bus_entries_after_delete
AFTER DELETE ON bus_entries
BEGIN
  UPDATE bus_stats SET passenger_count = MAX(0, passenger_count - 1) WHERE id = 1;
END;
