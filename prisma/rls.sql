-- Enable RLS
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "savings_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "savings_goal_contributions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Member select" ON "groups";
DROP POLICY IF EXISTS "Member group visibility" ON "group_members";
DROP POLICY IF EXISTS "Owner update income" ON "group_members";
DROP POLICY IF EXISTS "Member categories" ON "categories";
DROP POLICY IF EXISTS "Member expenses" ON "expenses";
DROP POLICY IF EXISTS "Member savings goals" ON "savings_goals";
DROP POLICY IF EXISTS "Member contributions" ON "savings_goal_contributions";
DROP POLICY IF EXISTS "Inviter/Invitee invitations" ON "invitations";

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
