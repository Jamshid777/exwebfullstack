from typing import Literal, Optional
from pydantic import BaseModel, Field

PaymentCurrency = Literal['USD', 'UZS', 'MIX']
OperationType = Literal['buy', 'sell']

class TransactionCreate(BaseModel):
    operation_type: OperationType
    currency_code: str  # currency being bought/sold e.g., 'USDT'
    amount: float = Field(gt=0)
    rate: float = Field(gt=0)  # USD price per unit
    payment_currency: PaymentCurrency
    uzs_rate: Optional[float] = None
    paid_amount_usd: Optional[float] = 0
    paid_amount_uzs: Optional[float] = 0
    note: Optional[str] = None
    wallet_address: Optional[str] = None

class TransactionOut(BaseModel):
    id: int
    shift_id: int | None
    operation_type: str
    currency_id: int
    amount: float
    rate: float | None
    total_amount: float | None
    payment_currency: str | None
    uzs_rate: float | None
    total_amount_uzs: float | None
    paid_amount_usd: float | None
    paid_amount_uzs: float | None
    profit: float | None
    remaining_amount: float | None
    status: str
    note: str | None
    wallet_address: str | None
