-- Ability roster reset (2026-07-28)
--
-- Clears the retired ability roster so the app can re-seed the replacement on
-- next boot. The original six (ember-cleave, aegis-ward, thornbite,
-- soul-drain, radiant-ward, ruinous-zenith) were authored before the combat
-- reducer implemented most effect types, so several of them did nothing in
-- battle at all.
--
-- ORDER IS NOT COSMETIC. `card_ability_references.ability_id` is
-- ON DELETE RESTRICT, so any card that has ever been forged or backfilled
-- holds a row that will BLOCK deleting the definitions. References must go
-- first. Everything else cascades from ability_definitions:
--
--   ability_versions          ON DELETE CASCADE
--   canonical_art_assets      ON DELETE CASCADE
--   player_ability_discoveries ON DELETE CASCADE
--
-- The RESTRICT is correct and stays — we order around it rather than
-- weakening a constraint that exists to stop exactly this kind of orphaning.
--
-- Cards themselves are UNTOUCHED. Art, lore, stats and identity all survive;
-- only the ability loadout is rebuilt, by `rosterAssigner` on next load.
--
-- Discovery history is deliberately cleared (approved by Raheem 2026-07-28).
-- Those rows point at abilities that no longer exist, so they would be
-- meaningless; rewards already paid stay in the wallet, only the history goes.
--
-- `ability_families` is NOT deleted. The eight families are unchanged and are
-- re-upserted idempotently by seedAbilityLibrary.

BEGIN;

-- Must be first: RESTRICT blocks the definition delete while these exist.
DELETE FROM card_ability_references;

-- Cascades from ability_definitions anyway; explicit so the intent is on the
-- record rather than implied by a constraint somewhere else.
DELETE FROM player_ability_discoveries;

-- Cascades: ability_versions, canonical_art_assets.
DELETE FROM ability_definitions;

COMMIT;
