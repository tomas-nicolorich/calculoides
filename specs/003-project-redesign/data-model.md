# Data Model: Project Redesign

## Entities

### User
- `id`: UUID (Primary Key)
- `email`: String (Unique)
- `name`: String (Nullable)
- `createdAt`: DateTime
- `updatedAt`: DateTime
- **Relationships**:
  - `memberships`: List of `GroupMember`
  - `ownedGroups`: List of `Group`

### Group
- `id`: UUID (Primary Key)
- `name`: String
- `ownerId`: UUID (Foreign Key to `User`)
- `createdAt`: DateTime
- `updatedAt`: DateTime
- **Relationships**:
  - `members`: List of `GroupMember`
  - `categories`: List of `Category`
  - `savingsGoals`: List of `SavingsGoal`

### GroupMember
- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key to `User`)
- `groupId`: UUID (Foreign Key to `Group`)
- `income`: Decimal (Precision 12, Scale 2)
- **Relationships**:
  - `paidExpenses`: List of `Expense`
  - `categoryLinks`: List of `CategoryMember`

### Category
- `id`: UUID (Primary Key)
- `groupId`: UUID (Foreign Key to `Group`)
- `name`: String
- `monthlyBudget`: Decimal (Precision 12, Scale 2)
- **Relationships**:
  - `expenses`: List of `Expense`
  - `transfers`: List of `Transfer`
  - `memberLinks`: List of `CategoryMember`

### CategoryMember
- `id`: UUID (Primary Key)
- `categoryId`: UUID (Foreign Key to `Category`)
- `memberId`: UUID (Foreign Key to `GroupMember`)
- **Relationships**:
  - `transfersFrom`: List of `Transfer` (as sender)
  - `transfersTo`: List of `Transfer` (as receiver)

### Expense
- `id`: UUID (Primary Key)
- `categoryId`: UUID (Foreign Key to `Category`)
- `payerId`: UUID (Foreign Key to `GroupMember`)
- `description`: String
- `amount`: Decimal (Precision 12, Scale 2)
- `date`: DateTime

### Transfer
- `id`: UUID (Primary Key)
- `categoryId`: UUID (Foreign Key to `Category`)
- `fromMemberId`: UUID (Foreign Key to `CategoryMember`)
- `toMemberId`: UUID (Foreign Key to `CategoryMember`)
- `amount`: Decimal (Precision 12, Scale 2)
- `date`: DateTime

## Validation Rules
- **Income**: Must be a positive decimal.
- **Budget Quota**: Sum of quotas for a member across all categories must not exceed their income (soft warning in UI, hard limit in some contexts).
- **Transfer Amount**: Must be positive and not exceed the sender's available balance in that category.
- **Expense Amount**: Must be positive.

## State Transitions
- **Expense**: Created -> (Optional) Archived.
- **Group Invitation**: Pending -> Accepted | Declined.
