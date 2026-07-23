-- Add icon field to savings_goals, mirroring categories.icon (nullable, no DB default)
ALTER TABLE calculoides.savings_goals ADD COLUMN "icon" TEXT;
