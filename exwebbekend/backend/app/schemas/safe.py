from typing import Optional
from pydantic import BaseModel, Field

class SafeMovement(BaseModel):
    currency_code: str
    amount: float = Field(gt=0)
    rate: Optional[float] = None  # required for USDT deposit for FIFO cost basis
    note: Optional[str] = None
