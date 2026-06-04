# Calculoides — Shared Domain

Calculoides is a shared expense and budget management application for household groups, where costs are distributed proportionally based on individual incomes.

This package contains the core domain types, Zod schemas, and financial logic shared between `api/` and `frontend/`.

## Language

### Core Structure

**Group**:
A multi-tenant container for shared budgeting and expense tracking among a specific set of people.
_Avoid_: Household, team, account

**Member**:
A specific **User** within the context of a **Group**, possessing a single defined monthly income for the current period and ownership status. Joining or leaving a group triggers an automatic, group-wide recalculation of all **Budget Quotas** for the current open month (per the **Calculation on Read** pattern).
_Avoid_: Participant, contributor

**User**:
An individual account holder who can belong to multiple **Groups**.
_Avoid_: Account, person

**Owner**:
A single **Member** acting as the "manager" of the **Group**. They possess exclusive administrative permissions to invite/remove members, modify any member's income or **Savings Goal** contribution, initiate **Transfers** between any members, and trigger an **Archive**. This role assumes a high-trust environment where the Owner facilitates the group's organization and corrects data entry errors.
_Avoid_: Admin, creator, manager

**Invitation**:
A secure, email-dispatched link that allows a **User** to join a **Group** as a new **Member**.
_Avoid_: Invite, request, join link

**Tenure**:
The length of time a **Member** has been part of a **Group**, determined by their `joinedAt` timestamp and used to determine the next **Owner** if the current one leaves.

### Financial Logic

**Income Percentage**:
A member's proportional share of the **Group**'s total combined income, used to distribute budget responsibilities.
_Avoid_: Share, split ratio

**Budget Category**:
A named classification for planned spending (e.g., Rent, Groceries) with a total monthly target amount and an optional **Member Subset**.
_Avoid_: Budget, bucket, fund

**Member Subset**:
A selection of specific **Members** within a **Budget Category** who are exclusively responsible for its total budget.
_Avoid_: Group, restricted list

**Budget Quota**:
The specific portion of a **Budget Category**'s total amount that a **Member** is responsible for. This is calculated proportionally based on their **Income Percentage** relative to the other members responsible for that category (i.e., using a weighted relative split if a **Member Subset** is active).
_Avoid_: Share, portion

**Expense**:
A recorded transaction of actual spending tied to a **Budget Category**.
_Avoid_: Payment, transaction, bill

**Transfer**:
A redistribution of **Budget Quota** from a transferer to a receiver within the same **Budget Category** for a specific period. It is a one-time adjustment reflecting a physical cash movement (e.g., B gives A €50 for groceries) and does not persist across an **Archive** boundary; in the next period, quotas reset to their default income-proportional shares.
_Avoid_: Adjustment, quota move

**Savings Goal**:
A multi-month persistent target amount to be saved by a specific date. Unlike **Budget Categories**, which reset each period, Savings Goals maintain a running balance until the target is reached. Monthly **Contributions** are distributed among **Members** by their **Income Percentage**.
_Avoid_: Goal, fund, pot

**Contribution**:
The monthly amount a **Member** saves toward a **Savings Goal**. By default, this is proportional to the member's **Income Percentage**. A manual override by one member does not change the contributions of others; instead, it updates the **Projected Date** based on the new total monthly group saving.
_Avoid_: Allocation, payment

**Starting Amount**:
An initial sum of money already saved toward a **Savings Goal** at the time of its creation, reducing the remaining amount needed to reach the target.

**Target Date**:
The user-defined date by which a **Savings Goal** is intended to be fully funded.
_Avoid_: Due date, deadline

**Projected Date**:
The computed date by which a **Savings Goal** will actually be reached, given the current total of all members' **Contributions**. May be earlier or later than the **Target Date**. Stored on the server after save; mirrored in the browser during live editing.
_Avoid_: Estimated date, completion date, forecast date

**Archive**:
A group-wide, manual event triggered by the **Owner** (typically after physical settlement) that moves all expenses for a selected month to an immutable historical record and resets all **Budget Category** spent balances to zero. Once archived, the record cannot be modified.
_Avoid_: Reset, settlement, clearing

**Settlement**:
The final calculated net balance per **Member** for a given period (calculated as total amount paid minus **Budget Quota** responsibility), preserved in the historical record after an **Archive**. A positive settlement indicates a surplus (the member is owed), while a negative settlement indicates a deficit (the member owes).

## Example Dialogue

**Developer**: I'm working on the new dashboard. When a member logs an expense, should I update their remaining budget quota immediately?

**Domain Expert**: Yes, but remember that the quota itself doesn't change when they spend; only their remaining balance does. The **Budget Quota** is their responsibility for that category based on their **Income Percentage**.

**Developer**: Got it. And what if another member wants to help them out?

**Domain Expert**: Then they perform a **Transfer**. This actually moves the **Budget Quota** responsibility from the transferer to the receiver. The person who received the transfer now has more "room" to spend in that category, while the transferer has taken on more of the cost.

**Developer**: And when the month ends?

**Domain Expert**: The **Owner** triggers an **Archive**. We move all those **Expenses** to history, calculate the final **Settlement**, and reset the spent balances so everyone starts fresh for the next period.
