# ExWeb Backend (FastAPI + PostgreSQL)

This backend implements the PRD for "Valyuta Ayirboshlash ExWeb" with FastAPI, async SQLAlchemy (asyncpg), JWT auth, and Docker.

## Stack
- FastAPI
- PostgreSQL
- SQLAlchemy (async) + asyncpg
- JWT (python-jose), passlib[bcrypt]
- Docker + docker-compose

## Project layout
```
backend/
  Dockerfile
  requirements.txt
  .env
  app/
    main.py
    core/
      config.py
      jwt.py
      security.py
    db/
      session.py
      init_db.py
    models/
      user.py
      currency.py
      balance.py
      shift.py
      transaction.py
      expense.py
      expense_category.py
    schemas/
      *.py
    api/
      deps.py
      v1/
        router.py
        endpoints/
          auth.py
          currencies.py
          balances.py
          shifts.py
          expenses.py
          expense_categories.py
          transactions.py
          safe.py
```

## Configuration
Backend environment variables are defined in `backend/.env`.

Important defaults:
- DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/exweb
- JWT_SECRET=change_me_please
- JWT_ALGORITHM=HS256
- ACCESS_TOKEN_EXPIRE_MINUTES=60
- ADMIN_USERNAME=admin
- ADMIN_PASSWORD=admin

On startup the app will:
- Create tables (no Alembic yet; uses `create_all`).
- Seed admin user and currencies (USD, UZS, USDT) and balances for each.

## Run with Docker
From the repository root (where `docker-compose.yml` is):

```bash
# Build and start (detached)
docker compose up --build -d

# Follow logs
docker compose logs -f backend
```

- API: http://localhost:8001
- OpenAPI docs: http://localhost:8001/docs

## Auth
Use OAuth2 Password Grant to obtain a JWT.

Request:
- POST `/api/v1/auth/login`
- Content-Type: application/x-www-form-urlencoded
- Body fields: `username`, `password`

Seed credentials (change in .env):
- username: `admin`
- password: `admin`

Use `Authorization: Bearer <token>` for all subsequent requests.

## Endpoints overview
- Auth
  - POST `/api/v1/auth/login`
  - GET `/api/v1/auth/me`
- Currencies
  - GET `/api/v1/currencies`
- Balances
  - GET `/api/v1/balances`
- Shifts
  - GET `/api/v1/shifts`
  - GET `/api/v1/shifts/active`
  - POST `/api/v1/shifts/start`
  - POST `/api/v1/shifts/end`
- Expense Categories
  - POST `/api/v1/expense-categories`
  - GET `/api/v1/expense-categories`
- Expenses
  - POST `/api/v1/expenses`
  - PUT `/api/v1/expenses/{id}`
  - GET `/api/v1/expenses`
- Transactions
  - POST `/api/v1/transactions` (buy/sell with payment modes USD/UZS/MIX; USDT sell uses FIFO for profit)
  - GET `/api/v1/transactions`
- Safe (Capital movements)
  - POST `/api/v1/safe/deposit` (USDT deposit requires `rate` for FIFO cost basis)
  - POST `/api/v1/safe/withdrawal`

## Notes on business logic
- All write operations occur atomically within a DB transaction.
- Expenses require an active shift and adjust the corresponding USD/UZS balances.
- Transactions require an active shift and adjust respective balances based on payment currency.
- USDT FIFO:
  - USDT `buy` and `deposit` create or increase FIFO lots via `remaining_amount`.
  - USDT `sell` consumes lots oldest-first to compute total cost and `profit`.
- Shift end calculates:
  - gross_profit = sum of `profit` for `sell` transactions within shift
  - total_expenses = sum of `amount_usd` in `expenses` within shift
  - net_profit = gross_profit - total_expenses

## TODO / Next steps
- Add Alembic migrations.
- Add detailed validation (e.g., MIX payment consistency).
- Add pagination and filters for list endpoints.
- Add tests.
