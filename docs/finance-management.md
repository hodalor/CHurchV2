# Finance Management

## Roles
- Individual giving amounts: `Finance Manager`, `Church Accountant`, `Elders`, `Church Administrator`, `System Administrator`, `Superadmin`
- Aggregate-only finance visibility: roles with `view_finance` but without `view_finance_confidential`
- Expense approval:
  - normal threshold: `Finance Manager`, `Church Accountant`, `Church Administrator`, `Elders`
  - above threshold (`FINANCE_EXPENSE_APPROVAL_THRESHOLD`, default `5000`): `Church Administrator`, `Elders`, `System Administrator`, `Superadmin`

## Endpoints
- `GET /api/finance`
  Legacy-compatible transaction list for the existing dashboard shell.
- `GET /api/finance/options`
  Returns funds and finance lookup values.
- `GET /api/finance/overview`
  Current-period totals, trends, snapshots, and recent activity.
- `GET /api/finance/funds`
- `POST /api/finance/funds`
- `PUT /api/finance/funds/:fundId`
- `GET /api/finance/transactions`
- `POST /api/finance/transactions`
- `POST /api/finance/transactions/batch`
- `POST /api/finance/transactions/:transactionId/void`
- `GET /api/finance/pledges`
- `POST /api/finance/pledges`
- `POST /api/finance/pledges/:pledgeId/payments`
- `GET /api/finance/expenses`
- `POST /api/finance/expenses`
- `POST /api/finance/expenses/:expenseId/approve`
- `POST /api/finance/expenses/:expenseId/reject`
- `POST /api/finance/expenses/:expenseId/pay`
- `POST /api/finance/expenses/:expenseId/void`
- `GET /api/finance/budgets`
- `POST /api/finance/budgets`
- `GET /api/finance/reports/:reportType`
  - append `?format=csv` for CSV export

## Accounting rules
- Transactions and expenses are never hard-deleted.
- Voids create a linked reversal entry and mark the original record as `voided`.
- Budget variance is computed server-side via the shared `varianceService`.

## AI Giving Intelligence
- Generation endpoint: `POST /api/ai-assist/suggestions/generate/finance`
- Access follows the same confidential giving rule above.
- Detection is deterministic first; AI phrasing stays advisory-only and pastoral in tone.
