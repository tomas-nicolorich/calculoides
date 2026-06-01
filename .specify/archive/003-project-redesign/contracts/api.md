# API Contracts

## Dashboard Summary
`GET /api/transactions/summary?groupId={groupId}`

### Response
```json
{
  "groupName": "string",
  "totalIncome": 0.00,
  "totalBudget": 0.00,
  "totalSpent": 0.00,
  "members": [
    {
      "id": "uuid",
      "name": "string",
      "income": 0.00,
      "share": 0.00,
      "spent": 0.00,
      "remainingQuota": 0.00
    }
  ],
  "recentExpenses": [
    {
      "id": "uuid",
      "description": "string",
      "amount": 0.00,
      "date": "iso-date",
      "categoryName": "string",
      "payerName": "string"
    }
  ]
}
```

## Expenses List
`GET /api/transactions/expenses-list?groupId={groupId}&categoryId={categoryId}&limit=20&offset=0`

### Response
```json
{
  "expenses": [
    {
      "id": "uuid",
      "categoryId": "uuid",
      "payerId": "uuid",
      "description": "string",
      "amount": 0.00,
      "date": "iso-date"
    }
  ],
  "pagination": {
    "total": 0,
    "limit": 20,
    "offset": 0
  }
}
```

## Categories with Balances
`GET /api/transactions/categories-list?groupId={groupId}`

### Response
```json
[
  {
    "id": "uuid",
    "name": "string",
    "monthlyBudget": 0.00,
    "icon": "string",
    "balances": [
      {
        "memberId": "uuid",
        "quota": 0.00,
        "spent": 0.00,
        "remainingQuota": 0.00
      }
    ]
  }
]
```

## Create Transfer
`POST /api/transactions/transfer-create`

### Request
```json
{
  "categoryId": "uuid",
  "fromMemberId": "uuid",
  "toMemberId": "uuid",
  "amount": 0.00
}
```

## My Groups
`GET /api/groups`

### Response
```json
[
  {
    "id": "uuid",
    "name": "string",
    "role": "OWNER | MEMBER"
  }
]
```
