from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.balance import Balance
from app.models.currency import Currency
from app.models.expense import Expense
from app.models.shift import Shift
from app.models.transaction import Transaction
from app.schemas.shift import ShiftOut

router = APIRouter(dependencies=[Depends(get_current_user)])


async def _get_active_shift(db: AsyncSession) -> Optional[Shift]:
    res = await db.execute(select(Shift).where(Shift.end_time.is_(None)).order_by(Shift.start_time.desc()))
    return res.scalar_one_or_none()


@router.get("/", response_model=List[ShiftOut])
async def list_shifts(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Shift).order_by(Shift.start_time.desc()))
    items = res.scalars().all()
    return [ShiftOut.model_validate(i) for i in items]


@router.get("/active", response_model=Optional[ShiftOut])
async def get_active_shift(db: AsyncSession = Depends(get_db)):
    shift = await _get_active_shift(db)
    return ShiftOut.model_validate(shift) if shift else None


@router.post("/start", response_model=ShiftOut)
async def start_shift(db: AsyncSession = Depends(get_db)):
    # Check existing active shift
    if await _get_active_shift(db):
        raise HTTPException(status_code=400, detail="Active shift already exists")

    # Snapshot current balances by currency code
    res = await db.execute(select(Balance))
    balances = res.scalars().all()
    snapshot: Dict[str, float] = {}
    for b in balances:
        cur = (await db.execute(select(Currency).where(Currency.id == b.currency_id))).scalar_one()
        snapshot[cur.code] = float(b.amount)

    shift = Shift(starting_balances=snapshot)
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return ShiftOut.model_validate(shift)


@router.post("/end", response_model=ShiftOut)
async def end_shift(db: AsyncSession = Depends(get_db)):
    shift = await _get_active_shift(db)
    if not shift:
        raise HTTPException(status_code=400, detail="No active shift to end")

    # Compute profits and expenses within this shift
    # gross_profit = sum of profit for 'sell' operations in this shift
    res = await db.execute(
        select(func.coalesce(func.sum(Transaction.profit), 0)).where(
            Transaction.shift_id == shift.id,
            Transaction.operation_type == "sell",
        )
    )
    gross_profit = float(res.scalar_one())

    # total_expenses = sum of amount_usd in expenses for this shift
    res = await db.execute(
        select(func.coalesce(func.sum(Expense.amount_usd), 0)).where(Expense.shift_id == shift.id)
    )
    total_expenses = float(res.scalar_one())

    net_profit = gross_profit - total_expenses

    # Snapshot ending balances
    res = await db.execute(select(Balance))
    balances = res.scalars().all()
    ending_snapshot: Dict[str, float] = {}
    for b in balances:
        cur = (await db.execute(select(Currency).where(Currency.id == b.currency_id))).scalar_one()
        ending_snapshot[cur.code] = float(b.amount)

    shift.ending_balances = ending_snapshot
    shift.gross_profit = gross_profit
    shift.total_expenses = total_expenses
    shift.net_profit = net_profit
    shift.end_time = datetime.now(timezone.utc)
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return ShiftOut.model_validate(shift)
