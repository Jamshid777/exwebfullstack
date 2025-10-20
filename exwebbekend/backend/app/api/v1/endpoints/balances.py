from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.balance import Balance
from app.models.currency import Currency
from app.schemas.balance import BalanceOut

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/", response_model=List[BalanceOut])
@router.get("", response_model=List[BalanceOut])
async def list_balances(db: AsyncSession = Depends(get_db)):
    # Build a map of currency_id -> code to avoid touching relationship attributes
    cur_rows = await db.execute(select(Currency.id, Currency.code))
    cur_map = {row[0]: row[1] for row in cur_rows.all()}

    res = await db.execute(select(Balance))
    balances = res.scalars().all()
    out: List[BalanceOut] = []
    for b in balances:
        code = cur_map.get(b.currency_id, "UNKNOWN")
        out.append(
            BalanceOut(
                currency_code=code,
                amount=float(b.amount),
                available_amount=float(b.available_amount),
            )
        )
    return out
