-- Conserve les trous laissés par les départs afin que les places stables ne
-- soient jamais rendues comme des passagers fantômes.
CREATE TABLE IF NOT EXISTS bus_vacant_seats (
  seat_index INTEGER PRIMARY KEY
);

WITH RECURSIVE seats(seat_index) AS (
  SELECT 0
  UNION ALL
  SELECT seat_index + 1
  FROM seats, bus_stats
  WHERE seat_index + 1 < bus_stats.seat_capacity AND bus_stats.id = 1
)
INSERT OR IGNORE INTO bus_vacant_seats (seat_index)
SELECT seats.seat_index
FROM seats
LEFT JOIN bus_entries ON bus_entries.seat_index = seats.seat_index
WHERE bus_entries.seat_index IS NULL
  AND seats.seat_index < (SELECT seat_capacity FROM bus_stats WHERE id = 1);

CREATE TRIGGER IF NOT EXISTS bus_entries_vacant_seat_after_delete
AFTER DELETE ON bus_entries
BEGIN
  INSERT OR IGNORE INTO bus_vacant_seats (seat_index) VALUES (OLD.seat_index);
  DELETE FROM bus_vacant_seats
  WHERE seat_index >= COALESCE((SELECT MAX(seat_index) + 1 FROM bus_entries), 0);
END;

CREATE TRIGGER IF NOT EXISTS bus_entries_vacant_seat_after_insert
AFTER INSERT ON bus_entries
BEGIN
  DELETE FROM bus_vacant_seats WHERE seat_index = NEW.seat_index;
END;
