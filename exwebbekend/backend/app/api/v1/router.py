from fastapi import APIRouter

from app.api.v1.endpoints import auth, currencies, balances, shifts
from app.api.v1.endpoints import expenses, expense_categories, transactions, safe

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(currencies.router, prefix="/currencies", tags=["currencies"])
api_router.include_router(balances.router, prefix="/balances", tags=["balances"])
api_router.include_router(shifts.router, prefix="/shifts", tags=["shifts"])
api_router.include_router(expense_categories.router, prefix="/expense-categories", tags=["expense-categories"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(safe.router, prefix="/safe", tags=["safe"])
