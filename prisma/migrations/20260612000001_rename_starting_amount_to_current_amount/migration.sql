-- Rename startingAmount to currentAmount on savings_goals table
-- No data migration required — pure column rename
ALTER TABLE calculoides.savings_goals RENAME COLUMN "startingAmount" TO "currentAmount";
