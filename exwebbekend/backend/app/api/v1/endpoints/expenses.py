from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.balance import Balance
from app.models.currency import Currency
from app.models.expense import Expense
from app.models.shift import Shift
from app.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate

router = APIRouter(dependencies=[Depends(get_current_user)])


async def _get_active_shift(db: AsyncSession) -> Shift | None:
    res = await db.execute(select(Shift).where(Shift.end_time.is_(None)).order_by(Shift.start_time.desc()))
    return res.scalar_one_or_none()


async def _get_currency_id(db: AsyncSession, code: str) -> int:
    res = await db.execute(select(Currency).where(Currency.code == code))
    cur = res.scalar_one_or_none()
    if not cur:
        raise HTTPException(status_code=400, detail=f"Unknown currency code: {code}")
    return cur.id


@router.post("/", response_model=ExpenseOut)
async def create_expense(payload: ExpenseCreate, db: AsyncSession = Depends(get_db)):
    shift = await _get_active_shift(db)
    if not shift:
        raise HTTPException(status_code=400, detail="No active shift")

    currency_code = payload.currency.upper()
    if currency_code not in ("USD", "UZS"):
        raise HTTPException(status_code=400, detail="Expense currency must be USD or UZS")

    if currency_code == "UZS" and (payload.uzs_rate is None or payload.uzs_rate <= 0):
        raise HTTPException(status_code=400, detail="uzs_rate is required for UZS expenses")
    amount_usd = float(payload.amount) if currency_code == "USD" else (float(payload.amount) / float(payload.uzs_rate))

    # Determine which balance to deduct
    res = await db.execute(select(Currency).where(Currency.code == currency_code))
    cur = res.scalar_one()
    bal = (await db.execute(select(Balance).where(Balance.currency_id == cur.id))).scalar_one()

    # Atomic operation
    async with db.begin():
        # Ensure sufficient balance
        if float(bal.available_amount) < float(payload.amount):
            raise HTTPException(status_code=400, detail=f"Insufficient {currency_code} balance")
        # Deduct
        bal.amount = float(bal.amount) - float(payload.amount)
        bal.available_amount = float(bal.available_amount) - float(payload.amount)
        # Create expense
        exp = Expense(
            shift_id=shift.id,
            category_id=payload.category_id,
            amount=payload.amount,
            currency=currency_code,
            amount_usd=amount_usd,
            uzs_rate=payload.uzs_rate,
            note=payload.note,
        )
        db.add(exp)
    await db.refresh(exp)
    return ExpenseOut(
        id=exp.id,
        shift_id=exp.shift_id,
        category_id=exp.category_id,
        amount=float(exp.amount),
        currency=exp.currency,
        amount_usd=float(exp.amount_usd),
        uzs_rate=float(exp.uzs_rate) if exp.uzs_rate is not None else None,
        note=exp.note,
    )


@router.put("/{expense_id}", response_model=ExpenseOut)
async def update_expense(expense_id: int, payload: ExpenseUpdate, db: AsyncSession = Depends(get_db)):
    shift = await _get_active_shift(db)
    if not shift:
        raise HTTPException(status_code=400, detail="No active shift")

    exp = (await db.execute(select(Expense).where(Expense.id == expense_id))).scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Reverse old expense on corresponding balance
    old_currency = exp.currency
    new_currency = payload.currency.upper()
    if new_currency not in ("USD", "UZS"):
        raise HTTPException(status_code=400, detail="Expense currency must be USD or UZS")

    if new_currency == "UZS" and (payload.uzs_rate is None or payload.uzs_rate <= 0):
        raise HTTPException(status_code=400, detail="uzs_rate is required for UZS expenses")

    new_amount_usd = float(payload.amount) if new_currency == "USD" else (float(payload.amount) / float(payload.uzs_rate))

    res_old = await db.execute(select(Currency).where(Currency.code == old_currency))
    cur_old = res_old.scalar_one()
    bal_old = (await db.execute(select(Balance).where(Balance.currency_id == cur_old.id))).scalar_one()

    res_new = await db.execute(select(Currency).where(Currency.code == new_currency))
    cur_new = res_new.scalar_one()
    bal_new = (await db.execute(select(Balance).where(Balance.currency_id == cur_new.id))).scalar_one()

    async with db.begin():
        # Refund old amount
        bal_old.amount = float(bal_old.amount) + float(exp.amount)
        bal_old.available_amount = float(bal_old.available_amount) + float(exp.amount)
        # Deduct new amount with sufficiency check
        if float(bal_new.available_amount) < float(payload.amount):
            raise HTTPException(status_code=400, detail=f"Insufficient {new_currency} balance")
        bal_new.amount = float(bal_new.amount) - float(payload.amount)
        bal_new.available_amount = float(bal_new.available_amount) - float(payload.amount)

        # Update expense
        exp.category_id = payload.category_id
        exp.amount = payload.amount
        exp.currency = new_currency
        exp.amount_usd = new_amount_usd
        exp.uzs_rate = payload.uzs_rate
        exp.note = payload.note
        db.add(exp)

    await db.refresh(exp)
    return ExpenseOut(
        id=exp.id,
        shift_id=exp.shift_id,
        category_id=exp.category_id,
        amount=float(exp.amount),
        currency=exp.currency,
        amount_usd=float(exp.amount_usd),
        uzs_rate=float(exp.uzs_rate) if exp.uzs_rate is not None else None,
        note=exp.note,
    )


@router.get("/", response_model=List[ExpenseOut])
@router.get("", response_model=List[ExpenseOut])
async def list_expenses(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Expense).order_by(Expense.created_at.desc()))
    items = res.scalars().all()
    out: List[ExpenseOut] = []
    for e in items:
        out.append(
            ExpenseOut(
                id=e.id,
                shift_id=e.shift_id,
                category_id=e.category_id,
                amount=float(e.amount),
                currency=e.currency,
                amount_usd=float(e.amount_usd),
                uzs_rate=float(e.uzs_rate) if e.uzs_rate is not None else None,
                note=e.note,
            )
        )
    return out
