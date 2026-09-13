-- Les numéros de place ne sont plus recalculés à chaque lecture. Une suppression
-- peut laisser un trou, mais ne déplace jamais les autres passagers.
ALTER TABLE bus_entries ADD COLUMN seat_index INTEGER;

UPDATE bus_entries AS entry
SET seat_index = (
  SELECT COUNT(*) - 1
  FROM bus_entries AS previous
  WHERE previous.rowid <= entry.rowid
);

CREATE UNIQUE INDEX IF NOT EXISTS bus_entries_seat_index
ON bus_entries(seat_index);

ALTER TABLE bus_stats ADD COLUMN seat_capacity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bus_stats ADD COLUMN profile_revision INTEGER NOT NULL DEFAULT 0;

UPDATE bus_stats
SET seat_capacity = COALESCE((SELECT MAX(seat_index) + 1 FROM bus_entries), 0),
    profile_revision = 1
WHERE id = 1;

CREATE TRIGGER IF NOT EXISTS bus_entries_stable_seat_after_insert
AFTER INSERT ON bus_entries
BEGIN
  UPDATE bus_stats
  SET seat_capacity = MAX(seat_capacity, NEW.seat_index + 1),
      profile_revision = profile_revision + 1
  WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS bus_entries_stable_seat_after_delete
AFTER DELETE ON bus_entries
BEGIN
  UPDATE bus_stats
  SET seat_capacity = COALESCE((SELECT MAX(seat_index) + 1 FROM bus_entries), 0),
      profile_revision = profile_revision + 1
  WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS bus_entries_profile_after_update
AFTER UPDATE OF display_name, comment ON bus_entries
WHEN OLD.display_name IS NOT NEW.display_name OR OLD.comment IS NOT NEW.comment
BEGIN
  UPDATE bus_stats
  SET profile_revision = profile_revision + 1
  WHERE id = 1;
END;

-- Compteurs courts et anonymisés pour freiner les créations et mutations
-- automatisées. Les clés sont des empreintes SHA-256, jamais des adresses IP.
CREATE TABLE IF NOT EXISTS bus_rate_limits (
  rate_key TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (rate_key, bucket)
);

CREATE INDEX IF NOT EXISTS bus_rate_limits_expiry
ON bus_rate_limits(expires_at);
