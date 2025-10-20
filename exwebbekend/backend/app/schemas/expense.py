from typing import Optional
from pydantic import BaseModel, Field

class ExpenseCreate(BaseModel):
    category_id: int
    amount: float = Field(gt=0)
    currency: str  # 'USD' or 'UZS'
    uzs_rate: Optional[float] = None
    note: Optional[str] = None

class ExpenseUpdate(BaseModel):
    category_id: int
    amount: float = Field(gt=0)
    currency: str
    uzs_rate: Optional[float] = None
    note: Optional[str] = None

class ExpenseOut(BaseModel):
    id: int
    shift_id: int
    category_id: int
    amount: float
    currency: str
    amount_usd: float
    uzs_rate: Optional[float] = None
    note: Optional[str] = None
