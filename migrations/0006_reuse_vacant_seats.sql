-- Les nouveaux passagers occupent d'abord la première place libérée. Le bus
-- garde les indices existants stables et le nombre de plages vacantes reste
-- naturellement borné par les places encore disponibles.
CREATE TRIGGER IF NOT EXISTS bus_entries_vacant_range_after_insert
AFTER INSERT ON bus_entries
BEGIN
  DELETE FROM bus_vacant_seat_ranges
  WHERE start_index = NEW.seat_index AND end_index = NEW.seat_index;

  UPDATE bus_vacant_seat_ranges
  SET start_index = start_index + 1
  WHERE start_index = NEW.seat_index AND end_index > NEW.seat_index;
END;
