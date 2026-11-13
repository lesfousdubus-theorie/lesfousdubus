-- Lorsqu'un passager se retire définitivement, les passagers suivants se
-- décalent d'un siège vers l'avant pour garder toutes les places occupées sans
-- trou. En revanche, chaque passager conserve son numéro d'arrivée permanent
-- (entry_number) indiquant à quel rang historique il est entré dans le bus.

ALTER TABLE bus_entries ADD COLUMN entry_number INTEGER;

-- Préserve les numéros de place historiques des visiteurs déjà inscrits.
UPDATE bus_entries
SET entry_number = seat_index + 1
WHERE entry_number IS NULL;

-- Si des places vacantes existaient avant cette migration, compacte seat_index
-- sur 0..count-1 en passant par des valeurs négatives pour respecter l'unicité.
UPDATE bus_entries
SET seat_index = -(
  SELECT COUNT(*)
  FROM bus_entries AS earlier
  WHERE earlier.entry_number < bus_entries.entry_number
     OR (earlier.entry_number = bus_entries.entry_number AND earlier.rowid <= bus_entries.rowid)
);

UPDATE bus_entries
SET seat_index = -seat_index - 1
WHERE seat_index < 0;

CREATE UNIQUE INDEX IF NOT EXISTS bus_entries_entry_number
ON bus_entries(entry_number);

ALTER TABLE bus_stats ADD COLUMN last_entry_number INTEGER NOT NULL DEFAULT 0;

UPDATE bus_stats
SET passenger_count = (SELECT COUNT(*) FROM bus_entries),
    seat_capacity = (SELECT COUNT(*) FROM bus_entries),
    profile_revision = profile_revision + 1,
    last_entry_number = MAX(
      seat_capacity,
      COALESCE((SELECT MAX(entry_number) FROM bus_entries), 0)
    )
WHERE id = 1;

DROP TRIGGER IF EXISTS bus_entries_vacant_range_after_delete;
DROP TRIGGER IF EXISTS bus_entries_vacant_range_after_insert;
DROP TRIGGER IF EXISTS bus_entries_stable_seat_after_delete;
DROP TRIGGER IF EXISTS bus_entries_stable_seat_after_insert;
DROP TABLE IF EXISTS bus_vacant_seat_ranges;

CREATE TRIGGER IF NOT EXISTS bus_entries_compact_seat_after_insert
AFTER INSERT ON bus_entries
BEGIN
  UPDATE bus_entries
  SET entry_number = (SELECT last_entry_number + 1 FROM bus_stats WHERE id = 1)
  WHERE visitor_id = NEW.visitor_id AND entry_number IS NULL;

  UPDATE bus_stats
  SET seat_capacity = MAX(seat_capacity, NEW.seat_index + 1),
      last_entry_number = MAX(
        last_entry_number,
        COALESCE(
          NEW.entry_number,
          (SELECT entry_number FROM bus_entries WHERE visitor_id = NEW.visitor_id),
          last_entry_number + 1
        )
      ),
      profile_revision = profile_revision + 1
  WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS bus_entries_compact_seat_after_delete
AFTER DELETE ON bus_entries
BEGIN
  UPDATE bus_entries
  SET seat_index = -seat_index - 1
  WHERE seat_index > OLD.seat_index;

  UPDATE bus_entries
  SET seat_index = -seat_index - 2
  WHERE seat_index < 0;

  UPDATE bus_stats
  SET seat_capacity = (SELECT COUNT(*) FROM bus_entries),
      profile_revision = profile_revision + 1
  WHERE id = 1;
END;
