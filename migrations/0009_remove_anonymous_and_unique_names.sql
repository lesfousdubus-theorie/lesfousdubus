-- Supprime tous les passagers anonymes existants.
DELETE FROM bus_entries
WHERE display_name IS NULL
   OR TRIM(display_name) = ''
   OR LOWER(TRIM(display_name)) IN ('anonyme', 'anonymous');

-- Si d'anciens doublons de noms existent déjà, conserve le premier arrivé tel quel
-- et distingue les suivants avant d'activer l'index d'unicité insensible à la casse.
WITH dup_ranked AS (
  SELECT
    visitor_id,
    TRIM(display_name) AS clean_name,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(display_name))
      ORDER BY entry_number ASC, rowid ASC
    ) AS dup_rn
  FROM bus_entries
)
UPDATE bus_entries
SET display_name = (
  SELECT SUBSTR(clean_name, 1, 20) || ' #' || dup_rn
  FROM dup_ranked
  WHERE dup_ranked.visitor_id = bus_entries.visitor_id
)
WHERE visitor_id IN (SELECT visitor_id FROM dup_ranked WHERE dup_rn > 1);

-- Pour cette purge unique des anonymes, décale toutes les places (seat_index 0..N-1)
-- et réattribue les numéros de ticket (entry_number 1..N) en gardant l'ordre d'arrivée.
-- Par la suite, les suppressions individuelles ne modifieront plus entry_number.
WITH ranked AS (
  SELECT
    visitor_id,
    ROW_NUMBER() OVER (ORDER BY entry_number ASC, rowid ASC) AS rn
  FROM bus_entries
)
UPDATE bus_entries
SET seat_index = -(SELECT rn FROM ranked WHERE ranked.visitor_id = bus_entries.visitor_id),
    entry_number = -(SELECT rn FROM ranked WHERE ranked.visitor_id = bus_entries.visitor_id);

UPDATE bus_entries
SET seat_index = -seat_index - 1,
    entry_number = -entry_number
WHERE seat_index < 0;

-- Empêche deux passagers d'avoir le même nom en même temps (insensible à la casse).
-- Dès qu'un passager change de nom ou supprime sa place, l'ancien nom redevient disponible.
CREATE UNIQUE INDEX IF NOT EXISTS bus_entries_unique_display_name
ON bus_entries(LOWER(TRIM(display_name)))
WHERE display_name IS NOT NULL AND TRIM(display_name) != '';

UPDATE bus_stats
SET passenger_count = (SELECT COUNT(*) FROM bus_entries),
    seat_capacity = (SELECT COUNT(*) FROM bus_entries),
    last_entry_number = COALESCE((SELECT MAX(entry_number) FROM bus_entries), 0),
    profile_revision = profile_revision + 1
WHERE id = 1;
