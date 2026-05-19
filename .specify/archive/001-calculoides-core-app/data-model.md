# Data Model: Calculoides

This document defines the database schema and entity relationships for the Calculoides project, serving as the source of truth for the Prisma models.

## Entities

### User
- Represents a registered account holder.
- Primary authentication is managed by Supabase Auth.
- Tracks groups they own and their memberships across different households.

### Group
- The primary container for multi-tenancy.
- Has an owner and a set of members.
- All financial activities (budgets, expenses, goals) are scoped to a Group.

### GroupMember (Join Table: User <-> Group)
- Represents a User's participation in a specific Group.
- Stores the `income` for that user **within that specific group context**.
- Tracks tenure (joinedAt) for automatic ownership succession logic.

### Category
- A budget bucket (e.g., "Rent", "Groceries").
- Scoped to a Group.
- Optionally restricted to a subset of members via `CategoryMember`.

### CategoryMember (Join Table: GroupMember <-> Category)
- Defines which members are responsible for a specific category's budget.
- If no entries exist for a category, it defaults to all group members.

### Expense
- A transaction recorded against a Category.
- Tracks who paid (`payerId`), the amount, and description.
- Can be "archived" into historical records.
- **Constraint**: ID types MUST be consistent with database migrations (e.g., using UUIDs consistently) to prevent null constraint violations (BUG-018).

### Transfer
- A budget quota adjustment between two members within the same category.
- Decreases one member's individual share and increases another's.

### SavingsGoal
- A target financial objective for the group.
- Calculates contributions based on `targetAmount`, `startingAmount`, and `targetDate`.
- Individual member contributions can be overridden via `SavingsGoalContribution`.

### SavingsGoalContribution (Join Table: GroupMember <-> SavingsGoal)
- Stores manual overrides for a specific member's contribution to a savings goal.
- If no entry exists, the contribution is calculated proportionally.

### Invitation
- Tracks pending group invites sent via email.

## Derived Concepts (Non-persistent)

### Budget Quota
- A virtual field calculated at runtime.
- Represents the portion of a category's `monthlyBudget` assigned to a member.
- Calculated as: `(Category Monthly Budget) * (Member Income Share %) + (Sum of Transfers IN) - (Sum of Transfers OUT)`.

## Relationships

- **Many-to-Many**: Users and Groups via `GroupMember`.
- **Many-to-Many**: GroupMembers and Categories via `CategoryMember`.
- **Many-to-Many**: GroupMembers and SavingsGoals via `SavingsGoalContribution`.
- **One-to-Many**: Group to Categories, Expenses, SavingsGoals.
- **One-to-Many**: Category to Expenses, Transfers.

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  name          String?
  ownedGroups   Group[]        @relation("GroupOwner")
  memberships   GroupMember[]
  invitesSent   Invitation[]   @relation("Inviter")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@map("users")
}

model Group {
  id           String         @id @default(uuid())
  name         String
  ownerId      String
  owner        User           @relation("GroupOwner", fields: [ownerId], references: [id])
  members      GroupMember[]
  categories   Category[]
  savingsGoals SavingsGoal[]
  invitations  Invitation[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@map("groups")
}

model GroupMember {
  id               String            @id @default(uuid())
  userId           String
  groupId          String
  user             User              @relation(fields: [userId], references: [id])
  group            Group             @relation(fields: [groupId], references: [id])
  income           Decimal           @default(0) @db.Decimal(12, 2)
  joinedAt         DateTime          @default(now())
  
  paidExpenses     Expense[]
  transfersFrom    Transfer[]        @relation("FromMember")
  transfersTo      Transfer[]        @relation("ToMember")
  categoryLinks    CategoryMember[]
  goalContributions SavingsGoalContribution[]

  @@unique([userId, groupId])
  @@map("group_members")
}

model Category {
  id            String            @id @default(uuid())
  groupId       String
  group         Group             @relation(fields: [groupId], references: [id])
  name          String
  icon          String?           // Emoji icon
  monthlyBudget Decimal           @db.Decimal(12, 2)
  
  expenses      Expense[]
  transfers     Transfer[]
  memberLinks   CategoryMember[]
  
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  @@map("categories")
}

model CategoryMember {
  id          String      @id @default(uuid())
  categoryId  String
  memberId    String
  category    Category    @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  member      GroupMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@unique([categoryId, memberId])
  @@map("category_members")
}

model Expense {
  id          String      @id @default(uuid())
  categoryId  String
  category    Category    @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  payerId     String
  payer       GroupMember @relation(fields: [payerId], references: [id])
  description String
  amount      Decimal     @db.Decimal(12, 2)
  date        DateTime    @default(now())
  isArchived  Boolean     @default(false)
  
  createdAt   DateTime    @default(now())

  @@map("expenses")
}

model Transfer {
  id           String      @id @default(uuid())
  categoryId   String
  category     Category    @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  fromMemberId String
  fromMember   GroupMember @relation("FromMember", fields: [fromMemberId], references: [id])
  toMemberId   String
  toMember     GroupMember @relation("ToMember", fields: [toMemberId], references: [id])
  amount       Decimal     @db.Decimal(12, 2)
  date         DateTime    @default(now())

  @@map("transfers")
}

model SavingsGoal {
  id             String   @id @default(uuid())
  groupId        String
  group          Group    @relation(fields: [groupId], references: [id])
  name           String
  targetAmount   Decimal  @db.Decimal(12, 2)
  startingAmount Decimal  @default(0) @db.Decimal(12, 2)
  targetDate     DateTime
  
  contributions SavingsGoalContribution[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("savings_goals")
}

model SavingsGoalContribution {
  id           String      @id @default(uuid())
  goalId       String
  memberId     String
  goal         SavingsGoal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  member       GroupMember @relation(fields: [memberId], references: [id], onDelete: Cascade)
  customAmount Decimal     @db.Decimal(12, 2)

  @@unique([goalId, memberId])
  @@map("savings_goal_contributions")
}

model Invitation {
  id        String   @id @default(uuid())
  groupId   String
  group     Group    @relation(fields: [groupId], references: [id])
  email     String
  status    InvitationStatus @default(PENDING)
  inviterId String
  inviter   User     @relation("Inviter", fields: [inviterId], references: [id])
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("invitations")
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  DECLINED

  @@map("invitation_status")
}
```
