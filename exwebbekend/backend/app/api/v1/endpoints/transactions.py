from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.balance import Balance
from app.models.currency import Currency
from app.models.shift import Shift
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionOut

router = APIRouter(dependencies=[Depends(get_current_user)])


async def _get_active_shift(db: AsyncSession) -> Optional[Shift]:
    res = await db.execute(select(Shift).where(Shift.end_time.is_(None)).order_by(Shift.start_time.desc()))
    return res.scalar_one_or_none()


async def _get_currency(db: AsyncSession, code: str) -> Currency:
    res = await db.execute(select(Currency).where(Currency.code == code))
    cur = res.scalar_one_or_none()
    if not cur:
        raise HTTPException(status_code=400, detail=f"Unknown currency code: {code}")
    return cur


async def _get_balance(db: AsyncSession, currency_id: int) -> Balance:
    bal = (await db.execute(select(Balance).where(Balance.currency_id == currency_id))).scalar_one()
    return bal


@router.post("/", response_model=TransactionOut)
async def create_transaction(payload: TransactionCreate, db: AsyncSession = Depends(get_db)):
    shift = await _get_active_shift(db)
    if not shift:
        raise HTTPException(status_code=400, detail="No active shift")

    currency = await _get_currency(db, payload.currency_code.upper())
    total_amount_usd = float(payload.amount) * float(payload.rate)

    # Calculate paid amounts depending on payment currency
    paid_usd = 0.0
    paid_uzs = 0.0
    if payload.payment_currency == "USD":
        paid_usd = total_amount_usd
    elif payload.payment_currency == "UZS":
        if not payload.uzs_rate or payload.uzs_rate <= 0:
            raise HTTPException(status_code=400, detail="uzs_rate required for UZS payments")
        paid_uzs = total_amount_usd * float(payload.uzs_rate)
    elif payload.payment_currency == "MIX":
        if payload.paid_amount_usd is None and payload.paid_amount_uzs is None:
            raise HTTPException(status_code=400, detail="paid_amount_usd or paid_amount_uzs required for MIX")
        paid_usd = float(payload.paid_amount_usd or 0)
        paid_uzs = float(payload.paid_amount_uzs or 0)
        # Optional consistency check can be added
    else:
        raise HTTPException(status_code=400, detail="Invalid payment currency")

    # Load balances
    usd = await _get_currency(db, "USD")
    uzs = await _get_currency(db, "UZS")
    bal_target = await _get_balance(db, currency.id)
    bal_usd = await _get_balance(db, usd.id)
    bal_uzs = await _get_balance(db, uzs.id)

    # Atomic operation
    async with db.begin():
        if payload.operation_type == "buy":
            # Ensure sufficient paying balances
            if paid_usd > 0 and float(bal_usd.available_amount) < paid_usd:
                raise HTTPException(status_code=400, detail="Insufficient USD balance")
            if paid_uzs > 0 and float(bal_uzs.available_amount) < paid_uzs:
                raise HTTPException(status_code=400, detail="Insufficient UZS balance")

            # Deduct payments
            bal_usd.amount = float(bal_usd.amount) - paid_usd
            bal_usd.available_amount = float(bal_usd.available_amount) - paid_usd
            bal_uzs.amount = float(bal_uzs.amount) - paid_uzs
            bal_uzs.available_amount = float(bal_uzs.available_amount) - paid_uzs

            # Increase purchased currency
            bal_target.amount = float(bal_target.amount) + float(payload.amount)
            bal_target.available_amount = float(bal_target.available_amount) + float(payload.amount)

            tx = Transaction(
                shift_id=shift.id,
                operation_type="buy",
                currency_id=currency.id,
                amount=payload.amount,
                rate=payload.rate,
                total_amount=total_amount_usd,
                payment_currency=payload.payment_currency,
                uzs_rate=payload.uzs_rate,
                total_amount_uzs=(paid_uzs if paid_uzs > 0 else None),
                paid_amount_usd=paid_usd or None,
                paid_amount_uzs=paid_uzs or None,
                remaining_amount=payload.amount if currency.code == "USDT" else None,
                note=payload.note,
                wallet_address=payload.wallet_address,
            )
            db.add(tx)

        elif payload.operation_type == "sell":
            # Ensure sufficient sold currency
            if float(bal_target.available_amount) < float(payload.amount):
                raise HTTPException(status_code=400, detail=f"Insufficient {currency.code} balance")

            # Decrease sold currency
            bal_target.amount = float(bal_target.amount) - float(payload.amount)
            bal_target.available_amount = float(bal_target.available_amount) - float(payload.amount)

            # Proceeds to balances
            if payload.payment_currency == "USD":
                bal_usd.amount = float(bal_usd.amount) + total_amount_usd
                bal_usd.available_amount = float(bal_usd.available_amount) + total_amount_usd
            elif payload.payment_currency == "UZS":
                if not payload.uzs_rate or payload.uzs_rate <= 0:
                    raise HTTPException(status_code=400, detail="uzs_rate required for UZS payments")
                paid_uzs = total_amount_usd * float(payload.uzs_rate)
                bal_uzs.amount = float(bal_uzs.amount) + paid_uzs
                bal_uzs.available_amount = float(bal_uzs.available_amount) + paid_uzs
            elif payload.payment_currency == "MIX":
                bal_usd.amount = float(bal_usd.amount) + float(payload.paid_amount_usd or 0)
                bal_usd.available_amount = float(bal_usd.available_amount) + float(payload.paid_amount_usd or 0)
                bal_uzs.amount = float(bal_uzs.amount) + float(payload.paid_amount_uzs or 0)
                bal_uzs.available_amount = float(bal_uzs.available_amount) + float(payload.paid_amount_uzs or 0)

            # FIFO for USDT sells to compute profit
            profit_val = None
            if currency.code == "USDT":
                # amount to account for
                remaining_to_account = float(payload.amount)
                total_cost = 0.0
                # Select buy/deposit USDT with remaining_amount > 0
                res = await db.execute(
                    select(Transaction)
                    .where(
                        and_(
                            Transaction.currency_id == currency.id,
                            Transaction.operation_type.in_(["buy", "deposit"]),
                            Transaction.remaining_amount.isnot(None),
                            Transaction.remaining_amount > 0,
                        )
                    )
                    .order_by(Transaction.created_at.asc())
                )
                lots = list(res.scalars().all())
                for lot in lots:
                    if remaining_to_account <= 0:
                        break
                    lot_remaining = float(lot.remaining_amount or 0)
                    if lot_remaining <= 0:
                        continue
                    amount_to_use = min(remaining_to_account, lot_remaining)
                    total_cost += amount_to_use * float(lot.rate or 0)
                    lot.remaining_amount = lot_remaining - amount_to_use
                    db.add(lot)
                    remaining_to_account -= amount_to_use
                proceeds = float(payload.amount) * float(payload.rate)
                profit_val = proceeds - total_cost

            tx = Transaction(
                shift_id=shift.id,
                operation_type="sell",
                currency_id=currency.id,
                amount=payload.amount,
                rate=payload.rate,
                total_amount=total_amount_usd,
                payment_currency=payload.payment_currency,
                uzs_rate=payload.uzs_rate,
                total_amount_uzs=(paid_uzs if paid_uzs > 0 else None),
                paid_amount_usd=(payload.paid_amount_usd or None),
                paid_amount_uzs=(payload.paid_amount_uzs or None),
                profit=profit_val,
                note=payload.note,
                wallet_address=payload.wallet_address,
            )
            db.add(tx)
        else:
            raise HTTPException(status_code=400, detail="Invalid operation type")

    # After commit, load the tx back
    created = (await db.execute(select(Transaction).order_by(Transaction.id.desc()))).scalars().first()
    return TransactionOut(
        id=created.id,
        shift_id=created.shift_id,
        operation_type=created.operation_type,
        currency_id=created.currency_id,
        amount=float(created.amount),
        rate=float(created.rate) if created.rate is not None else None,
        total_amount=float(created.total_amount) if created.total_amount is not None else None,
        payment_currency=created.payment_currency,
        uzs_rate=float(created.uzs_rate) if created.uzs_rate is not None else None,
        total_amount_uzs=float(created.total_amount_uzs) if created.total_amount_uzs is not None else None,
        paid_amount_usd=float(created.paid_amount_usd) if created.paid_amount_usd is not None else None,
        paid_amount_uzs=float(created.paid_amount_uzs) if created.paid_amount_uzs is not None else None,
        profit=float(created.profit) if created.profit is not None else None,
        remaining_amount=float(created.remaining_amount) if created.remaining_amount is not None else None,
        status=created.status,
        note=created.note,
        wallet_address=created.wallet_address,
    )


@router.get("/", response_model=List[TransactionOut])
@router.get("", response_model=List[TransactionOut])
async def list_transactions(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Transaction).order_by(Transaction.created_at.desc()))
    items = res.scalars().all()
    out: List[TransactionOut] = []
    for t in items:
        out.append(
            TransactionOut(
                id=t.id,
                shift_id=t.shift_id,
                operation_type=t.operation_type,
                currency_id=t.currency_id,
                amount=float(t.amount),
                rate=float(t.rate) if t.rate is not None else None,
                total_amount=float(t.total_amount) if t.total_amount is not None else None,
                payment_currency=t.payment_currency,
                uzs_rate=float(t.uzs_rate) if t.uzs_rate is not None else None,
                total_amount_uzs=float(t.total_amount_uzs) if t.total_amount_uzs is not None else None,
                paid_amount_usd=float(t.paid_amount_usd) if t.paid_amount_usd is not None else None,
                paid_amount_uzs=float(t.paid_amount_uzs) if t.paid_amount_uzs is not None else None,
                profit=float(t.profit) if t.profit is not None else None,
                remaining_amount=float(t.remaining_amount) if t.remaining_amount is not None else None,
                status=t.status,
                note=t.note,
                wallet_address=t.wallet_address,
            )
        )
    return out
