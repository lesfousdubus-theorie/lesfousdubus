-- Accélère les fusions de plages vacantes lors des suppressions sur de grands volumes.
CREATE INDEX IF NOT EXISTS bus_vacant_seat_ranges_end_index
ON bus_vacant_seat_ranges(end_index);
