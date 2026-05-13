-- Enable Row Level Security
ALTER TABLE "calculoides"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculoides"."groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculoides"."group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculoides"."categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculoides"."category_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculoides"."expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculoides"."transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculoides"."savings_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculoides"."savings_goal_contributions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calculoides"."invitations" ENABLE ROW LEVEL SECURITY;

-- Helper Functions for Performant RLS
-- Using SECURITY DEFINER to bypass RLS when checking membership
CREATE OR REPLACE FUNCTION calculoides.get_user_groups()
RETURNS setof uuid AS $$
  SELECT "groupId" FROM calculoides.group_members WHERE "userId" = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculoides.is_group_owner(g_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM calculoides.groups 
    WHERE id = g_id AND "ownerId" = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Users Policies
CREATE POLICY "Users can view own profile" ON "calculoides"."users"
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON "calculoides"."users"
  FOR UPDATE USING (auth.uid() = id);

-- 2. Groups Policies
CREATE POLICY "Members can view groups" ON "calculoides"."groups"
  FOR SELECT USING (id IN (SELECT calculoides.get_user_groups()) OR "ownerId" = auth.uid());

CREATE POLICY "Owners can manage groups" ON "calculoides"."groups"
  FOR ALL USING ("ownerId" = auth.uid());

CREATE POLICY "Authenticated can create groups" ON "calculoides"."groups"
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Group Members Policies
CREATE POLICY "Members can view group members" ON "calculoides"."group_members"
  FOR SELECT USING ("groupId" IN (SELECT calculoides.get_user_groups()));

CREATE POLICY "Owners can manage group members" ON "calculoides"."group_members"
  FOR ALL USING (calculoides.is_group_owner("groupId"));

-- 4. Categories Policies
CREATE POLICY "Members can view categories" ON "calculoides"."categories"
  FOR SELECT USING ("groupId" IN (SELECT calculoides.get_user_groups()));

CREATE POLICY "Owners can manage categories" ON "calculoides"."categories"
  FOR ALL USING (calculoides.is_group_owner("groupId"));

-- 5. Category Members Policies
CREATE POLICY "Members can view category member links" ON "calculoides"."category_members"
  FOR SELECT USING (
    "categoryId" IN (SELECT id FROM calculoides.categories WHERE "groupId" IN (SELECT calculoides.get_user_groups()))
  );

-- 6. Expenses Policies
CREATE POLICY "Members can view expenses" ON "calculoides"."expenses"
  FOR SELECT USING (
    "categoryId" IN (SELECT id FROM calculoides.categories WHERE "groupId" IN (SELECT calculoides.get_user_groups()))
  );

CREATE POLICY "Members can create expenses" ON "calculoides"."expenses"
  FOR INSERT WITH CHECK (
    "categoryId" IN (SELECT id FROM calculoides.categories WHERE "groupId" IN (SELECT calculoides.get_user_groups()))
  );

CREATE POLICY "Payer or Owner can manage expenses" ON "calculoides"."expenses"
  FOR ALL USING (
    "payerId" IN (SELECT id FROM calculoides.group_members WHERE "userId" = auth.uid()) OR
    "categoryId" IN (SELECT id FROM calculoides.categories WHERE calculoides.is_group_owner("groupId"))
  );

-- 7. Transfers Policies
CREATE POLICY "Members can view transfers" ON "calculoides"."transfers"
  FOR SELECT USING (
    "categoryId" IN (SELECT id FROM calculoides.categories WHERE "groupId" IN (SELECT calculoides.get_user_groups()))
  );

-- 8. Savings Goals Policies
CREATE POLICY "Members can view savings goals" ON "calculoides"."savings_goals"
  FOR SELECT USING ("groupId" IN (SELECT calculoides.get_user_groups()));

-- 9. Savings Goal Contributions Policies
CREATE POLICY "Members can view contributions" ON "calculoides"."savings_goal_contributions"
  FOR SELECT USING (
    "goalId" IN (SELECT id FROM calculoides.savings_goals WHERE "groupId" IN (SELECT calculoides.get_user_groups()))
  );

-- 10. Invitations Policies
CREATE POLICY "Involved parties can view invitations" ON "calculoides"."invitations"
  FOR SELECT USING (
    "groupId" IN (SELECT calculoides.get_user_groups()) OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    "inviterId" = auth.uid()
  );

CREATE POLICY "Owners can manage invitations" ON "calculoides"."invitations"
  FOR ALL USING (calculoides.is_group_owner("groupId"));
