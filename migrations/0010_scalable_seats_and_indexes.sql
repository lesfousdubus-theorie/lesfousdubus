-- Remplace le compactage O(N) à la suppression par des plages de places vacantes en O(1)
-- et ajoute un index partiel pour le mur des messages sans balayage complet de la table.

CREATE TABLE IF NOT EXISTS bus_vacant_seat_ranges (
  start_index INTEGER PRIMARY KEY,
  end_index INTEGER NOT NULL,
  CHECK (start_index >= 0 AND end_index >= start_index)
);

DROP TRIGGER IF EXISTS bus_entries_compact_seat_after_delete;
DROP TRIGGER IF EXISTS bus_entries_vacant_range_after_delete;
DROP TRIGGER IF EXISTS bus_entries_vacant_range_after_insert;

CREATE TRIGGER IF NOT EXISTS bus_entries_vacant_range_after_delete
AFTER DELETE ON bus_entries
BEGIN
  INSERT OR IGNORE INTO bus_vacant_seat_ranges (start_index, end_index)
  VALUES (OLD.seat_index, OLD.seat_index);

  UPDATE bus_vacant_seat_ranges
  SET end_index = OLD.seat_index
  WHERE end_index = OLD.seat_index - 1;

  DELETE FROM bus_vacant_seat_ranges
  WHERE start_index = OLD.seat_index
    AND EXISTS (
      SELECT 1 FROM bus_vacant_seat_ranges AS previous
      WHERE previous.start_index < OLD.seat_index
        AND previous.end_index = OLD.seat_index
    );

  UPDATE bus_vacant_seat_ranges
  SET end_index = (
    SELECT following.end_index
    FROM bus_vacant_seat_ranges AS following
    WHERE following.start_index = OLD.seat_index + 1
  )
  WHERE end_index = OLD.seat_index
    AND EXISTS (
      SELECT 1 FROM bus_vacant_seat_ranges AS following
      WHERE following.start_index = OLD.seat_index + 1
    );

  DELETE FROM bus_vacant_seat_ranges
  WHERE start_index = OLD.seat_index + 1
    AND EXISTS (
      SELECT 1 FROM bus_vacant_seat_ranges AS merged
      WHERE merged.start_index < OLD.seat_index + 1
        AND merged.end_index >= bus_vacant_seat_ranges.end_index
    );

  DELETE FROM bus_vacant_seat_ranges
  WHERE start_index >= COALESCE((SELECT MAX(seat_index) + 1 FROM bus_entries), 0);

  UPDATE bus_vacant_seat_ranges
  SET end_index = COALESCE((SELECT MAX(seat_index) FROM bus_entries), -1)
  WHERE end_index > COALESCE((SELECT MAX(seat_index) FROM bus_entries), -1);

  UPDATE bus_stats
  SET seat_capacity = COALESCE((SELECT MAX(seat_index) + 1 FROM bus_entries), 0),
      profile_revision = profile_revision + 1
  WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS bus_entries_vacant_range_after_insert
AFTER INSERT ON bus_entries
BEGIN
  DELETE FROM bus_vacant_seat_ranges
  WHERE start_index = NEW.seat_index AND end_index = NEW.seat_index;

  UPDATE bus_vacant_seat_ranges
  SET start_index = start_index + 1
  WHERE start_index = NEW.seat_index AND end_index > NEW.seat_index;
END;

CREATE INDEX IF NOT EXISTS bus_entries_with_comment_seat
ON bus_entries(seat_index)
WHERE comment IS NOT NULL AND comment != '';
