-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "calculoides";

-- CreateEnum
CREATE TYPE "calculoides"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "calculoides"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculoides"."groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculoides"."group_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "income" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculoides"."categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "groupId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "monthlyBudget" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculoides"."category_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categoryId" UUID NOT NULL,
    "memberId" UUID NOT NULL,

    CONSTRAINT "category_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculoides"."expenses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categoryId" UUID NOT NULL,
    "payerId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedPeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculoides"."transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categoryId" UUID NOT NULL,
    "fromMemberId" UUID NOT NULL,
    "toMemberId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedPeriod" TEXT,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculoides"."savings_goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "groupId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "startingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculoides"."savings_goal_contributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goalId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "customAmount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "savings_goal_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculoides"."settlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "groupId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "totalPaid" DECIMAL(12,2) NOT NULL,
    "totalQuota" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculoides"."invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "groupId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT,
    "status" "calculoides"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "inviterId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "calculoides"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_userId_groupId_key" ON "calculoides"."group_members"("userId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "category_members_categoryId_memberId_key" ON "calculoides"."category_members"("categoryId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "savings_goal_contributions_goalId_memberId_key" ON "calculoides"."savings_goal_contributions"("goalId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_groupId_memberId_periodMonth_key" ON "calculoides"."settlements"("groupId", "memberId", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "calculoides"."invitations"("token");

-- AddForeignKey
ALTER TABLE "calculoides"."groups" ADD CONSTRAINT "groups_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "calculoides"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."group_members" ADD CONSTRAINT "group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "calculoides"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."group_members" ADD CONSTRAINT "group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "calculoides"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."categories" ADD CONSTRAINT "categories_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "calculoides"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."category_members" ADD CONSTRAINT "category_members_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "calculoides"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."category_members" ADD CONSTRAINT "category_members_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "calculoides"."group_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."expenses" ADD CONSTRAINT "expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "calculoides"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."expenses" ADD CONSTRAINT "expenses_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "calculoides"."group_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."transfers" ADD CONSTRAINT "transfers_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "calculoides"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."transfers" ADD CONSTRAINT "transfers_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "calculoides"."category_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."transfers" ADD CONSTRAINT "transfers_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "calculoides"."category_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."savings_goals" ADD CONSTRAINT "savings_goals_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "calculoides"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."savings_goal_contributions" ADD CONSTRAINT "savings_goal_contributions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "calculoides"."savings_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."savings_goal_contributions" ADD CONSTRAINT "savings_goal_contributions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "calculoides"."group_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."settlements" ADD CONSTRAINT "settlements_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "calculoides"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."settlements" ADD CONSTRAINT "settlements_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "calculoides"."group_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."invitations" ADD CONSTRAINT "invitations_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "calculoides"."groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculoides"."invitations" ADD CONSTRAINT "invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "calculoides"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
