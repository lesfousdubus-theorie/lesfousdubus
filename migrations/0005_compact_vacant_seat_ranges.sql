-- Regroupe les places vacantes contiguës. La réponse de synchronisation reste
-- compacte même après un grand nombre de départs.
CREATE TABLE IF NOT EXISTS bus_vacant_seat_ranges (
  start_index INTEGER PRIMARY KEY,
  end_index INTEGER NOT NULL,
  CHECK (start_index >= 0 AND end_index >= start_index)
);

WITH grouped AS (
  SELECT seat_index,
         seat_index - ROW_NUMBER() OVER (ORDER BY seat_index) AS group_id
  FROM bus_vacant_seats
)
INSERT OR IGNORE INTO bus_vacant_seat_ranges (start_index, end_index)
SELECT MIN(seat_index), MAX(seat_index)
FROM grouped
GROUP BY group_id;

DROP TRIGGER IF EXISTS bus_entries_vacant_seat_after_delete;
DROP TRIGGER IF EXISTS bus_entries_vacant_seat_after_insert;
DROP TABLE IF EXISTS bus_vacant_seats;

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
END;
