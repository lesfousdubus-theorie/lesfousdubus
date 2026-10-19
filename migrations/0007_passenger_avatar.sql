-- Le choix appartient au visiteur et survit aux visites suivantes. NULL conserve
-- l'apparence historique calculée à partir du numéro de place.
ALTER TABLE bus_entries ADD COLUMN avatar_id TEXT
  CHECK (avatar_id IS NULL OR avatar_id IN (
    'luffy', 'zoro', 'nami', 'usopp', 'sanji', 'chopper', 'robin', 'franky', 'brook',
    'jinbe', 'law', 'ace', 'sabo', 'shanks', 'yamato', 'buggy', 'doflamingo',
    'boa_hancock', 'vivi', 'mihawk'
  ));

CREATE TRIGGER IF NOT EXISTS bus_entries_avatar_after_update
AFTER UPDATE OF avatar_id ON bus_entries
WHEN OLD.avatar_id IS NOT NEW.avatar_id
BEGIN
  UPDATE bus_stats SET profile_revision = profile_revision + 1 WHERE id = 1;
END;
