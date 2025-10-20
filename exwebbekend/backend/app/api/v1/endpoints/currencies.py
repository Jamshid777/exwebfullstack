from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.currency import Currency
from app.schemas.currency import CurrencyOut

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/", response_model=List[CurrencyOut])
@router.get("", response_model=List[CurrencyOut])
async def list_currencies(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Currency))
    items = res.scalars().all()
    return [CurrencyOut.model_validate(i) for i in items]
