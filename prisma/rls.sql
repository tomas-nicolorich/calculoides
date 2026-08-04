-- Enable RLS
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "category_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "savings_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "savings_goal_contributions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Member select" ON "groups";
DROP POLICY IF EXISTS "Member group visibility" ON "group_members";
DROP POLICY IF EXISTS "Owner update income" ON "group_members";
DROP POLICY IF EXISTS "Member categories" ON "categories";
DROP POLICY IF EXISTS "Member category_members" ON "category_members";
DROP POLICY IF EXISTS "Member expenses" ON "expenses";
DROP POLICY IF EXISTS "Member transfers" ON "transfers";
DROP POLICY IF EXISTS "Member savings goals" ON "savings_goals";
DROP POLICY IF EXISTS "Member contributions" ON "savings_goal_contributions";
DROP POLICY IF EXISTS "Inviter/Invitee invitations" ON "invitations";
DROP POLICY IF EXISTS "Self and groupmate visibility" ON "users";

-- Group access: users can only see groups they belong to
CREATE POLICY "Member select" ON "groups"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "group_members"
    WHERE "group_members"."groupId" = "groups"."id"
    AND "group_members"."userId" = auth.uid()
  )
);

-- Member access: users can only see members of groups they belong to
CREATE POLICY "Member group visibility" ON "group_members"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "group_members" AS "m"
    WHERE "m"."groupId" = "group_members"."groupId"
    AND "m"."userId" = auth.uid()
  )
);

-- Owner update income: Group owners can update income for any member in their group
CREATE POLICY "Owner update income" ON "group_members"
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM "groups"
    WHERE "groups"."id" = "group_members"."groupId"
    AND "groups"."ownerId" = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM "groups"
    WHERE "groups"."id" = "group_members"."groupId"
    AND "groups"."ownerId" = auth.uid()
  )
);

-- Category access: users can see categories of groups they belong to
CREATE POLICY "Member categories" ON "categories"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "group_members"
    WHERE "group_members"."groupId" = "categories"."groupId"
    AND "group_members"."userId" = auth.uid()
  )
);

-- Expense access: users can see expenses of groups they belong to
CREATE POLICY "Member expenses" ON "expenses"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "group_members"
    JOIN "categories" ON "categories"."groupId" = "group_members"."groupId"
    WHERE "categories"."id" = "expenses"."categoryId"
    AND "group_members"."userId" = auth.uid()
  )
);

-- Savings Goal access
CREATE POLICY "Member savings goals" ON "savings_goals"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "group_members"
    WHERE "group_members"."groupId" = "savings_goals"."groupId"
    AND "group_members"."userId" = auth.uid()
  )
);

-- Contributions access
CREATE POLICY "Member contributions" ON "savings_goal_contributions"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "group_members"
    WHERE "group_members"."id" = "savings_goal_contributions"."memberId"
    AND "group_members"."userId" = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM "group_members"
    JOIN "savings_goals" ON "savings_goals"."id" = "savings_goal_contributions"."goalId"
    WHERE "savings_goals"."groupId" = "group_members"."groupId"
    AND "group_members"."userId" = auth.uid()
  )
);

-- Settlement access: group members can read their group's settlements
ALTER TABLE "settlements" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Member settlements" ON "settlements";
CREATE POLICY "Member settlements" ON "settlements"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "group_members"
    WHERE "group_members"."groupId" = "settlements"."groupId"
    AND "group_members"."userId" = auth.uid()
  )
);

-- Invitation access: inviter or user with same email
CREATE POLICY "Inviter/Invitee invitations" ON "invitations"
FOR SELECT USING (
  "inviterId" = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM "users"
    WHERE "users"."id" = auth.uid()
    AND "users"."email" = "invitations"."email"
  )
);

-- User access: yourself, or anyone who shares a group with you (matches
-- GroupService.getGroupsForUser, which joins member user info)
CREATE POLICY "Self and groupmate visibility" ON "users"
FOR SELECT USING (
  "id" = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM "group_members" AS "gm1"
    JOIN "group_members" AS "gm2" ON "gm1"."groupId" = "gm2"."groupId"
    WHERE "gm1"."userId" = "users"."id"
    AND "gm2"."userId" = auth.uid()
  )
);

-- Transfer access: same scoping as expenses (via category -> group)
CREATE POLICY "Member transfers" ON "transfers"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "group_members"
    JOIN "categories" ON "categories"."groupId" = "group_members"."groupId"
    WHERE "categories"."id" = "transfers"."categoryId"
    AND "group_members"."userId" = auth.uid()
  )
);

-- Category-member link access: gates which members a restricted category is visible to
CREATE POLICY "Member category_members" ON "category_members"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "group_members"
    JOIN "categories" ON "categories"."groupId" = "group_members"."groupId"
    WHERE "categories"."id" = "category_members"."categoryId"
    AND "group_members"."userId" = auth.uid()
  )
);

-- "Owner update income" above is a row-level policy; Postgres RLS can't scope
-- it to a single column. Column-level GRANTs close that gap for the
-- "authenticated" PostgREST role specifically — they have no effect on the
-- app's own connection, which runs as the table owner and always bypasses
-- GRANT/REVOKE and RLS alike.
REVOKE UPDATE ON "group_members" FROM "authenticated";
GRANT UPDATE ("income") ON "group_members" TO "authenticated";
