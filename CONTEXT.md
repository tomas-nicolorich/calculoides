# Calculoides

Calculoides is a shared expense and budget management application for household groups, where costs are distributed proportionally based on individual incomes.

## Language

### Core Structure

**Group**:
A multi-tenant container for shared budgeting and expense tracking among a specific set of people.
_Avoid_: Household, team, account

**Member**:
A specific **User** within the context of a **Group**, possessing a defined monthly income and ownership status.
_Avoid_: Participant, contributor
**User**:
An individual account holder who can belong to multiple **Groups**.
_Avoid_: Account, person

**Owner**:
A single **Member** with exclusive administrative permissions to invite/remove members, modify incomes, transfer any **Budget Quota**, and trigger an **Archive**.
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
The specific portion of a **Budget Category**'s total amount that a **Member** is responsible for, calculated based on their **Income Percentage** (or subset income).
_Avoid_: Share, portion

**Expense**:
A recorded transaction of actual spending tied to a **Budget Category**.
_Avoid_: Payment, transaction, bill

**Transfer**:
A redistribution of **Budget Quota** from a transferer to a receiver within the same **Budget Category**, where the transferer's responsibility decreases and the receiver's responsibility increases.
_Avoid_: Adjustment, quota move

**Savings Goal**:
A target amount to be saved by a specific date, with monthly **Contributions** distributed among **Members** by their **Income Percentage**.
_Avoid_: Goal, fund, pot

**Contribution**:
The monthly amount a **Member** saves toward a **Savings Goal**. By default, this is calculated proportionally, but it can be manually overridden, which updates the goal's projected completion date.

**Starting Amount**:
An initial sum of money already saved toward a **Savings Goal** at the time of its creation, reducing the remaining amount needed to reach the target.

**Archive**:
A group-wide event triggered by the **Owner** that moves all current **Expenses** to a historical record and resets all **Budget Category** spent balances to zero.
_Avoid_: Reset, settlement, clearing

**Settlement**:
The final calculated amount per **Member** for a given period, preserved in the historical record after an **Archive**.

## Example Dialogue

**Developer**: I'm working on the new dashboard. When a member logs an expense, should I update their remaining budget quota immediately?

**Domain Expert**: Yes, but remember that the quota itself doesn't change when they spend; only their remaining balance does. The **Budget Quota** is their responsibility for that category based on their **Income Percentage**.

**Developer**: Got it. And what if another member wants to help them out?

**Domain Expert**: Then they perform a **Transfer**. This actually moves the **Budget Quota** responsibility from the transferer to the receiver. The person who received the transfer now has more "room" to spend in that category, while the transferer has taken on more of the cost.

**Developer**: And when the month ends?

**Domain Expert**: The **Owner** triggers an **Archive**. We move all those **Expenses** to history, calculate the final **Settlement**, and reset the spent balances so everyone starts fresh for the next period.

### Patterns

**Calculation on Read**:
The strategy of calculating financial balances and shares dynamically at the time of retrieval to ensure retroactive correctness after income changes.

**Remainder Absorption**:
A strategy for handling rounding discrepancies in proportional shares by assigning the 0.01 difference to the **Member** with the highest **Income Percentage**.
