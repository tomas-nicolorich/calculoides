-- Brings production RLS in line with prisma/rls.sql.
--
-- The live database was missing RLS entirely on "users", "transfers" and
-- "category_members" (never added), and on "settlements" (added to
-- prisma/rls.sql but never actually run against production — rls.sql has
-- no automated deploy step, so it silently drifted from the live schema).
-- All statements are idempotent so this is safe to re-run.

-- users: self, or anyone sharing a group with you (matches
-- GroupService.getGroupsForUser, which joins member user info)
ALTER TABLE "calculoides"."users" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Self and groupmate visibility" ON "calculoides"."users";
CREATE POLICY "Self and groupmate visibility" ON "calculoides"."users"
FOR SELECT USING (
  "id" = auth.uid()
  OR EXISTS (
    SELECT 1 FROM "calculoides"."group_members" AS "gm1"
    JOIN "calculoides"."group_members" AS "gm2" ON "gm1"."groupId" = "gm2"."groupId"
    WHERE "gm1"."userId" = "users"."id"
    AND "gm2"."userId" = auth.uid()
  )
);

-- settlements: re-affirm (present in rls.sql, never applied live)
ALTER TABLE "calculoides"."settlements" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Member settlements" ON "calculoides"."settlements";
CREATE POLICY "Member settlements" ON "calculoides"."settlements"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "calculoides"."group_members"
    WHERE "group_members"."groupId" = "settlements"."groupId"
    AND "group_members"."userId" = auth.uid()
  )
);

-- transfers: same shape as "Member expenses"
ALTER TABLE "calculoides"."transfers" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Member transfers" ON "calculoides"."transfers";
CREATE POLICY "Member transfers" ON "calculoides"."transfers"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "calculoides"."group_members"
    JOIN "calculoides"."categories" ON "categories"."groupId" = "group_members"."groupId"
    WHERE "categories"."id" = "transfers"."categoryId"
    AND "group_members"."userId" = auth.uid()
  )
);

-- category_members: join table gating restricted categories
ALTER TABLE "calculoides"."category_members" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Member category_members" ON "calculoides"."category_members";
CREATE POLICY "Member category_members" ON "calculoides"."category_members"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "calculoides"."group_members"
    JOIN "calculoides"."categories" ON "categories"."groupId" = "group_members"."groupId"
    WHERE "categories"."id" = "category_members"."categoryId"
    AND "group_members"."userId" = auth.uid()
  )
);

-- "Owner update income" is a row-level policy; Postgres RLS can't scope it to
-- a single column. Column-level GRANTs close that gap for the "authenticated"
-- PostgREST role specifically — they have no effect on the app's own
-- connection, which runs as the table owner and always bypasses GRANT/REVOKE
-- and RLS alike.
REVOKE UPDATE ON "calculoides"."group_members" FROM "authenticated";
GRANT UPDATE ("income") ON "calculoides"."group_members" TO "authenticated";
