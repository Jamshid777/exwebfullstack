from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.balance import Balance
from app.models.currency import Currency
from app.models.transaction import Transaction
from app.schemas.safe import SafeMovement

router = APIRouter(dependencies=[Depends(get_current_user)])


async def _get_currency(db: AsyncSession, code: str) -> Currency:
    res = await db.execute(select(Currency).where(Currency.code == code))
    cur = res.scalar_one_or_none()
    if not cur:
        raise HTTPException(status_code=400, detail=f"Unknown currency code: {code}")
    return cur


async def _get_balance(db: AsyncSession, currency_id: int) -> Balance:
    bal = (await db.execute(select(Balance).where(Balance.currency_id == currency_id))).scalar_one()
    return bal


@router.post("/deposit")
async def deposit(payload: SafeMovement, db: AsyncSession = Depends(get_db)):
    currency = await _get_currency(db, payload.currency_code.upper())
    bal = await _get_balance(db, currency.id)

    async with db.begin():
        bal.amount = float(bal.amount) + float(payload.amount)
        bal.available_amount = float(bal.available_amount) + float(payload.amount)
        tx = Transaction(
            operation_type="deposit",
            currency_id=currency.id,
            amount=payload.amount,
            rate=payload.rate,
            remaining_amount=payload.amount if currency.code == "USDT" else None,
            note=payload.note,
        )
        if currency.code == "USDT" and (payload.rate is None or payload.rate <= 0):
            raise HTTPException(status_code=400, detail="rate is required for USDT deposit for FIFO basis")
        db.add(tx)

    return {"status": "ok"}


@router.post("/withdrawal")
async def withdrawal(payload: SafeMovement, db: AsyncSession = Depends(get_db)):
    currency = await _get_currency(db, payload.currency_code.upper())
    bal = await _get_balance(db, currency.id)

    async with db.begin():
        if float(bal.available_amount) < float(payload.amount):
            raise HTTPException(status_code=400, detail=f"Insufficient {currency.code} balance")
        bal.amount = float(bal.amount) - float(payload.amount)
        bal.available_amount = float(bal.available_amount) - float(payload.amount)
        tx = Transaction(
            operation_type="withdrawal",
            currency_id=currency.id,
            amount=payload.amount,
            rate=payload.rate,
            note=payload.note,
        )
        db.add(tx)

    return {"status": "ok"}
