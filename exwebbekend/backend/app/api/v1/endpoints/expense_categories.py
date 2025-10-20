from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.expense_category import ExpenseCategory
from app.schemas.expense_category import ExpenseCategoryCreate, ExpenseCategoryOut

router = APIRouter(dependencies=[Depends(get_current_user)])

@router.post("/", response_model=ExpenseCategoryOut)
async def create_category(payload: ExpenseCategoryCreate, db: AsyncSession = Depends(get_db)):
    cat = ExpenseCategory(name=payload.name.strip())
    db.add(cat)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Category already exists")
    await db.refresh(cat)
    return ExpenseCategoryOut(id=cat.id, name=cat.name)

@router.get("/", response_model=List[ExpenseCategoryOut])
@router.get("", response_model=List[ExpenseCategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(ExpenseCategory).order_by(ExpenseCategory.name))
    items = res.scalars().all()
    return [ExpenseCategoryOut(id=i.id, name=i.name) for i in items]
